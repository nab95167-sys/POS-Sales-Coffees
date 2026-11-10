export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  action: 'DRAWER_KICK' | 'CART_VOID' | 'DISCOUNT_OVERRIDE' | 'SCREEN_LOCK' | 'SCREEN_UNLOCK' | 'ITEM_DELETE' | 'ORDER_REFUND' | 'ORDER_VOID';
  title: string;
  details: string;
  performedBy: string;
  authorizedBy?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

const STORAGE_KEY = 'coffee_pos_audit_logs';

export const getSecurityLogs = (): SecurityAuditEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse audit logs', e);
  }
  return [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      action: 'SCREEN_UNLOCK',
      title: 'POS Register Unlocked',
      details: 'Staff member authenticated into register terminal',
      performedBy: 'Sophia Chen (ADMIN)',
      severity: 'INFO',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      action: 'DRAWER_KICK',
      title: 'Cash Drawer Opened (No Sale)',
      details: 'Cash drawer opened manually for change exchange',
      performedBy: 'Sokha Ly (CASHIER)',
      authorizedBy: 'Manager Override (PIN: ****)',
      severity: 'WARNING',
    },
  ];
};

export const logSecurityEvent = (
  action: SecurityAuditEvent['action'],
  title: string,
  details: string,
  performedBy: string,
  authorizedBy?: string,
  severity: SecurityAuditEvent['severity'] = 'INFO'
) => {
  const currentLogs = getSecurityLogs();
  const newEvent: SecurityAuditEvent = {
    id: `sec-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    title,
    details,
    performedBy,
    authorizedBy,
    severity,
  };

  const updated = [newEvent, ...currentLogs.slice(0, 99)]; // Keep last 100 logs
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newEvent;
};
