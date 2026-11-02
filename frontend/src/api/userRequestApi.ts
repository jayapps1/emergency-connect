import { apiClient } from './client';

export interface UserManagementRequest {
  id: string;
  requestType: 'DEACTIVATE' | 'TRANSFER' | 'REMOVE_ACCESS' | 'UPDATE_ASSIGNMENT' | 'EMAIL_CHANGE';
  targetUserId: string;
  targetUserEmail: string;
  requestedEmail?: string;
  targetUserName: string;
  agencyId: string;
  agencyName?: string;
  reason: string;
  effectiveDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const userRequestApi = {
  getRequests: async (): Promise<UserManagementRequest[]> => {
    const res = await apiClient.get<UserManagementRequest[]>('/api/v1/admin/user-requests');
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
};
