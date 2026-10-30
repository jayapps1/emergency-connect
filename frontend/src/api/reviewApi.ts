import { apiClient } from './client';

export interface ReviewSummary {
  averageRating: number | null;
  totalReviews: number;
  fiveStarCount: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewItem {
  id: string;
  reportId: string;
  publicReference?: string;
  assignmentId: string;
  rating: number;
  responseSpeedRating?: number;
  professionalismRating?: number;
  helpfulnessRating?: number;
  comment?: string;
  createdAt: string;
}

export const reviewApi = {
  getSummary: async (agencyId?: string): Promise<ReviewSummary> => {
    const params: Record<string, any> = {};
    if (agencyId) params.agencyId = agencyId;
    const response = await apiClient.get<ReviewSummary>('/api/v1/admin/reviews/summary', { params });
    return response.data;
  },

  getReviews: async (page = 0, size = 10, rating?: number, agencyId?: string): Promise<{ content: ReviewItem[]; totalElements: number }> => {
    const params: Record<string, any> = { page, size };
    if (rating) params.rating = rating;
    if (agencyId) params.agencyId = agencyId;
    const response = await apiClient.get<{ content: ReviewItem[]; totalElements: number }>('/api/v1/admin/reviews', { params });
    return response.data;
  },
};
