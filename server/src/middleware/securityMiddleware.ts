import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const SENSITIVE_SKIP_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'pin',
  'currentPin',
  'newPin',
  'botToken',
  'telegramBotToken',
]);

const sanitizeObject = (obj: unknown, keyName?: string): unknown => {
  if (keyName && SENSITIVE_SKIP_KEYS.has(keyName)) {
    return obj;
  }
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeObject(v, k);
    }
    return out;
  }
  return obj;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as Request['query'];
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as Request['params'];
  }
  next();
};

export const verifyOriginForMutations = (req: Request, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'CSRF origin check rejected' });
    return;
  }
  next();
};
