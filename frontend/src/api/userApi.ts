import { apiClient } from './client';
import { AdminUser, Page } from '@/types';

export const userApi = {
  getUsers: async (page = 0, size = 50): Promise<Page<AdminUser>> => {
    const res = await apiClient.get<Page<AdminUser>>('/api/v1/admin/users', {
      params: { page, size },
    });
    return res.data;
  },

  getUserById: async (userId: string): Promise<AdminUser> => {
    const res = await apiClient.get<AdminUser>(`/api/v1/admin/users/${userId}`);
    return res.data;
  },

  createUser: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    agencyId?: string;
    region?: string;
    stationId?: string;
    priorityLevel?: number | null;
    roleCodes?: string[];
  }): Promise<{ user: AdminUser; temporaryPassword: string }> => {
    const res = await apiClient.post<{ user: AdminUser; temporaryPassword: string }>('/api/v1/admin/users', data);
    return res.data;
  },

  updateUser: async (
    userId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      agencyId?: string;
      region?: string;
      stationId?: string;
      priorityLevel?: number | null;
      roleCodes?: string[];
    }
  ): Promise<AdminUser> => {
    const res = await apiClient.put<AdminUser>(`/api/v1/admin/users/${userId}`, data);
    return res.data;
  },

  deactivateUser: async (userId: string): Promise<AdminUser> => {
    const res = await apiClient.post<AdminUser>(`/api/v1/admin/users/${userId}/deactivate`);
    return res.data;
  },

  reactivateUser: async (userId: string): Promise<AdminUser> => {
    const res = await apiClient.post<AdminUser>(`/api/v1/admin/users/${userId}/reactivate`);
    return res.data;
  },

  resetPassword: async (userId: string): Promise<{ email: string; temporaryPassword: string }> => {
    const res = await apiClient.post<{ email: string; temporaryPassword: string }>(`/api/v1/admin/users/${userId}/reset-password`);
    return res.data;
  },

  transferAgencyLeadership: async (data: {
    recipientUserId: string;
    password: string;
    reason?: string;
  }): Promise<AdminUser> => {
    const res = await apiClient.post<AdminUser>('/api/v1/admin/users/transfer-leadership', data);
    return res.data;
  },

  transferNationalLeadership: async (data: {
    recipientUserId: string;
    password: string;
    reason?: string;
  }): Promise<AdminUser> => {
    const res = await apiClient.post<AdminUser>('/api/v1/admin/users/transfer-national-leadership', data);
    return res.data;
  },

  configureAgencyPriorities: async (agencyId: string, priorityMap: Record<string, number>): Promise<AdminUser[]> => {
    const res = await apiClient.post<AdminUser[]>('/api/v1/admin/users/configure-agency-priorities', priorityMap, {
      params: { agencyId },
    });
    return res.data;
  },
};
