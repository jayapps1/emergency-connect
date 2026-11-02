import { apiClient } from './client';
import { AgencyType, IncidentCategory, IncidentSeverity } from '@/types';

export const categoryApi = {
  // Loads the backend-managed tracking policy for every incident category so administrators can configure location behavior from one source of truth.
  getCategories: async (): Promise<IncidentCategory[]> => {
    try {
      const res = await apiClient.get<IncidentCategory[]>('/api/v1/admin/incident-categories');
      return res.data;
    } catch (_: any) {
      const fallback = await apiClient.get<IncidentCategory[]>('/api/v1/public/incident-categories');
      return fallback.data;
    }
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
