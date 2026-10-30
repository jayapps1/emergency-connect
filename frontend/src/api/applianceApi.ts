import { apiClient } from './client';

export interface ApplianceSummary {
  total: number;
  available: number;
  atEmergency: number;
  outOfCommission: number;
  maintenance: number;
}

export interface ApplianceItem {
  id: string;
  agencyId: string;
  homeStationId: string;
  homeStationName?: string;
  currentStationId?: string;
  currentStationName?: string;
  effectiveStationId: string;
  resourceType: string;
  callSign: string;
  registrationNumber?: string;
  displayName: string;
  operationalStatus: string;
  statusReason?: string;
  active: boolean;
  updatedAt: string;
}

export interface ApplianceStatusHistory {
  id: string;
  applianceId: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  incidentId?: string;
  changedBy?: string;
  changedAt: string;
}

export const applianceApi = {
  getSummary: async (): Promise<ApplianceSummary> => {
    const response = await apiClient.get<ApplianceSummary>('/api/v1/admin/appliances/summary');
    return response.data;
  },

  getAppliances: async (): Promise<ApplianceItem[]> => {
    const response = await apiClient.get<ApplianceItem[]>('/api/v1/admin/appliances');
    return response.data;
  },

  createAppliance: async (data: {
    callSign: string;
    displayName: string;
    resourceType: string;
    homeStationId: string;
    registrationNumber?: string;
  }): Promise<ApplianceItem> => {
    const response = await apiClient.post<ApplianceItem>('/api/v1/admin/appliances', data);
    return response.data;
  },

  updateAppliance: async (
    id: string,
    data: {
      displayName?: string;
      resourceType?: string;
      homeStationId?: string;
      registrationNumber?: string;
    }
  ): Promise<ApplianceItem> => {
    const response = await apiClient.put<ApplianceItem>(`/api/v1/admin/appliances/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string, reason?: string): Promise<ApplianceItem> => {
    const response = await apiClient.post<ApplianceItem>(`/api/v1/admin/appliances/${id}/status`, { status, reason });
    return response.data;
  },

  relocate: async (id: string, currentStationId: string): Promise<ApplianceItem> => {
    const response = await apiClient.post<ApplianceItem>(`/api/v1/admin/appliances/${id}/relocate`, { currentStationId });
    return response.data;
  },

  returnToHomeStation: async (id: string): Promise<ApplianceItem> => {
    const response = await apiClient.post<ApplianceItem>(`/api/v1/admin/appliances/${id}/return-home`);
    return response.data;
  },

  deactivateAppliance: async (id: string): Promise<ApplianceItem> => {
    const response = await apiClient.post<ApplianceItem>(`/api/v1/admin/appliances/${id}/deactivate`);
    return response.data;
  },

  getApplianceHistory: async (id: string): Promise<ApplianceStatusHistory[]> => {
    const response = await apiClient.get<ApplianceStatusHistory[]>(`/api/v1/admin/appliances/${id}/history`);
    return response.data;
  },
};
