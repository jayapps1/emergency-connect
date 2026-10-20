import { apiClient } from './client';
import { AdminReportDetails, AdminReportSummary, AgencyType, Page, ReportStatus } from '@/types';

export interface ReportRiskAssessment {
  id: string;
  reportId: string;
  riskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH';
  riskScore?: number;
  signals?: string;
  reviewStatus: 'UNREVIEWED' | 'CONFIRMED_VALID' | 'CONFIRMED_ABUSE' | 'FALSE_POSITIVE';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

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

  reviewRiskAssessment: async (reportId: string, decision: string, note?: string): Promise<ReportRiskAssessment> => {
    const res = await apiClient.post<ReportRiskAssessment>(`/api/v1/admin/report-risk/${reportId}/review`, { decision, note });
    return res.data;
  },
};
