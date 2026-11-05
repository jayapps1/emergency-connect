export type StaffRole =
  | 'SYSTEM_ADMIN'
  | 'AGENCY_ADMIN'
  | 'REGIONAL_ADMIN'
  | 'STATION_ADMIN'
  | 'CONTROL_ROOM_OPERATOR'
  | 'REPORT_REVIEWER'
  | 'AUDITOR'
  | 'RESPONDER';

export type ReportMode = 'SILENT' | 'GENERAL' | 'CALL';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_COMPLETED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'TRANSFERRED';

export type AgencyType =
  | 'POLICE'
  | 'FIRE'
  | 'AMBULANCE'
  | 'DISASTER_MANAGEMENT'
  | 'OTHER';

export type StationLevel =
  | 'NATIONAL_HQ'
  | 'REGIONAL_COMMAND'
  | 'DIVISIONAL_HQ'
  | 'DISTRICT_STATION'
  | 'LOCAL_POST';

export type StationContactType =
  | 'PRIMARY_DISPATCH'
  | 'HOTLINE'
  | 'STATION_COMMANDER'
  | 'DUTY_OFFICER'
  | 'ALT_DISPATCH'
  | 'WATCHROOM';

export interface AdminUser {
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
  priorityLevel?: number;
  active: boolean;
  locked: boolean;
  mustChangePassword?: boolean;
  totpEnabled?: boolean;
  lastLoginAt?: string;
  roles: string[];
  permissions?: string[];
}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds?: number;
  user: AdminUser;
  roles: string[];
  permissions: string[];
  authenticationState?: string;
  mfaChallenge?: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  agencyId?: string;
  details?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogItem extends AuditLog {}

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
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  verified?: boolean;
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
  unread?: boolean;
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
  statusHistory?: {
    status: ReportStatus;
    note?: string;
    timestamp: string;
  }[];
  attachments?: ReportAttachment[];
  agencyAssignments?: AgencyAssignment[];
  reporterPublicReference?: string;
  reporterPhone?: string;
  reporterName?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
