import { apiClient } from './client';
import { AdminUser, LoginResponse } from '@/types';

export interface StaffEmailHistoryItem {
  id: string;
  staffUserId: string;
  oldEmail: string;
  newEmail: string;
  changeType: string;
  requestId?: string;
  changedByUserId: string;
  reason?: string;
  requestedAt?: string;
  approvedAt?: string;
  changedAt: string;
}

export interface StaffNotificationItem {
  id: string;
  staffUserId?: string;
  userId?: string;
  title: string;
  body?: string;
  message?: string;
  eventType?: string;
  notificationType?: string;
  readAt?: string;
  readState?: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/login', credentials);
    return res.data;
  },

  loginWithTotpDirect: async (email: string, code: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/login/totp-direct', { email, code });
    return res.data;
  },

  startTotpSetup: async (challenge?: string): Promise<{ secret: string; manualSetupKey: string; provisioningUri: string }> => {
    const res = await apiClient.post<{ secret: string; manualSetupKey: string; provisioningUri: string }>('/api/v1/admin/auth/mfa/totp/setup', { challenge });
    return res.data;
  },

  confirmTotpSetup: async (code: string, challenge?: string): Promise<{ message: string; recoveryCodes: string[] }> => {
    const res = await apiClient.post<{ message: string; recoveryCodes: string[] }>('/api/v1/admin/auth/mfa/totp/confirm', { code, challenge });
    return res.data;
  },

  disableTotp: async (password?: string): Promise<void> => {
    await apiClient.post('/api/v1/admin/auth/mfa/totp/disable', { password });
  },

  verifyMfaTotp: async (challenge: string, code: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/mfa/totp/verify', { challenge, code });
    return res.data;
  },

  verifyMfaRecovery: async (challenge: string, recoveryCode: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/mfa/recovery/verify', { challenge, recoveryCode });
    return res.data;
  },

  refresh: async (): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/refresh');
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/admin/auth/logout');
  },

  getMe: async (): Promise<AdminUser> => {
    const res = await apiClient.get<AdminUser>('/api/v1/admin/auth/me');
    return res.data;
  },

  updateProfile: async (data: { firstName: string; lastName: string; phoneNumber?: string }): Promise<LoginResponse> => {
    const res = await apiClient.put<LoginResponse>('/api/v1/admin/auth/profile', data);
    return res.data;
  },

  requestEmailChange: async (data: { requestedEmail: string; reason: string }): Promise<{ requestId: string; status: string }> => {
    const res = await apiClient.post<{ requestId: string; status: string }>('/api/v1/admin/auth/email-change-request', data);
    return res.data;
  },

  getEmailChangeStatus: async (): Promise<{
    status: string;
    emailChangeAllowed: boolean;
    hasPendingEmailChange: boolean;
    pendingRequestedEmail?: string;
    nextEmailChangeEligibleAt?: string;
  }> => {
    const res = await apiClient.get('/api/v1/admin/auth/email-change-status');
    return res.data;
  },

  verifyPasswordForEmailChange: async (password: string): Promise<{ verificationToken: string; expiresAt: string; verified: boolean }> => {
    const res = await apiClient.post('/api/v1/admin/auth/verify-password', { password });
    return res.data;
  },

  changeEmailDirect: async (data: { verificationToken: string; newEmail: string; confirmNewEmail: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/change-email-direct', data);
    return res.data;
  },

  generateRecoveryCodesDirect: async (data: { verificationToken: string }): Promise<string[]> => {
    const res = await apiClient.post<string[]>('/api/v1/admin/auth/generate-recovery-codes-direct', data);
    return res.data;
  },

  getEmailHistory: async (): Promise<StaffEmailHistoryItem[]> => {
    const res = await apiClient.get<StaffEmailHistoryItem[]>('/api/v1/admin/auth/email-history');
    return res.data;
  },

  getNotifications: async (): Promise<StaffNotificationItem[]> => {
    const res = await apiClient.get<StaffNotificationItem[]>('/api/v1/admin/auth/notifications');
    return res.data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await apiClient.put(`/api/v1/admin/auth/notifications/${id}/read`);
  },

  markAllNotificationsRead: async (): Promise<void> => {
    await apiClient.put('/api/v1/admin/auth/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/auth/notifications/${id}`);
  },

  deleteAllReadNotifications: async (): Promise<void> => {
    await apiClient.delete('/api/v1/admin/auth/notifications/read');
  },

  completeEmailChange: async (currentPassword: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/complete-email-change', { currentPassword });
    return res.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.post('/api/v1/admin/auth/change-password', data);
  },
};
