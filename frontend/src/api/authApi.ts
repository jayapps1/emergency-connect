import { apiClient } from './client';
import { AdminUser, LoginResponse } from '@/types';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/admin/auth/login', credentials);
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

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.post('/api/v1/admin/auth/change-password', data);
  },
};
