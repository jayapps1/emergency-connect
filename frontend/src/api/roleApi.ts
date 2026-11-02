import { apiClient } from './client';

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
}

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  systemRole: boolean;
  permissionCount: number;
  permissionCodes: string[];
  createdAt: string;
}

export const roleApi = {
  getRoles: async (): Promise<RoleItem[]> => {
    const res = await apiClient.get<RoleItem[]>('/api/v1/admin/roles');
    return res.data;
  },

  getPermissions: async (): Promise<PermissionItem[]> => {
    const res = await apiClient.get<PermissionItem[]>('/api/v1/admin/permissions');
    return res.data;
  },

  updateRolePermissions: async (roleId: string, permissionCodes: string[]): Promise<RoleItem> => {
    const res = await apiClient.put<RoleItem>(`/api/v1/admin/roles/${roleId}/permissions`, {
      permissionCodes,
    });
    return res.data;
  },
};
