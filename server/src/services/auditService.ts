import crypto from 'crypto';
import { getDb } from '../db/database';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditInput {
  action: string;
  title: string;
  details: string;
  userId?: string;
  performedBy: string;
  authorizedBy?: string;
  ipAddress?: string;
  severity?: AuditSeverity;
}

export function recordSecurityAudit(entry: AuditInput): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO security_audit_logs (
        id, action, title, details, user_id, performed_by, authorized_by, ip_address, severity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `sec-${crypto.randomUUID()}`,
      entry.action,
      entry.title,
      entry.details,
      entry.userId || null,
      entry.performedBy,
      entry.authorizedBy || null,
      entry.ipAddress || null,
      entry.severity || 'INFO',
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to persist security audit log:', err);
  }
}

export function listSecurityAudits(limit = 200) {
  const db = getDb();
  return db
    .prepare(`
      SELECT id, action, title, details, user_id as userId, performed_by as performedBy,
             authorized_by as authorizedBy, ip_address as ipAddress, severity, created_at as timestamp
      FROM security_audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit);
}
