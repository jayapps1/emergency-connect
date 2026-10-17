import { apiClient } from './client';
import { Page, Station, StationContact, StationContactType, StationDetails, StationLevel } from '@/types';

/**
 * REST API client for administrative emergency station and contact operations.
 * Communicates with {@code /api/v1/admin/stations} endpoints.
 */
export const stationApi = {
  /**
   * Retrieves paginated station records scoped to the authenticated administrator.
   */
  getAdminStations: async (page = 0, size = 10): Promise<Page<Station>> => {
    const res = await apiClient.get<Page<Station>>('/api/v1/admin/stations', {
      params: { page, size },
    });
    return res.data;
  },

  /**
   * Searches stations by name or station code.
   */
  searchStations: async (query?: string): Promise<Station[]> => {
    const res = await apiClient.get<Station[]>('/api/v1/admin/stations/search', {
      params: { q: query },
    });
    return res.data;
  },

  /**
   * Retrieves complete details and contacts for a specific station.
   */
  getStationDetails: async (stationId: string): Promise<StationDetails> => {
    const res = await apiClient.get<StationDetails>(`/api/v1/admin/stations/${stationId}`);
    return res.data;
  },

  /**
   * Retrieves all contacts assigned to a station.
   */
  getStationContacts: async (stationId: string): Promise<StationContact[]> => {
    const res = await apiClient.get<StationContact[]>(`/api/v1/admin/stations/${stationId}/contacts`);
    return res.data;
  },

  /**
   * Creates a new emergency station record and optional primary contact.
   */
  createStation: async (data: {
    agencyId: string;
    name: string;
    code: string;
    stationLevel?: StationLevel;
    region?: string;
    district?: string;
    regionId?: string;
    districtId?: string;
    locality?: string;
    latitude: number;
    longitude: number;
    locationAccuracyMeters?: number | null;
    primaryContact?: {
      phoneNumber: string;
      type: StationContactType;
      priority: number;
      publicContact: boolean;
      available24Hour: boolean;
    };
  }): Promise<Station> => {
    const res = await apiClient.post<Station>('/api/v1/admin/stations', data);
    return res.data;
  },

  /**
   * Updates an existing station's name, administrative level, region, district, locality, and coordinates.
   */
  updateStation: async (
    id: string,
    data: {
      name: string;
      region?: string;
      district?: string;
      locality?: string;
      latitude: number;
      longitude: number;
      locationAccuracyMeters?: number | null;
    }
  ): Promise<Station> => {
    const res = await apiClient.put<Station>(`/api/v1/admin/stations/${id}`, data);
    return res.data;
  },

  /**
   * Verifies a station, enabling public publication.
   */
  verifyStation: async (id: string): Promise<Station> => {
    const res = await apiClient.patch<Station>(`/api/v1/admin/stations/${id}/verify`);
    return res.data;
  },

  /**
   * Toggles a station's active status between active and inactive.
   */
  toggleStationStatus: async (id: string): Promise<Station> => {
    const res = await apiClient.patch<Station>(`/api/v1/admin/stations/${id}/status`);
    return res.data;
  },

  /**
   * Adds a new contact number to a station.
   */
  createStationContact: async (
    stationId: string,
    data: {
      phoneNumber: string;
      type: StationContactType;
      priority: number;
      publicContact: boolean;
      available24Hour: boolean;
    }
  ): Promise<StationContact> => {
    const res = await apiClient.post<StationContact>(`/api/v1/admin/stations/${stationId}/contacts`, data);
    return res.data;
  },

  /**
   * Updates an existing station contact number, priority, or visibility.
   */
  updateStationContact: async (
    contactId: string,
    data: {
      phoneNumber: string;
      type: StationContactType;
      priority: number;
      publicContact: boolean;
      available24Hour: boolean;
    }
  ): Promise<StationContact> => {
    const res = await apiClient.put<StationContact>(`/api/v1/admin/stations/contacts/${contactId}`, data);
    return res.data;
  },

  /**
   * Verifies a station contact number.
   * Fails if parent station is unverified.
   */
  verifyStationContact: async (contactId: string): Promise<StationContact> => {
    const res = await apiClient.patch<StationContact>(`/api/v1/admin/stations/contacts/${contactId}/verify`);
    return res.data;
  },
};
