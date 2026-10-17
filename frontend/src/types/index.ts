export type AgencyType = 'FIRE' | 'POLICE' | 'AMBULANCE' | 'DISASTER_MANAGEMENT' | 'OTHER';

export type StationContactType = 'WATCHROOM' | 'CONTROL_ROOM' | 'EMERGENCY' | 'ALTERNATIVE' | 'ADMINISTRATIVE' | 'OTHER';

export type StationLevel = 'NHQ' | 'RHQ' | 'DISTRICT_STATION';

export type ReportMode = 'SILENT' | 'GENERAL';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'TRANSFERRED';

export interface Agency {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  emergencyNumber?: string;
  active: boolean;
  verified: boolean;
}

export interface Station {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  stationLevel?: StationLevel;
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

export interface RegionRef {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface DistrictRef {
  id: string;
  regionId: string;
  code: string;
  name: string;
  assemblyType: string;
  active: boolean;
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
  statusHistory: {
    status: ReportStatus;
    note?: string;
    timestamp: string;
  }[];
  attachments?: ReportAttachment[];
  agencyAssignments?: AgencyAssignment[];
}

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
  active: boolean;
  locked: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  roles: string[];
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  systemRole: boolean;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  agencyId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AdminUser;
  roles: string[];
  permissions: string[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
