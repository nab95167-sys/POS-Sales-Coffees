import { apiFetch } from './api';

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  action: string;
  title: string;
  details: string;
  performedBy: string;
  authorizedBy?: string;
  ipAddress?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export async function fetchSecurityLogs(): Promise<SecurityAuditEvent[]> {
  try {
    localStorage.removeItem('coffee_pos_audit_logs');
  } catch {
    // Ignore storage access errors
  }
  const res = await apiFetch<{ logs: SecurityAuditEvent[] }>('/api/v1/security/audit-logs');
  return res.logs;
}

export async function logSecurityEvent(
  action: 'SCREEN_LOCK' | 'DRAWER_KICK' | 'CART_VOID' | 'DISCOUNT_OVERRIDE',
  title: string,
  details: string,
  _performedBy?: string,
  overrideToken?: string
): Promise<void> {
  try {
    await apiFetch('/api/v1/security/audit-event', {
      method: 'POST',
      body: { action, title, details, overrideToken },
    });
  } catch {
    // Do not interrupt terminal operations if audit endpoint rejects
  }
}
