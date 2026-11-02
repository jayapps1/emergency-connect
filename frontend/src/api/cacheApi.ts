import { apiClient } from './client';

export interface CacheMetric {
  cacheName: string;
  provider: string;
  estimatedSize: number;
  hitCount: number;
  missCount: number;
  hitRate: string;
  evictionCount: number;
}

export const cacheApi = {
  getMetrics: async (): Promise<CacheMetric[]> => {
    const res = await apiClient.get<CacheMetric[]>('/api/v1/admin/cache/metrics');
    return res.data;
  },

  clearCache: async (cacheName?: string): Promise<{ cleared: boolean; cacheName?: string }> => {
    const res = await apiClient.post('/api/v1/admin/cache/clear', null, {
      params: { cacheName },
    });
    return res.data;
  },
};
