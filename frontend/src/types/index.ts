export type UserRole =
  | 'ROLE_SYSTEM_ADMIN'
  | 'ROLE_AGENCY_ADMIN'
  | 'ROLE_REGIONAL_ADMIN'
  | 'ROLE_STATION_ADMIN'
  | 'ROLE_DISPATCHER'
  | 'ROLE_RESPONDER';

export type AgencyType = 'FIRE' | 'POLICE' | 'AMBULANCE' | 'DISASTER_MANAGEMENT' | 'OTHER';

export type StationLevel = 'NATIONAL_HQ' | 'RHQ' | 'DIVISIONAL_HQ' | 'DISTRICT_STATION' | 'SUB_STATION';

export type StationContactType = 'DISPATCH_HOTLINE' | 'COMMAND_DESK' | 'ALT_HOTLINE' | 'SMS_WHATSAPP' | 'STATION_MOBILE' | 'WATCHROOM';

export type ReportMode = 'SILENT' | 'GENERAL' | 'CALL';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'TRANSFERRED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  agencyId?: string;
  agencyName?: string;
  region?: string;
  stationId?: string;
  stationName?: string;
  active: boolean;
  locked: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  roles: string[];
}

export type AdminUser = User;

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  empty: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
  roles?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
  authenticationState?: string;
  mfaChallenge?: any;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  entityType?: string;
  targetId?: string;
  agencyId?: string;
  details?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RegionRef {
  id: string;
  code: string;
  name: string;
}

export interface DistrictRef {
  id: string;
  regionId: string;
  code: string;
  name: string;
}

export interface Agency {
  id: string;
  code: string;
  name: string;
  type: AgencyType;
  primaryContactNumber?: string;
  emergencyNumber?: string;
  active: boolean;
  verified: boolean;
}

export interface Station {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  stationLevel: StationLevel;
  region: string;
  district: string;
  regionId?: string;
  districtId?: string;
  locality?: string;
  latitude: number;
  longitude: number;
  locationAccuracyMeters?: number;
  active: boolean;
  verified: boolean;
}

export interface StationContact {
  id: string;
  stationId: string;
  phoneNumber: string;
  type: StationContactType;
  priority: number;
  publicContact: boolean;
  is24Hour: boolean;
  active: boolean;
  verified: boolean;
}

export interface StationDetails {
  station: Station;
  contacts: StationContact[];
}

export interface IncidentCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultSeverity: IncidentSeverity;
  supportsSilent: boolean;
  supportsGeneral: boolean;
  supportsCall: boolean;
  displayOrder: number;
  active: boolean;
  defaultAgencyTypes: AgencyType[];
}

export interface ReportAttachment {
  id: string;
  reportId: string;
  mediaType: 'IMAGE' | 'VIDEO';
  contentType: string;
  originalFileName?: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface AgencyAssignment {
  assignmentId: string;
  agencyType: AgencyType;
  agencyId?: string;
  agencyName?: string;
  stationId?: string;
  stationName?: string;
  status: ReportStatus;
  assignedAt: string;
  updatedAt: string;
  acknowledgementSlaState?: string;
  responseStartSlaState?: string;
}

export interface DashboardSummary {
  totalAgencies: number;
  activeStations: number;
  reportsToday: number;
  openIncidents: number;
  criticalIncidents: number;
  unacknowledgedReports: number;
}

export interface EmergencyActivityPoint {
  label: string;
  incidentCount: number;
}

export interface AdminReportSummary {
  id: string;
  publicReference: string;
  categoryId: string;
  categoryName: string;
  mode: ReportMode;
  severity: IncidentSeverity;
  status: ReportStatus;
  createdAt: string;
  targetAgencyTypes: AgencyType[];
  acknowledgementSlaState?: string;
  responseStartSlaState?: string;
}

export interface AdminReportDetails {
  id: string;
  publicReference: string;
  categoryId: string;
  categoryName: string;
  mode: ReportMode;
  severity: IncidentSeverity;
  status: ReportStatus;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  landmark?: string;
  locality?: string;
  district?: string;
  region?: string;
  vehicleRegistrationNumber?: string;
  vehicleType?: string;
  vehicleColour?: string;
  directionOfTravel?: string;
  createdAt: string;
  updatedAt: string;
  targetAgencyTypes: AgencyType[];
  statusHistory: Array<{
    status: ReportStatus;
    note?: string;
    timestamp: string;
  }>;
  attachments: ReportAttachment[];
  agencyAssignments: AgencyAssignment[];
}
