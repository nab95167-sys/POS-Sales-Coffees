import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';
import { DEFAULT_ROLE_PERMS, PermissionId, Role } from '../types';
import { parseCookies, verifyAccessToken } from '../utils/crypto';

export const ACCESS_COOKIE_NAME = 'coffee_access_token';
export const REFRESH_COOKIE_NAME = 'coffee_refresh_token';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  permissions: PermissionId[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

interface DbUserAuthRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  is_active: number;
  custom_permissions_json: string | null;
}

export function resolveEffectivePermissions(
  role: Role,
  customPermissionsJson: string | null
): PermissionId[] {
  if (customPermissionsJson) {
    try {
      const parsed = JSON.parse(customPermissionsJson);
      if (Array.isArray(parsed)) return parsed as PermissionId[];
    } catch {
      // Fallback to role permissions
    }
  }

  const db = getDb();
  const roleRow = db
    .prepare('SELECT permissions_json FROM role_configs WHERE role = ?')
    .get<{ permissions_json: string }>(role);
  if (roleRow) {
    try {
      const parsed = JSON.parse(roleRow.permissions_json);
      if (Array.isArray(parsed)) return parsed as PermissionId[];
    } catch {
      // Fallback to default
    }
  }
  return DEFAULT_ROLE_PERMS[role] || [];
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookies[ACCESS_COOKIE_NAME] || bearerToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    const db = getDb();
    const userRow = db
      .prepare('SELECT id, email, name, role, status, is_active, custom_permissions_json FROM users WHERE id = ?')
      .get<DbUserAuthRow>(decoded.sub);

    if (!userRow || !userRow.is_active || userRow.status === 'Inactive') {
      res.status(401).json({ error: 'Account is inactive or no longer exists' });
      return;
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      permissions: resolveEffectivePermissions(userRow.role, userRow.custom_permissions_json),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Role '${req.user.role}' is not authorized to access this resource`,
      });
      return;
    }
    next();
  };
};

export const requirePermission = (permission: PermissionId) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.role === 'ADMIN' || req.user.permissions.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({
      error: `Missing required permission: '${permission}'`,
    });
  };
};
