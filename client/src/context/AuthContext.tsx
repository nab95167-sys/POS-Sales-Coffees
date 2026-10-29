import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: Role) => void;
  hasPermission: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('coffee_pos_user');
    return savedUser ? JSON.parse(savedUser) : {
      id: 'demo-admin-id',
      email: 'admin@coffeepos.com',
      name: 'Sophia Chen',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('coffee_pos_token') || 'demo_jwt_token_123';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('coffee_pos_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('coffee_pos_user');
    }
  }, [user]);

  const login = async (email = 'admin@coffeepos.com', password = 'password') => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('coffee_pos_token', data.token);
      } else {
        switchDemoRole('ADMIN');
      }
    } catch {
      switchDemoRole('ADMIN');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('coffee_pos_token');
    localStorage.removeItem('coffee_pos_user');
  };

  const switchDemoRole = (role: Role) => {
    const roleProfiles: Record<Role, User> = {
      ADMIN: {
        id: 'demo-admin-id',
        email: 'admin@coffeepos.com',
        name: 'Sophia Chen',
        role: 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      MANAGER: {
        id: 'demo-manager-id',
        email: 'manager@coffeepos.com',
        name: 'Alexander Wright',
        role: 'MANAGER',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      CASHIER: {
        id: 'demo-cashier-id',
        email: 'cashier@coffeepos.com',
        name: 'Sokha Ly',
        role: 'CASHIER',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      },
      BARISTA: {
        id: 'demo-barista-id',
        email: 'barista@coffeepos.com',
        name: 'Devin Vance',
        role: 'BARISTA',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      },
    };

    const targetUser = roleProfiles[role];
    const targetToken = 'demo_token_' + role.toLowerCase();
    setUser(targetUser);
    setToken(targetToken);
    localStorage.setItem('coffee_pos_user', JSON.stringify(targetUser));
    localStorage.setItem('coffee_pos_token', targetToken);
  };

  const hasPermission = (allowedRoles: Role[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, switchDemoRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
