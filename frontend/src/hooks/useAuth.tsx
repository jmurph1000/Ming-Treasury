'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, oktaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      // Not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, oktaToken?: string) {
    try {
      const response = await authApi.login(email, oktaToken);
      if (response.success && response.data) {
        setUser(response.data.user);
        router.push('/payments');
      }
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
      router.push('/login');
    }
  }

  async function refreshUser() {
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      setUser(null);
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hooks for role checking
export function useCanApprove() {
  const { user } = useAuth();
  return user?.role !== 'staff';
}

export function useCanExecute() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

export function useIsCfoOrAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

export function usePaymentLimit() {
  const { user } = useAuth();
  return user?.paymentLimit ?? null;
}
