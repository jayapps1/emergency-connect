import { create } from 'zustand';
import { AdminUser } from '@/types';

const INITIAL_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('gec_access_token') : null;
const INITIAL_ROLES = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('gec_roles') || '[]') : [];
const INITIAL_PERMS = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('gec_permissions') || '[]') : [];

interface AuthState {
  accessToken: string | null;
  user: AdminUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (token: string, user: AdminUser, roles?: string[], permissions?: string[]) => void;
  setInitializing: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: INITIAL_TOKEN,
  user: null,
  roles: INITIAL_ROLES,
  permissions: INITIAL_PERMS,
  isAuthenticated: Boolean(INITIAL_TOKEN),
  isInitializing: true,

  setAuth: (token, user, roles = [], permissions = []) => {
    const finalRoles = roles.length > 0 ? roles : user?.roles || [];
    const finalPerms = permissions.length > 0 ? permissions : [];
    try {
      localStorage.setItem('gec_access_token', token);
      localStorage.setItem('gec_roles', JSON.stringify(finalRoles));
      localStorage.setItem('gec_permissions', JSON.stringify(finalPerms));
    } catch (_: any) {}
    set({
      accessToken: token,
      user,
      roles: finalRoles,
      permissions: finalPerms,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  setInitializing: (loading) => {
    set({ isInitializing: loading });
  },

  logout: () => {
    try {
      localStorage.removeItem('gec_access_token');
      localStorage.removeItem('gec_roles');
      localStorage.removeItem('gec_permissions');
    } catch (_: any) {}
    set({
      accessToken: null,
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isInitializing: false,
    });
  },

  hasPermission: (permission) => {
    const { permissions, roles } = get();
    // System Administrators bypass specific permission checks
    if (roles.includes('SYSTEM_ADMIN') || roles.includes('ROLE_SYSTEM_ADMIN')) return true;
    return permissions.includes(permission);
  },

  hasRole: (role) => {
    const { roles } = get();
    return roles.includes(role) || roles.includes(`ROLE_${role}`) || roles.includes('SYSTEM_ADMIN') || roles.includes('ROLE_SYSTEM_ADMIN');
  },
}));
