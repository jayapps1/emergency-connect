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

export interface IncidentFollowUp {
  id: string;
  reportId: string;
  agencyId: string;
  createdByStaffUserId: string;
  followUpType: string;
  status: string;
  notes: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const reportApi = {
  getReports: async (page = 0, size = 10): Promise<Page<AdminReportSummary>> => {
    const res = await apiClient.get<Page<AdminReportSummary>>('/api/v1/admin/reports', {
      params: { page, size },
    });
    return res.data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const res = await apiClient.get<{ unreadCount: number }>('/api/v1/admin/reports/unread-count');
    return res.data;
  },

  markAsRead: async (reportId: string): Promise<void> => {
    await apiClient.post(`/api/v1/admin/reports/${reportId}/read`);
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

  createFollowUp: async (data: { reportId: string; followUpType: string; notes: string; scheduledAt?: string }): Promise<IncidentFollowUp> => {
    const res = await apiClient.post<IncidentFollowUp>('/api/v1/staff/incidents/follow-ups', data);
    return res.data;
  },

  getFollowUps: async (reportId: string): Promise<IncidentFollowUp[]> => {
    const res = await apiClient.get<IncidentFollowUp[]>(`/api/v1/staff/incidents/${reportId}/follow-ups`);
    return res.data;
  },

  updateFollowUpStatus: async (followUpId: string, status: string): Promise<IncidentFollowUp> => {
    const res = await apiClient.patch<IncidentFollowUp>(`/api/v1/staff/follow-ups/${followUpId}/status`, null, {
      params: { status },
    });
    return res.data;
  },
};
