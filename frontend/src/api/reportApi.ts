import { apiClient } from './client';
import { AdminReportDetails, AdminReportSummary, AgencyType, Page, ReportStatus } from '@/types';

export const reportApi = {
  getReports: async (page = 0, size = 10): Promise<Page<AdminReportSummary>> => {
    const res = await apiClient.get<Page<AdminReportSummary>>('/api/v1/admin/reports', {
      params: { page, size },
    });
    return res.data;
  },

  getReportDetails: async (reportId: string): Promise<AdminReportDetails> => {
    const res = await apiClient.get<AdminReportDetails>(`/api/v1/admin/reports/${reportId}`);
    return res.data;
  },

  acknowledgeReport: async (reportId: string): Promise<AdminReportDetails> => {
    const res = await apiClient.post<AdminReportDetails>(`/api/v1/admin/reports/${reportId}/acknowledge`);
    return res.data;
  },

  assignReport: async (reportId: string, data: { stationId?: string; note?: string }): Promise<AdminReportDetails> => {
    const res = await apiClient.post<AdminReportDetails>(`/api/v1/admin/reports/${reportId}/assign`, data);
    return res.data;
  },

  updateReportStatus: async (reportId: string, data: { status: ReportStatus; note?: string }): Promise<AdminReportDetails> => {
    const res = await apiClient.patch<AdminReportDetails>(`/api/v1/admin/reports/${reportId}/status`, data);
    return res.data;
  },

  transferReport: async (reportId: string, data: { targetAgencyType: AgencyType; note?: string }): Promise<AdminReportDetails> => {
    const res = await apiClient.post<AdminReportDetails>(`/api/v1/admin/reports/${reportId}/transfer`, data);
    return res.data;
  },

  promptAgency: async (reportId: string, note?: string): Promise<AdminReportDetails> => {
    const res = await apiClient.post<AdminReportDetails>(`/api/v1/admin/reports/${reportId}/prompt`, { note });
    return res.data;
  },
};
