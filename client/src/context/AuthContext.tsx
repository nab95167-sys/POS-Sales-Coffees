import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PermissionId, Role, User } from '../types';
import { apiFetch } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (allowedRoles: Role[]) => boolean;
  hasGranularPermission: (permission: PermissionId) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function scrubLegacyAuthStorage(): void {
  try {
    localStorage.removeItem('coffee_pos_user');
    localStorage.removeItem('coffee_pos_token');
    localStorage.removeItem('coffee_pos_telegram_config');
  } catch {
    // Ignore storage access errors
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: User }>('/api/v1/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    scrubLegacyAuthStorage();
    refreshUser();

    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('coffee_session_expired', handleExpired);
    return () => window.removeEventListener('coffee_session_expired', handleExpired);
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRefresh: true,
    });
    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } catch {
      // Always clear local state even if network fails
    }
    setUser(null);
  };

  const hasPermission = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const hasGranularPermission = (permission: PermissionId): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return Boolean(user.permissions?.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasGranularPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
