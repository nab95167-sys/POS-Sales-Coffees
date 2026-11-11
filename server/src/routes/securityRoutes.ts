import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { getDb } from '../db/database';
import { AuthRequest, authenticateToken, authorizeRoles } from '../middlewares/auth';
import { listSecurityAudits, recordSecurityAudit } from '../services/auditService';
import { generateOpaqueToken, hashSha256 } from '../utils/crypto';

const router = Router();

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PIN verification attempts. Try again later.' },
});

const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
  purpose: z.enum(['MANAGER_OVERRIDE', 'SCREEN_UNLOCK']).default('MANAGER_OVERRIDE'),
  actionTitle: z.string().min(1).max(150).default('Security Verification'),
  actionDetails: z.string().max(400).default(''),
});

interface PinCandidateRow {
  id: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';
  pin_hash: string | null;
}

interface TerminalLockRow {
  failed_pin_attempts: number;
  pin_locked_until: number;
}

router.post('/verify-pin', authenticateToken, pinLimiter, async (req: AuthRequest, res) => {
  const parsed = verifyPinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid PIN format' });
    return;
  }

  const { pin, purpose, actionTitle, actionDetails } = parsed.data;
  const db = getDb();
  const caller = req.user!;
  const nowMs = Date.now();

  const lockState = db
    .prepare('SELECT failed_pin_attempts, pin_locked_until FROM users WHERE id = ?')
    .get<TerminalLockRow>(caller.id);

  if (lockState && lockState.pin_locked_until && lockState.pin_locked_until > nowMs) {
    const waitMin = Math.ceil((lockState.pin_locked_until - nowMs) / 60000);
    res.status(429).json({
      error: `PIN entry temporarily locked due to repeated failures. Wait ${waitMin} minute(s).`,
    });
    return;
  }

  let matchedAuthorizer: PinCandidateRow | null = null;
  if (purpose === 'SCREEN_UNLOCK') {
    const candidates = db
      .prepare(
        `SELECT id, name, role, pin_hash FROM users
         WHERE is_active = 1 AND status != 'Inactive' AND pin_hash IS NOT NULL
         AND (id = ? OR role IN ('ADMIN', 'MANAGER'))`
      )
      .all<PinCandidateRow>(caller.id);

    for (const candidate of candidates) {
      if (candidate.pin_hash && (await bcrypt.compare(pin, candidate.pin_hash))) {
        matchedAuthorizer = candidate;
        break;
      }
    }
  } else {
    const managers = db
      .prepare(
        `SELECT id, name, role, pin_hash FROM users
         WHERE is_active = 1 AND status != 'Inactive' AND pin_hash IS NOT NULL
         AND role IN ('ADMIN', 'MANAGER')`
      )
      .all<PinCandidateRow>();

    for (const mgr of managers) {
      if (mgr.pin_hash && (await bcrypt.compare(pin, mgr.pin_hash))) {
        matchedAuthorizer = mgr;
        break;
      }
    }
  }

  if (!matchedAuthorizer) {
    const nextFailures = (lockState?.failed_pin_attempts || 0) + 1;
    const shouldLock = nextFailures >= config.maxFailedPins;
    const lockedUntil = shouldLock ? nowMs + config.pinLockoutMs : 0;

    db.prepare('UPDATE users SET failed_pin_attempts = ?, pin_locked_until = ? WHERE id = ?').run(
      nextFailures,
      lockedUntil,
      caller.id
    );

    recordSecurityAudit({
      action: shouldLock ? 'PIN_LOCKED' : 'PIN_FAILED',
      title: shouldLock ? 'PIN Pad Locked (5 Failed Attempts)' : 'Invalid Security PIN Attempt',
      details: `${actionTitle}: Incorrect PIN entered on ${caller.name}'s terminal (attempt #${nextFailures})`,
      userId: caller.id,
      performedBy: `${caller.name} (${caller.role})`,
      ipAddress: req.ip,
      severity: shouldLock ? 'CRITICAL' : 'WARNING',
    });

    res.status(shouldLock ? 429 : 401).json({
      error: shouldLock
        ? 'PIN locked for 5 minutes after 5 incorrect attempts.'
        : 'Incorrect security PIN.',
    });
    return;
  }

  // Valid PIN -> Reset failure count
  db.prepare('UPDATE users SET failed_pin_attempts = 0, pin_locked_until = 0 WHERE id = ?').run(caller.id);

  let overrideToken: string | undefined;
  if (purpose === 'MANAGER_OVERRIDE') {
    overrideToken = generateOpaqueToken();
    db.prepare(
      `INSERT INTO pin_override_tokens (
        id, token_hash, authorizer_id, authorizer_name, authorizer_role, purpose, expires_at, used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      `pin-${crypto.randomUUID()}`,
      hashSha256(overrideToken),
      matchedAuthorizer.id,
      matchedAuthorizer.name,
      matchedAuthorizer.role,
      actionTitle,
      nowMs + config.pinOverrideTtlMs,
      nowMs
    );
  }

  recordSecurityAudit({
    action: purpose === 'SCREEN_UNLOCK' ? 'SCREEN_UNLOCK' : 'MANAGER_PIN_APPROVED',
    title: purpose === 'SCREEN_UNLOCK' ? 'Terminal Unlocked' : actionTitle,
    details:
      purpose === 'SCREEN_UNLOCK'
        ? `Register unlocked by ${matchedAuthorizer.name} (${matchedAuthorizer.role})`
        : `${actionDetails || actionTitle} (Authorized by ${matchedAuthorizer.name})`,
    userId: caller.id,
    performedBy: `${caller.name} (${caller.role})`,
    authorizedBy: `${matchedAuthorizer.name} (${matchedAuthorizer.role})`,
    ipAddress: req.ip,
    severity: purpose === 'SCREEN_UNLOCK' ? 'INFO' : 'WARNING',
  });

  res.json({
    authorized: true,
    authorizerName: matchedAuthorizer.name,
    authorizerRole: matchedAuthorizer.role,
    overrideToken,
  });
});

export function consumePinOverrideToken(
  rawToken: string | undefined
): { valid: boolean; authorizerName?: string; authorizerRole?: string } {
  if (!rawToken) return { valid: false };
  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, authorizer_name, authorizer_role, expires_at, used FROM pin_override_tokens WHERE token_hash = ?'
    )
    .get<{
      id: string;
      authorizer_name: string;
      authorizer_role: string;
      expires_at: number;
      used: number;
    }>(hashSha256(rawToken));

  if (!row || row.used || row.expires_at < Date.now()) {
    return { valid: false };
  }

  db.prepare('UPDATE pin_override_tokens SET used = 1 WHERE id = ?').run(row.id);
  return {
    valid: true,
    authorizerName: row.authorizer_name,
    authorizerRole: row.authorizer_role,
  };
}

const auditEventSchema = z.object({
  action: z.enum(['SCREEN_LOCK', 'DRAWER_KICK', 'CART_VOID', 'DISCOUNT_OVERRIDE']),
  title: z.string().min(1).max(120),
  details: z.string().max(400),
  overrideToken: z.string().optional(),
});

router.post('/audit-event', authenticateToken, (req: AuthRequest, res) => {
  const parsed = auditEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid audit event payload' });
    return;
  }

  let authorizedBy: string | undefined;
  if (parsed.data.overrideToken) {
    const check = consumePinOverrideToken(parsed.data.overrideToken);
    if (check.valid) {
      authorizedBy = `${check.authorizerName} (${check.authorizerRole})`;
    }
  }

  const severity =
    parsed.data.action === 'SCREEN_LOCK' ? 'INFO' : 'WARNING';

  recordSecurityAudit({
    action: parsed.data.action,
    title: parsed.data.title,
    details: parsed.data.details,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    authorizedBy,
    ipAddress: req.ip,
    severity,
  });

  res.status(201).json({ ok: true });
});

router.get(
  '/audit-logs',
  authenticateToken,
  authorizeRoles('ADMIN', 'MANAGER'),
  (_req, res) => {
    res.json({ logs: listSecurityAudits(200) });
  }
);

export default router;
