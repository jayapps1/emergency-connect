import { apiClient } from './client';

export interface EmergencyCallAttempt {
  id: string;
  publicReference: string;
  agencyId: string;
  stationId?: string;
  destinationType: string;
  destinationPhone: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  status: string;
  initiatedAt: string;
  callLaunchedAt?: string;
  linkedReportId?: string;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const callAttemptApi = {
  getCallAttempts: async (page = 0, size = 10): Promise<Page<EmergencyCallAttempt>> => {
    const res = await apiClient.get('/api/v1/staff/emergency-call-attempts', {
      params: { page, size, sort: 'initiatedAt,desc' }
    });
    return res.data;
  },

  getCallAttemptDetails: async (id: string): Promise<EmergencyCallAttempt> => {
    const res = await apiClient.get(`/api/v1/staff/emergency-call-attempts/${id}`);
    return res.data;
  },

  updateStatus: async (id: string, status: string): Promise<EmergencyCallAttempt> => {
    const res = await apiClient.patch(`/api/v1/staff/emergency-call-attempts/${id}/status`, null, {
      params: { status }
    });
    return res.data;
  },

  convertToIncident: async (id: string, categoryId: string, reportMode = 'GENERAL', description?: string): Promise<EmergencyCallAttempt> => {
    const res = await apiClient.post(`/api/v1/staff/emergency-call-attempts/${id}/convert-to-incident`, {
      categoryId,
      reportMode,
      description
    });
    return res.data;
  }
};
