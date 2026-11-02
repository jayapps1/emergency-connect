import { apiClient } from './client';
import { Page } from '@/types';

export interface BackupJobItem {
  id: string;
  reference: string;
  backupType: 'FULL' | 'DIFFERENTIAL' | 'INCREMENTAL';
  status: 'RUNNING' | 'LOCAL_COMPLETE' | 'PENDING_CLOUD_SYNC' | 'COMPLETED' | 'FAILED' | 'VERIFICATION_FAILED';
  localStatus?: 'VERIFIED' | 'FAILED' | 'LOCAL_MISSING';
  cloudStatus?: 'SYNCED' | 'PENDING_SYNC' | 'UPLOADING' | 'FAILED_RETRYABLE' | 'CONFIGURATION_ERROR' | 'NON_RETRYABLE_CONFIGURATION_ERROR';
  localPath?: string;
  totalBytes?: number;
  checksumSha256?: string;
  parentReference?: string;
  chainId?: string;
  driveFileId?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  createdBy?: string;
}

export interface BackupScheduleItem {
  id: string;
  name: string;
  backupType: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  cloudSyncEnabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface BackupSummary {
  totalLocalBackups: number;
  pendingCloudSyncCount: number;
  syncedCloudCount: number;
  lastSuccessfulBackup?: BackupJobItem;
  nextSchedule?: BackupScheduleItem;
}

export const backupApi = {
  getSummary: async (): Promise<BackupSummary> => {
    const res = await apiClient.get<BackupSummary>('/api/v1/admin/backups/summary');
    return res.data;
  },

  getBackups: async (page = 0, size = 10): Promise<Page<BackupJobItem>> => {
    const res = await apiClient.get<Page<BackupJobItem>>('/api/v1/admin/backups', {
      params: { page, size, sort: 'createdAt,desc' },
    });
    return res.data;
  },

  runBackup: async (backupType: string): Promise<BackupJobItem> => {
    const res = await apiClient.post<BackupJobItem>('/api/v1/admin/backups/run', { backupType });
    return res.data;
  },

  getSchedules: async (): Promise<BackupScheduleItem[]> => {
    const res = await apiClient.get<BackupScheduleItem[]>('/api/v1/admin/backups/schedules');
    return res.data;
  },

  createSchedule: async (data: { name: string; backupType: string; cronExpression: string; cloudSyncEnabled?: boolean }): Promise<BackupScheduleItem> => {
    const res = await apiClient.post<BackupScheduleItem>('/api/v1/admin/backups/schedules', data);
    return res.data;
  },

  syncToDrive: async (backupId: string): Promise<{ backupId: string; synced: boolean }> => {
    const res = await apiClient.post(`/api/v1/admin/backups/${backupId}/sync`);
    return res.data;
  },

  syncAllPending: async (): Promise<{ syncedCount: number }> => {
    const res = await apiClient.post<{ syncedCount: number }>('/api/v1/admin/backups/sync-all-pending');
    return res.data;
  },

  getOAuthAuthorizeUrl: async (): Promise<{ authorizationUrl: string }> => {
    const res = await apiClient.get<{ authorizationUrl: string }>('/api/v1/admin/backups/oauth/authorize');
    return res.data;
  },

  getOAuthStatus: async (): Promise<{
    connected: boolean;
    authorizedAccount?: string;
    targetFolderId: string;
    connectedAt?: string;
  }> => {
    const res = await apiClient.get('/api/v1/admin/backups/oauth/status');
    return res.data;
  },

  disconnectOAuth: async (): Promise<void> => {
    await apiClient.post('/api/v1/admin/backups/oauth/disconnect');
  },

  testDriveConnection: async (): Promise<{
    connected: boolean;
    targetFolderId: string;
    folderName?: string;
    serviceAccountEmail?: string;
    writeTestPassed?: boolean;
    message: string;
  }> => {
    const res = await apiClient.post('/api/v1/admin/backups/test-drive-connection');
    return res.data;
  },

  getRestoreRequests: async (): Promise<any[]> => {
    const res = await apiClient.get('/api/v1/admin/backups/restore-requests');
    return res.data;
  },

  requestRestore: async (backupId: string, notes?: string): Promise<any> => {
    const res = await apiClient.post('/api/v1/admin/backups/restore-requests', null, {
      params: { backupId, notes },
    });
    return res.data;
  },
};
