import { apiClient } from './client';

export interface StationOriginDto {
  agencyId: string;
  agencyName: string;
  stationId?: string;
  stationName?: string;
  latitude: number;
  longitude: number;
}

export interface IncidentLocationSummary {
  reportId: string;
  publicReference: string;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAccuracyMeters?: number;
  initialCapturedAt?: string;
  isLiveTrackingActive: boolean;
  latestLiveLatitude?: number;
  latestLiveLongitude?: number;
  latestLiveAccuracyMeters?: number;
  latestLiveCapturedAt?: string;
  stationOrigins: StationOriginDto[];
}

export interface LocationSession {
  sessionId: string;
  reportId?: string;
  callAttemptId?: string;
  status: string;
  trackingPolicy: 'INCIDENT_LOCATION' | 'LIVE_OPTIONAL' | 'LIVE_RECOMMENDED';
  consentGrantedAt: string;
  startedAt: string;
  lastLocationAt?: string;
  endedAt?: string;
}

export interface PublicTrackingShareDetail {
  publicReference: string;
  categoryName: string;
  status: string;
  shareMode: string;
  trackingStatus?: string;
  agencyName?: string;
  stationName?: string;
  applianceCode?: string;
  responseLeadName?: string;
  stationLatitude?: number;
  stationLongitude?: number;
  incidentLatitude?: number;
  incidentLongitude?: number;
  responseLatitude?: number;
  responseLongitude?: number;
  responseAccuracyMeters?: number;
  responseLastUpdatedAt?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const locationTrackingApi = {
  getLocationSummary: async (reportId: string): Promise<IncidentLocationSummary> => {
    const res = await apiClient.get(`/api/v1/staff/incidents/${reportId}/location-summary`);
    return res.data;
  },

  getLocationSessions: async (page = 0, size = 10): Promise<Page<LocationSession>> => {
    const res = await apiClient.get('/api/v1/staff/location-sessions', {
      params: { page, size, sort: 'startedAt,desc' }
    });
    return res.data;
  },

  revokeLocationSession: async (sessionId: string): Promise<LocationSession> => {
    const res = await apiClient.post(`/api/v1/staff/location-sessions/${sessionId}/revoke`);
    return res.data;
  },

  updateCategoryTrackingPolicy: async (categoryId: string, trackingPolicy: string) => {
    const res = await apiClient.put(`/api/v1/admin/incident-categories/${categoryId}/tracking-policy`, null, {
      params: { trackingPolicy }
    });
    return res.data;
  },

  requestLiveTracking: async (reportId: string, reason?: string) => {
    const res = await apiClient.post('/api/v1/staff/live-tracking-requests', { reportId, reason });
    return res.data;
  },

  createTrackingShare: async (reportId: string, shareMode = 'SNAPSHOT', durationMinutes = 60) => {
    const res = await apiClient.post('/api/v1/staff/tracking-shares', { reportId, shareMode, durationMinutes });
    return res.data;
  },

  getPublicShareByToken: async (token: string): Promise<PublicTrackingShareDetail> => {
    const res = await apiClient.get(`/api/v1/public/track-share/${token}`);
    return res.data;
  }
};
