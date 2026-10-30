import { apiClient } from './client';

export interface PublicUserSummary {
  totalAccounts: number;
  verifiedAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  guestInstallations: number;
}

export interface PublicUserItem {
  id: string;
  publicReference: string;
  phoneNumberMasked: string;
  phoneVerified: boolean;
  status: string;
  totpEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  reportCount: number;
  activeSessionCount: number;
}

export interface GuestInstallationItem {
  id: string;
  guestReference: string;
  status: string;
  isLinkedAccount: boolean;
  createdAt: string;
  lastSeenAt: string;
  reportCount: number;
}

export const publicUserApi = {
  getSummary: async (): Promise<PublicUserSummary> => {
    const res = await apiClient.get<PublicUserSummary>('/api/v1/admin/public-users/summary');
    return res.data;
  },

  getPublicUsers: async (
    page = 0,
    size = 20,
    status?: string,
    search?: string
  ): Promise<{ content: PublicUserItem[]; totalElements: number }> => {
    const params: Record<string, any> = { page, size };
    if (status && status !== 'ALL') params.status = status;
    if (search) params.search = search;
    const res = await apiClient.get<{ content: PublicUserItem[]; totalElements: number }>('/api/v1/admin/public-users', { params });
    return res.data;
  },

  getGuestInstallations: async (
    page = 0,
    size = 20
  ): Promise<{ content: GuestInstallationItem[]; totalElements: number }> => {
    const res = await apiClient.get<{ content: GuestInstallationItem[]; totalElements: number }>('/api/v1/admin/public-users/guests', {
      params: { page, size },
    });
    return res.data;
  },

  disablePublicUser: async (id: string): Promise<PublicUserItem> => {
    const res = await apiClient.post<PublicUserItem>(`/api/v1/admin/public-users/${id}/disable`);
    return res.data;
  },

  enablePublicUser: async (id: string): Promise<PublicUserItem> => {
    const res = await apiClient.post<PublicUserItem>(`/api/v1/admin/public-users/${id}/enable`);
    return res.data;
  },

  revokeSessions: async (id: string): Promise<{ userId: string; revokedCount: number }> => {
    const res = await apiClient.post<{ userId: string; revokedCount: number }>(`/api/v1/admin/public-users/${id}/revoke-sessions`);
    return res.data;
  },
};
