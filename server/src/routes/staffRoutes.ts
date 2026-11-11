import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db/database';
import {
  authenticateToken,
  authorizeRoles,
  AuthRequest,
  requirePermission,
  resolveEffectivePermissions,
} from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';
import { ALL_PERMISSIONS, PermissionId, Role } from '../types';

const router = Router();

interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  status: 'Active' | 'On Leave' | 'Inactive';
  avatar: string;
  custom_permissions_json: string | null;
  sales_count: number;
  is_active: number;
}

interface RoleConfigRow {
  role: Role;
  notes: string;
  permissions_json: string;
  updated_at: string;
}

function mapStaff(row: StaffRow) {
  let customPermissions: PermissionId[] | null = null;
  if (row.custom_permissions_json) {
    try {
      customPermissions = JSON.parse(row.custom_permissions_json);
    } catch {
      customPermissions = null;
    }
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    shift: row.shift,
    status: row.status,
    avatar: row.avatar,
    salesCount: Number(row.sales_count || 0),
    customPermissions,
    permissions: resolveEffectivePermissions(row.role, row.custom_permissions_json),
  };
}

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const caller = req.user!;
  if (caller.role !== 'ADMIN' && caller.role !== 'MANAGER' && !caller.permissions.includes('staff:manage')) {
    res.status(403).json({ error: 'Not authorized to view staff directory' });
    return;
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, email, phone, role, shift, status, avatar, custom_permissions_json, sales_count, is_active
       FROM users ORDER BY created_at ASC`
    )
    .all<StaffRow>();

  res.json({ staff: rows.map(mapStaff) });
});

router.get('/roles', authenticateToken, (req: AuthRequest, res) => {
  const caller = req.user!;
  if (caller.role !== 'ADMIN' && caller.role !== 'MANAGER' && !caller.permissions.includes('staff:manage')) {
    res.status(403).json({ error: 'Not authorized to view role matrix' });
    return;
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM role_configs ORDER BY role ASC').all<RoleConfigRow>();

  const roles = rows.map((r) => ({
    role: r.role,
    notes: r.notes,
    permissions: JSON.parse(r.permissions_json || '[]') as PermissionId[],
    updatedAt: r.updated_at,
  }));

  res.json({ roles, allPermissions: ALL_PERMISSIONS });
});

const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).default(''),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA']),
  shift: z.enum(['Morning', 'Afternoon', 'Evening']).default('Morning'),
  status: z.enum(['Active', 'On Leave', 'Inactive']).default('Active'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits').optional().or(z.literal('')),
  avatar: z.string().max(400).optional(),
});

router.post('/', authenticateToken, requirePermission('staff:manage'), async (req: AuthRequest, res) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid staff member payload' });
    return;
  }

  const d = parsed.data;
  if (d.role === 'ADMIN' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only an Administrator can create another Administrator account' });
    return;
  }

  const db = getDb();
  const dup = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(d.email);
  if (dup) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const id = `s-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(d.password, 10);
  const pinHash = d.pin ? await bcrypt.hash(d.pin, 10) : null;

  db.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, shift, status, avatar,
      password_hash, pin_hash, custom_permissions_json, sales_count,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?)
  `).run(
    id,
    d.name,
    d.email.toLowerCase(),
    d.phone,
    d.role,
    d.shift,
    d.status,
    d.avatar || '',
    passwordHash,
    pinHash,
    d.status === 'Inactive' ? 0 : 1,
    now,
    now
  );

  recordSecurityAudit({
    action: 'STAFF_CREATED',
    title: 'Staff Member Created',
    details: `Added ${d.name} (${d.email}) with role ${d.role}`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: d.role === 'ADMIN' || d.role === 'MANAGER' ? 'WARNING' : 'INFO',
  });

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(id)!;
  res.status(201).json({ staff: mapStaff(created) });
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(40).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA']).optional(),
  shift: z.enum(['Morning', 'Afternoon', 'Evening']).optional(),
  status: z.enum(['Active', 'On Leave', 'Inactive']).optional(),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  pin: z.string().regex(/^\d{4,6}$/).optional().or(z.literal('')),
});

router.put('/:id', authenticateToken, requirePermission('staff:manage'), async (req: AuthRequest, res) => {
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid staff update payload' });
    return;
  }

  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }

  const d = parsed.data;
  if ((target.role === 'ADMIN' || d.role === 'ADMIN') && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only an Administrator can modify Administrator accounts or elevate to ADMIN' });
    return;
  }

  if (target.id === req.user!.id && d.status === 'Inactive') {
    res.status(400).json({ error: 'Cannot deactivate your own active session' });
    return;
  }

  if (d.email && d.email.toLowerCase() !== target.email.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(d.email, target.id);
    if (dup) {
      res.status(409).json({ error: 'Email already used by another staff member' });
      return;
    }
  }

  const now = new Date().toISOString();
  const nextStatus = d.status ?? target.status;

  db.prepare(`
    UPDATE users SET
      name = ?, email = ?, phone = ?, role = ?, shift = ?, status = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    d.name ?? target.name,
    d.email ? d.email.toLowerCase() : target.email,
    d.phone ?? target.phone,
    d.role ?? target.role,
    d.shift ?? target.shift,
    nextStatus,
    nextStatus === 'Inactive' ? 0 : 1,
    now,
    target.id
  );

  if (d.password) {
    const pwHash = await bcrypt.hash(d.password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(pwHash, now, target.id);
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(target.id);
  }

  if (d.pin) {
    const pHash = await bcrypt.hash(d.pin, 10);
    db.prepare('UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ?').run(pHash, now, target.id);
  }

  recordSecurityAudit({
    action: 'STAFF_UPDATED',
    title: 'Staff Member Updated',
    details: `Updated ${d.name ?? target.name} (Role: ${d.role ?? target.role}, Status: ${nextStatus})`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(target.id)!;
  res.json({ staff: mapStaff(updated) });
});

router.delete('/:id', authenticateToken, requirePermission('staff:manage'), (req: AuthRequest, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }

  if (target.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own logged-in account' });
    return;
  }

  if (target.role === 'ADMIN' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only an Administrator can remove another Administrator account' });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);

  recordSecurityAudit({
    action: 'STAFF_DELETED',
    title: 'Staff Member Deleted',
    details: `Removed ${target.name} (${target.email}, Role: ${target.role})`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'CRITICAL',
  });

  res.json({ deletedId: target.id });
});

router.put(
  '/:id/permissions',
  authenticateToken,
  requirePermission('staff:manage'),
  (req: AuthRequest, res) => {
    const parsed = z
      .object({
        customPermissions: z.array(z.enum(ALL_PERMISSIONS)).nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid permissions payload' });
      return;
    }

    const db = getDb();
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }
    if (target.role === 'ADMIN' && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only an Administrator can modify Admin overrides' });
      return;
    }

    const now = new Date().toISOString();
    const jsonVal = parsed.data.customPermissions ? JSON.stringify(parsed.data.customPermissions) : null;
    db.prepare('UPDATE users SET custom_permissions_json = ?, updated_at = ? WHERE id = ?').run(
      jsonVal,
      now,
      target.id
    );

    recordSecurityAudit({
      action: 'USER_PERMISSIONS_UPDATED',
      title: 'Staff Permission Override Changed',
      details: `${target.name}: ${parsed.data.customPermissions ? parsed.data.customPermissions.join(', ') : 'Reset to Role Default'}`,
      userId: req.user!.id,
      performedBy: `${req.user!.name} (${req.user!.role})`,
      ipAddress: req.ip,
      severity: 'WARNING',
    });

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get<StaffRow>(target.id)!;
    res.json({ staff: mapStaff(updated) });
  }
);

router.put(
  '/roles/:role',
  authenticateToken,
  authorizeRoles('ADMIN'),
  (req: AuthRequest, res) => {
    const roleParam = req.params.role as Role;
    if (!['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'].includes(roleParam)) {
      res.status(400).json({ error: 'Invalid role name' });
      return;
    }

    const parsed = z
      .object({
        notes: z.string().trim().max(500).optional(),
        permissions: z.array(z.enum(ALL_PERMISSIONS)).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid role update payload' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM role_configs WHERE role = ?').get<RoleConfigRow>(roleParam);
    if (!existing) {
      res.status(404).json({ error: 'Role configuration not found' });
      return;
    }

    const nextNotes = parsed.data.notes ?? existing.notes;
    let nextPerms: PermissionId[] = parsed.data.permissions ?? JSON.parse(existing.permissions_json);
    if (roleParam === 'ADMIN') {
      nextPerms = [...ALL_PERMISSIONS];
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE role_configs SET notes = ?, permissions_json = ?, updated_at = ? WHERE role = ?').run(
      nextNotes,
      JSON.stringify(nextPerms),
      now,
      roleParam
    );

    recordSecurityAudit({
      action: 'ROLE_MATRIX_UPDATED',
      title: `Role Policy Updated (${roleParam})`,
      details: `Updated notes/permissions for role ${roleParam}`,
      userId: req.user!.id,
      performedBy: `${req.user!.name} (${req.user!.role})`,
      ipAddress: req.ip,
      severity: 'WARNING',
    });

    res.json({
      role: {
        role: roleParam,
        notes: nextNotes,
        permissions: nextPerms,
        updatedAt: now,
      },
    });
  }
);

export default router;
