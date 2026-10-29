import { Request, Response, NextFunction } from 'express';

// Sanitizes input against XSS & Script Injection
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    // Strip HTML script tags & dangerous SQL characters
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/--/g, '')
      .replace(/;/g, '')
      .trim();
  }
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
};

// Security Audit Event Logger
export interface SecurityAuditLog {
  timestamp: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ROLE_CHANGE' | 'SENSITIVE_EXPORT' | 'PAYMENT_VOID';
  userId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

export const logSecurityEvent = (log: Omit<SecurityAuditLog, 'timestamp'>) => {
  const auditEntry: SecurityAuditLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  console.log('🔒 SECURITY AUDIT LOG:', JSON.stringify(auditEntry));
  // In production, this persists to PostgreSQL AuditLogs table or SIEM logger
};
