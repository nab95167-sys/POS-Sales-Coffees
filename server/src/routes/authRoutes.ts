import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { getDb, runInTransaction } from '../db/database';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  AuthRequest,
  authenticateToken,
  resolveEffectivePermissions,
} from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';
import { Role } from '../types';
import { generateOpaqueToken, hashSha256, parseCookies, signAccessToken } from '../utils/crypto';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    path: '/',
    maxAge: config.accessTokenTtlSec * 1000,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    path: '/api/v1/auth',
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

interface DbUserLoginRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  status: 'Active' | 'On Leave' | 'Inactive';
  avatar: string;
  password_hash: string;
  custom_permissions_json: string | null;
  sales_count: number;
  is_active: number;
  failed_login_attempts: number;
  locked_until: number;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid email and password are required.' });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const ip = req.ip || 'unknown';
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get<DbUserLoginRow>(email);
  if (!user || !user.is_active || user.status === 'Inactive') {
    recordSecurityAudit({
      action: 'LOGIN_FAILED',
      title: 'Failed Login Attempt',
      details: `Unknown or inactive account attempted login: ${email}`,
      performedBy: email,
      ipAddress: ip,
      severity: 'WARNING',
    });
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const nowMs = Date.now();
  if (user.locked_until && user.locked_until > nowMs) {
    const waitMin = Math.ceil((user.locked_until - nowMs) / 60000);
    recordSecurityAudit({
      action: 'LOGIN_BLOCKED',
      title: 'Locked Account Login Blocked',
      details: `Attempted login while account is temporarily locked (${email})`,
      userId: user.id,
      performedBy: `${user.name} (${user.role})`,
      ipAddress: ip,
      severity: 'CRITICAL',
    });
    res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${waitMin} minute(s).`,
    });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    const nextFailures = (user.failed_login_attempts || 0) + 1;
    const shouldLock = nextFailures >= config.maxFailedLogins;
    const lockedUntil = shouldLock ? nowMs + config.loginLockoutMs : 0;

    db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(
      nextFailures,
      lockedUntil,
      user.id
    );

    recordSecurityAudit({
      action: shouldLock ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
      title: shouldLock ? 'Account Locked (Brute-Force Protection)' : 'Incorrect Password Attempt',
      details: shouldLock
        ? `Account ${user.email} locked for 15 minutes after ${nextFailures} failed password attempts.`
        : `Failed login attempt #${nextFailures} for ${user.email}.`,
      userId: user.id,
      performedBy: `${user.name} (${user.role})`,
      ipAddress: ip,
      severity: shouldLock ? 'CRITICAL' : 'WARNING',
    });

    res.status(shouldLock ? 429 : 401).json({
      error: shouldLock
        ? 'Account locked for 15 minutes due to 5 failed password attempts.'
        : 'Invalid email or password.',
    });
    return;
  }

  // Successful login
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  const rawRefresh = generateOpaqueToken();
  const refreshExpires = nowMs + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;

  runInTransaction((tx) => {
    tx.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = 0 WHERE id = ?').run(user.id);
    tx.prepare(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(`rt-${crypto.randomUUID()}`, user.id, hashSha256(rawRefresh), refreshExpires, nowMs);
  });

  setAuthCookies(res, accessToken, rawRefresh);

  recordSecurityAudit({
    action: 'LOGIN_SUCCESS',
    title: 'Staff Authenticated',
    details: `${user.name} (${user.role}) signed in successfully.`,
    userId: user.id,
    performedBy: `${user.name} (${user.role})`,
    ipAddress: ip,
    severity: 'INFO',
  });

  const permissions = resolveEffectivePermissions(user.role, user.custom_permissions_json);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shift: user.shift,
      status: user.status,
      avatar: user.avatar,
      salesCount: user.sales_count,
      permissions,
    },
  });
});

router.post('/refresh', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const rawRefresh = cookies[REFRESH_COOKIE_NAME];
  if (!rawRefresh) {
    res.status(401).json({ error: 'Refresh token missing' });
    return;
  }

  const db = getDb();
  const tokenHash = hashSha256(rawRefresh);
  const tokenRow = db
    .prepare('SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?')
    .get<{ id: string; user_id: string; expires_at: number; revoked: number }>(tokenHash);

  if (!tokenRow) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  if (tokenRow.revoked) {
    // Refresh token reuse detected -> revoke all sessions for this user!
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(tokenRow.user_id);
    clearAuthCookies(res);
    recordSecurityAudit({
      action: 'REFRESH_TOKEN_REUSE',
      title: 'Refresh Token Reuse Detected',
      details: `Revoked refresh token was re-presented for user ${tokenRow.user_id}. All active sessions invalidated.`,
      userId: tokenRow.user_id,
      performedBy: tokenRow.user_id,
      ipAddress: req.ip,
      severity: 'CRITICAL',
    });
    res.status(401).json({ error: 'Session invalidated for security.' });
    return;
  }

  if (tokenRow.expires_at < Date.now()) {
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(tokenRow.id);
    clearAuthCookies(res);
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, name, role, is_active, status, custom_permissions_json FROM users WHERE id = ?')
    .get<DbUserLoginRow>(tokenRow.user_id);

  if (!user || !user.is_active || user.status === 'Inactive') {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Account unavailable' });
    return;
  }

  const newAccess = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  const newRefresh = generateOpaqueToken();
  const nowMs = Date.now();
  const refreshExpires = nowMs + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;

  runInTransaction((tx) => {
    tx.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(tokenRow.id);
    tx.prepare(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(`rt-${crypto.randomUUID()}`, user.id, hashSha256(newRefresh), refreshExpires, nowMs);
  });

  setAuthCookies(res, newAccess, newRefresh);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const rawRefresh = cookies[REFRESH_COOKIE_NAME];
  if (rawRefresh) {
    const db = getDb();
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(hashSha256(rawRefresh));
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, name, email, phone, role, shift, status, avatar, sales_count, custom_permissions_json FROM users WHERE id = ?')
    .get<DbUserLoginRow>(req.user!.id);

  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      shift: row.shift,
      status: row.status,
      avatar: row.avatar,
      salesCount: row.sales_count,
      permissions: resolveEffectivePermissions(row.role, row.custom_permissions_json),
    },
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Must contain at least one letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password format' });
    return;
  }

  const db = getDb();
  const row = db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get<{ password_hash: string }>(req.user!.id);
  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const now = new Date().toISOString();

  runInTransaction((tx) => {
    tx.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user!.id);
    tx.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(req.user!.id);
  });

  recordSecurityAudit({
    action: 'PASSWORD_CHANGED',
    title: 'Password Updated',
    details: `${req.user!.name} updated their account password.`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  res.json({ ok: true, message: 'Password updated successfully.' });
});

const changePinSchema = z.object({
  currentPassword: z.string().min(1),
  newPin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

router.post('/change-pin', authenticateToken, async (req: AuthRequest, res) => {
  const parsed = changePinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'PIN must be 4 to 6 digits' });
    return;
  }

  const db = getDb();
  const row = db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get<{ password_hash: string }>(req.user!.id);
  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const newPinHash = await bcrypt.hash(parsed.data.newPin, 10);
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE users SET pin_hash = ?, failed_pin_attempts = 0, pin_locked_until = 0, updated_at = ? WHERE id = ?'
  ).run(newPinHash, now, req.user!.id);

  recordSecurityAudit({
    action: 'PIN_CHANGED',
    title: 'Security PIN Updated',
    details: `${req.user!.name} updated their security PIN.`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  res.json({ ok: true, message: 'Security PIN updated successfully.' });
});

export default router;
