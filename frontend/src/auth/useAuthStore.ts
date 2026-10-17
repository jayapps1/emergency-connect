import { create } from 'zustand';
import { AdminUser } from '@/types';

/**
 * Zustand state store managing administrative authentication tokens, principal user profiles,
 * role assignments, and permission authorizations.
 *
 * <p>Access Control Rationale:
 * <ul>
 *   <li><b>SYSTEM_ADMIN:</b> Granted global authorization across all permissions implicitly via {@link hasPermission}.</li>
 *   <li><b>Permission Checks:</b> Fine-grained permission strings (e.g. {@code STATION_CREATE}, {@code STATION_VERIFY})
 *       are verified against the principal's permission array.</li>
 * </ul>
 */
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
  accessToken: null,
  user: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (token, user, roles = [], permissions = []) => {
    set({
      accessToken: token,
      user,
      roles: roles.length > 0 ? roles : user.roles || [],
      permissions: permissions.length > 0 ? permissions : [],
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  setInitializing: (loading) => {
    set({ isInitializing: loading });
  },

  logout: () => {
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
    if (roles.includes('SYSTEM_ADMIN')) return true;
    return permissions.includes(permission);
  },

  hasRole: (role) => {
    const { roles } = get();
    return roles.includes(role) || roles.includes('SYSTEM_ADMIN');
  },
}));
