import { apiClient } from './client';

export interface UserManagementRequest {
  id: string;
  requestType: 'DEACTIVATE' | 'TRANSFER' | 'REMOVE_ACCESS' | 'UPDATE_ASSIGNMENT' | 'EMAIL_CHANGE' | 'MFA_RECOVERY_CODE_REISSUE';
  targetUserId: string;
  targetUserEmail: string;
  requestedEmail?: string;
  targetUserName: string;
  agencyId: string;
  agencyName?: string;
  reason: string;
  effectiveDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'PENDING_AGENCY_VERIFICATION' | 'PENDING_SYSTEM_APPROVAL' | 'REJECTED_BY_AGENCY' | 'REJECTED_BY_SYSTEM_ADMIN' | 'APPROVED_AWAITING_COLLECTION' | 'EXPIRED' | 'WITHDRAWN';
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  agencyVerifiedBy?: string;
  agencyVerifiedAt?: string;
  agencyVerificationMethod?: string;
  agencyVerificationNotes?: string;
  collectionTokenExpiresAt?: string;
  collectedAt?: string;
  createdAt: string;
}

export const userRequestApi = {
  getRequests: async (): Promise<UserManagementRequest[]> => {
    const res = await apiClient.get<UserManagementRequest[]>('/api/v1/admin/user-requests');
    return res.data;
  },

  getMyRequests: async (): Promise<UserManagementRequest[]> => {
    const res = await apiClient.get<UserManagementRequest[]>('/api/v1/admin/user-requests/my-requests');
    return res.data;
  },

  getMyRequestById: async (requestId: string): Promise<UserManagementRequest> => {
    const res = await apiClient.get<UserManagementRequest>(`/api/v1/admin/user-requests/my-requests/${requestId}`);
    return res.data;
  },

  submitRequest: async (data: {
    requestType: string;
    targetUserId: string;
    reason: string;
    effectiveDate?: string;
  }): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>('/api/v1/admin/user-requests', data);
    return res.data;
  },

  approveRequest: async (requestId: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/${requestId}/approve`);
    return res.data;
  },

  rejectRequest: async (requestId: string, reason?: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/${requestId}/reject`, null, {
      params: { reason },
    });
    return res.data;
  },

  submitRecoveryRequest: async (reason?: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>('/api/v1/admin/user-requests/recovery/submit', { reason });
    return res.data;
  },

  submitAssistedRecoveryRequest: async (data: {
    targetUserId: string;
    verificationMethod: string;
    verificationNotes: string;
    reason: string;
  }): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>('/api/v1/admin/user-requests/recovery/assisted-submit', data);
    return res.data;
  },

  withdrawRecoveryRequest: async (requestId: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/recovery/${requestId}/withdraw`);
    return res.data;
  },

  agencyVerifyRecovery: async (requestId: string, data: { verificationMethod: string; verificationNotes: string }): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/recovery/${requestId}/agency-verify`, data);
    return res.data;
  },

  systemApproveRecovery: async (requestId: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/recovery/${requestId}/system-approve`);
    return res.data;
  },

  rejectRecoveryRequest: async (requestId: string, reason?: string): Promise<UserManagementRequest> => {
    const res = await apiClient.post<UserManagementRequest>(`/api/v1/admin/user-requests/recovery/${requestId}/reject`, null, {
      params: { reason },
    });
    return res.data;
  },

  collectRecoveryCodes: async (requestId: string, password: string): Promise<string[]> => {
    const res = await apiClient.post<string[]>(`/api/v1/admin/user-requests/recovery/${requestId}/collect`, { password });
    return res.data;
  },
};
