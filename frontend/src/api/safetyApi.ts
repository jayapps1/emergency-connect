import { apiClient } from './client';

export interface SafetySummary {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  warnings: number;
}

export interface SafetyPostItem {
  id: string;
  sourceType: 'SYSTEM' | 'AGENCY';
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
  createdBy: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  severity: 'INFO' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  notifyUsers: boolean;
  publishedAt?: string;
  expiresAt?: string;
  removedAt?: string;
  removalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const safetyApi = {
  getSummary: async (): Promise<SafetySummary> => {
    const res = await apiClient.get<SafetySummary>('/api/v1/admin/safety-information/summary');
    return res.data;
  },

  getAdminPosts: async (
    page = 0,
    size = 20,
    status?: string,
    category?: string,
    severity?: string,
    agencyId?: string,
    search?: string
  ): Promise<{ content: SafetyPostItem[]; totalElements: number }> => {
    const params: Record<string, any> = { page, size };
    if (status && status !== 'ALL') params.status = status;
    if (category && category !== 'ALL') params.category = category;
    if (severity && severity !== 'ALL') params.severity = severity;
    if (agencyId && agencyId !== 'ALL') params.agencyId = agencyId;
    if (search) params.search = search;

    const res = await apiClient.get<{ content: SafetyPostItem[]; totalElements: number }>('/api/v1/admin/safety-information', { params });
    return res.data;
  },

  createPost: async (data: {
    title: string;
    content: string;
    category?: string;
    severity?: string;
    status?: string;
    notifyUsers?: boolean;
  }): Promise<SafetyPostItem> => {
    const res = await apiClient.post<SafetyPostItem>('/api/v1/admin/safety-information', data);
    return res.data;
  },

  updatePost: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      severity?: string;
      notifyUsers?: boolean;
    }
  ): Promise<SafetyPostItem> => {
    const res = await apiClient.put<SafetyPostItem>(`/api/v1/admin/safety-information/${id}`, data);
    return res.data;
  },

  publishPost: async (id: string): Promise<SafetyPostItem> => {
    const res = await apiClient.post<SafetyPostItem>(`/api/v1/admin/safety-information/${id}/publish`);
    return res.data;
  },

  unpublishPost: async (id: string): Promise<SafetyPostItem> => {
    const res = await apiClient.post<SafetyPostItem>(`/api/v1/admin/safety-information/${id}/unpublish`);
    return res.data;
  },

  archivePost: async (id: string): Promise<SafetyPostItem> => {
    const res = await apiClient.post<SafetyPostItem>(`/api/v1/admin/safety-information/${id}/archive`);
    return res.data;
  },

  removePostBySystem: async (id: string, removalReason: string): Promise<SafetyPostItem> => {
    const res = await apiClient.post<SafetyPostItem>(`/api/v1/admin/safety-information/${id}/remove`, { removalReason });
    return res.data;
  },
};
