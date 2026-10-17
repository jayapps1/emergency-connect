import { apiClient } from './client';
import { AgencyType, IncidentCategory, IncidentSeverity } from '@/types';

export const categoryApi = {
  getCategories: async (): Promise<IncidentCategory[]> => {
    const res = await apiClient.get<IncidentCategory[]>('/api/v1/admin/incident-categories');
    return res.data;
  },

  createCategory: async (data: {
    code: string;
    name: string;
    description?: string;
    defaultSeverity: IncidentSeverity;
    supportsSilent: boolean;
    supportsGeneral: boolean;
    supportsCall: boolean;
    displayOrder: number;
    defaultAgencyTypes?: AgencyType[];
  }): Promise<IncidentCategory> => {
    const res = await apiClient.post<IncidentCategory>('/api/v1/admin/incident-categories', data);
    return res.data;
  },

  updateCategory: async (
    id: string,
    data: {
      name: string;
      description?: string;
      defaultSeverity: IncidentSeverity;
      supportsSilent: boolean;
      supportsGeneral: boolean;
      supportsCall: boolean;
      displayOrder: number;
      active: boolean;
      defaultAgencyTypes?: AgencyType[];
    }
  ): Promise<IncidentCategory> => {
    const res = await apiClient.put<IncidentCategory>(`/api/v1/admin/incident-categories/${id}`, data);
    return res.data;
  },

  toggleCategoryStatus: async (id: string): Promise<IncidentCategory> => {
    const res = await apiClient.patch<IncidentCategory>(`/api/v1/admin/incident-categories/${id}/status`);
    return res.data;
  },
};
