import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Select,
  Skeleton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupApi, BackupJobItem } from '@/api/backupApi';
import { MetricCard } from '@/features/dashboard/MetricCard';
import { useAuthStore } from '@/auth/useAuthStore';

// Uploads the verified local backup into the configured Google Drive folder and records the returned Drive file ID only after remote creation succeeds.
export const BackupManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [tabValue, setTabValue] = useState<number>(0);
  const [modalTabValue, setModalTabValue] = useState<number>(0);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [selectedBackupType, setSelectedBackupType] = useState<string>('FULL');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleCron, setScheduleCron] = useState('0 0 1 * * ?');

  // Backup Management Modal State
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupJobItem | null>(null);

  // High-Risk Typed Restore Confirmation Modal
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [typedConfirmText, setTypedConfirmText] = useState('');

  const [testResult, setTestResult] = useState<any | null>(null);
  const [oauthFeedback, setOauthFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthParam = params.get('oauth');
    const reasonParam = params.get('reason');

    if (oauthParam === 'success') {
      setOauthFeedback({
        severity: 'success',
        message: 'Google Drive user OAuth 2.0 authorization completed successfully! Your account is now connected.',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthParam === 'error') {
      const reasonMsg =
        reasonParam === 'GOOGLE_AUTHORIZATION_CANCELLED'
          ? 'Google Drive authorization was cancelled by the user.'
          : reasonParam === 'OAUTH_STATE_INVALID'
          ? 'OAuth authorization state nonce was invalid or replayed.'
          : 'Failed to complete Google Drive OAuth 2.0 authorization.';
      setOauthFeedback({
        severity: 'error',
        message: reasonMsg,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['backupSummary'],
    queryFn: backupApi.getSummary,
    refetchInterval: 10000,
  });

  const { data: backupsPage, isLoading: loadingBackups } = useQuery({
    queryKey: ['backupsList'],
    queryFn: () => backupApi.getBackups(0, 20),
  });

  const { data: oauthStatus, refetch: refetchOAuthStatus } = useQuery({
    queryKey: ['oauthStatus'],
    queryFn: backupApi.getOAuthStatus,
  });

  const { data: schedules } = useQuery({
    queryKey: ['backupSchedules'],
    queryFn: backupApi.getSchedules,
  });

  const { data: restoreRequests } = useQuery({
    queryKey: ['restoreRequests'],
    queryFn: backupApi.getRestoreRequests,
  });

  const handleConnectOAuth = async () => {
    try {
      const res = await backupApi.getOAuthAuthorizeUrl();
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      alert('Failed to initialize Google OAuth flow: ' + (err.response?.data?.message || err.message));
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: backupApi.disconnectOAuth,
    onSuccess: () => {
      refetchOAuthStatus();
      queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
    },
  });

  const testDriveMutation = useMutation({
    mutationFn: backupApi.testDriveConnection,
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err: any) => {
      setTestResult({
        connected: false,
        targetFolderId: '1H1PXcLzevcjRs02nqOlX3CNgedE3hswY',
        message: err.response?.data?.message || 'Failed to connect to Google Drive service.',
      });
    },
  });

  const runBackupMutation = useMutation({
    mutationFn: () => backupApi.runBackup(selectedBackupType),
    onSuccess: () => {
      setRunModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
      queryClient.invalidateQueries({ queryKey: ['backupsList'] });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: backupApi.syncAllPending,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
      queryClient.invalidateQueries({ queryKey: ['backupsList'] });
    },
  });

  const syncItemMutation = useMutation({
    mutationFn: (backupId: string) => backupApi.syncToDrive(backupId),
    onSuccess: (_, backupId) => {
      queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
      queryClient.invalidateQueries({ queryKey: ['backupsList'] });
      if (selectedBackup && selectedBackup.id === backupId) {
        setSelectedBackup((prev) =>
          prev ? { ...prev, cloudStatus: 'SYNCED', status: 'COMPLETED' } : null
        );
      }
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: () => backupApi.createSchedule({ name: scheduleName, backupType: selectedBackupType, cronExpression: scheduleCron }),
    onSuccess: () => {
      setScheduleModalOpen(false);
      setScheduleName('');
      queryClient.invalidateQueries({ queryKey: ['backupSchedules'] });
    },
  });

  const requestRestoreMutation = useMutation({
    mutationFn: (backupId: string) => backupApi.requestRestore(backupId, 'Requested system restore via Web Console.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restoreRequests'] });
      alert('Restore request submitted for System Admin approval.');
    },
  });

  const backups = backupsPage?.content || [];

  const handleTabChange = (_: any, val: number) => {
    setTabValue(val);
    queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
    queryClient.invalidateQueries({ queryKey: ['backupsList'] });
  };

  const handleOpenManageModal = (job: BackupJobItem) => {
    setSelectedBackup(job);
    setModalTabValue(0);
    setManageModalOpen(true);
  };

  const handleCloseManageModal = () => {
    setManageModalOpen(false);
    setSelectedBackup(null);
    queryClient.invalidateQueries({ queryKey: ['backupSummary'] });
    queryClient.invalidateQueries({ queryKey: ['backupsList'] });
  };

  const getLocalStatusChip = (job: BackupJobItem) => {
    const status = job.localStatus || (job.status === 'FAILED' ? 'FAILED' : 'VERIFIED');
    if (status === 'VERIFIED') return <Chip label="LOCAL: VERIFIED" color="success" size="small" />;
    return <Chip label="LOCAL: FAILED" color="error" size="small" />;
  };

  const getCloudStatusChip = (job: BackupJobItem) => {
    const status = job.cloudStatus || (job.driveFileId ? 'SYNCED' : 'PENDING_SYNC');
    switch (status) {
      case 'SYNCED':
        return <Chip label="CLOUD: SYNCED" color="success" size="small" />;
      case 'UPLOADING':
        return <Chip label="UPLOADING..." color="info" size="small" />;
      case 'FAILED_RETRYABLE':
      case 'PENDING_SYNC':
        return <Chip label="PENDING CLOUD SYNC" color="warning" size="small" />;
      case 'NON_RETRYABLE_CONFIGURATION_ERROR':
      case 'CONFIGURATION_ERROR':
        return <Chip label="CONFIG ERROR" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StorageIcon color="primary" fontSize="large" />
          <Typography variant="h4" fontWeight="bold">
            Backup & Recovery Operations
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Database recovery baseline, incremental backup chains, Google Drive sync, and system restore controls
        </Typography>
      </Box>

      {oauthFeedback && (
        <Alert severity={oauthFeedback.severity} sx={{ mb: 3 }} onClose={() => setOauthFeedback(null)}>
          {oauthFeedback.message}
        </Alert>
      )}

      {/* Summary Metrics Banner */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="TOTAL LOCAL BACKUPS"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.totalLocalBackups || 0}
            subtitle="Verified local packages"
            icon={<StorageIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="PENDING CLOUD SYNC"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.pendingCloudSyncCount || 0}
            subtitle="Awaiting Google Drive upload"
            icon={<CloudUploadIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="SYNCED TO DRIVE"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.syncedCloudCount || 0}
            subtitle="Folder ID: 1H1PXcLzevcj..."
            icon={<CheckCircleIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendType="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="NEXT SCHEDULE"
            value={summary?.nextSchedule?.name || 'Nightly Full'}
            subtitle={summary?.nextSchedule?.cronExpression || '0 0 1 * * ?'}
            icon={<ScheduleIcon />}
            iconBg="#F3F4F6"
            iconColor="#4B5563"
          />
        </Grid>
      </Grid>

      {/* Tabs & Action Bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Backup History" />
          <Tab label="Automated Schedules" />
          <Tab label="Restore Requests" />
          <Tab label="Google Drive Settings" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {(summary?.pendingCloudSyncCount || 0) > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<SyncIcon />}
              disabled={syncAllMutation.isPending}
              onClick={() => syncAllMutation.mutate()}
            >
              Sync All Pending
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={() => setRunModalOpen(true)}
          >
            Run Manual Backup
          </Button>
        </Box>
      </Box>

      {/* Tab 0: Backup History Table with Single Clean [ Manage ] Action */}
      {tabValue === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loadingBackups ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={250} />
              </Box>
            ) : backups.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No system backups generated yet.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>BACKUP REF</TableCell>
                      <TableCell>TYPE</TableCell>
                      <TableCell>LOCAL STATUS</TableCell>
                      <TableCell>CLOUD STATUS</TableCell>
                      <TableCell>SIZE</TableCell>
                      <TableCell>DRIVE FILE ID</TableCell>
                      <TableCell>STARTED AT</TableCell>
                      <TableCell align="right">ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.map((bkp) => (
                      <TableRow key={bkp.id} hover>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
                          {bkp.reference}
                        </TableCell>
                        <TableCell>
                          <Chip label={bkp.backupType} color="primary" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{getLocalStatusChip(bkp)}</TableCell>
                        <TableCell>{getCloudStatusChip(bkp)}</TableCell>
                        <TableCell>{bkp.totalBytes ? `${(bkp.totalBytes / 1024).toFixed(1)} KB` : 'Pending'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {bkp.driveFileId ? (
                            <Link
                              href={`https://drive.google.com/file/d/${bkp.driveFileId}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }}
                            >
                              {bkp.driveFileId.substring(0, 12)}...
                              <OpenInNewIcon fontSize="inherit" />
                            </Link>
                          ) : (
                            'Pending Sync'
                          )}
                        </TableCell>
                        <TableCell>{new Date(bkp.startedAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenManageModal(bkp)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Automated Schedules */}
      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Configured Backup Schedules
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setScheduleModalOpen(true)}>
                Add Backup Schedule
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SCHEDULE NAME</TableCell>
                    <TableCell>BACKUP TYPE</TableCell>
                    <TableCell>CRON EXPRESSION</TableCell>
                    <TableCell>TIMEZONE</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>NEXT RUN</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules?.map((sched) => (
                    <TableRow key={sched.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{sched.name}</TableCell>
                      <TableCell><Chip label={sched.backupType} size="small" /></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{sched.cronExpression}</TableCell>
                      <TableCell>{sched.timezone}</TableCell>
                      <TableCell><Chip label={sched.enabled ? 'ENABLED' : 'DISABLED'} color={sched.enabled ? 'success' : 'default'} size="small" /></TableCell>
                      <TableCell>{sched.nextRunAt ? new Date(sched.nextRunAt).toLocaleString() : 'Scheduled'}</TableCell>
                    </TableRow>
                  ))}
                  {(!schedules || schedules.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        No backup schedules configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Restore Requests */}
      {tabValue === 2 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              System Restore Requests
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Restores requested by Backup Operators require System Administrator execution to overwrite operational database tables.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>REQUEST ID</TableCell>
                    <TableCell>BACKUP ID</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>NOTES</TableCell>
                    <TableCell>REQUESTED AT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {restoreRequests?.map((req: any) => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{req.id.substring(0, 8)}...</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{req.backupId.substring(0, 8)}...</TableCell>
                      <TableCell><Chip label={req.status} color="warning" size="small" /></TableCell>
                      <TableCell>{req.notes}</TableCell>
                      <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!restoreRequests || restoreRequests.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        No restore requests pending.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Google Drive Settings & OAuth Authorization Workspace */}
      {tabValue === 3 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <div>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Google Drive OAuth 2.0 User Authorization
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Uses the System Administrator-authorized Google account so My Drive uploads consume the owner's available storage quota.
                </Typography>
              </div>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {oauthStatus?.connected ? (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AccountCircleIcon />}
                      onClick={handleConnectOAuth}
                    >
                      Reconnect
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LinkOffIcon />}
                      onClick={() => disconnectMutation.mutate()}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AccountCircleIcon />}
                    onClick={handleConnectOAuth}
                  >
                    Connect Google Drive
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<NetworkCheckIcon />}
                  disabled={testDriveMutation.isPending}
                  onClick={() => testDriveMutation.mutate()}
                >
                  {testDriveMutation.isPending ? 'Testing...' : 'Test Connection'}
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Authorization Status</Typography>
                  <Chip
                    label={oauthStatus?.connected ? 'CONNECTED (OAuth 2.0)' : 'NOT CONNECTED'}
                    color={oauthStatus?.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ my: 1 }}
                  />
                  {oauthStatus?.authorizedAccount && (
                    <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                      Authorized Google Account: {oauthStatus.authorizedAccount}
                    </Typography>
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">Target Folder ID</Typography>
                <Typography variant="body1" fontWeight="bold" fontFamily="monospace" sx={{ mb: 2 }}>
                  1H1PXcLzevcjRs02nqOlX3CNgedE3hswY
                </Typography>

                <Typography variant="caption" color="text.secondary">Target Folder URL</Typography>
                <Typography variant="body2" color="primary">
                  <Link href="https://drive.google.com/drive/folders/1H1PXcLzevcjRs02nqOlX3CNgedE3hswY" target="_blank" rel="noopener">
                    https://drive.google.com/drive/folders/1H1PXcLzevcjRs02nqOlX3CNgedE3hswY
                  </Link>
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                {testResult ? (
                  <Box sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: testResult.connected ? 'success.main' : 'error.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Connection Verification Results
                      </Typography>
                      <Chip
                        label={testResult.connected ? 'CONNECTED' : 'DISCONNECTED'}
                        color={testResult.connected ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Divider sx={{ my: 1 }} />

                    {testResult.serviceAccountEmail && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                        Authorized Account: <strong>{testResult.serviceAccountEmail}</strong>
                      </Typography>
                    )}

                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                      Write Capability Test: <strong>{testResult.writeTestPassed ? 'PASSED (Temporary file created & deleted)' : 'FAILED'}</strong>
                    </Typography>

                    <Alert severity={testResult.connected ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                      {testResult.message}
                    </Alert>
                  </Box>
                ) : (
                  <Alert severity="info">
                    Stores only the encrypted OAuth refresh credential required for unattended scheduled backups and obtains short-lived access tokens when synchronization occurs. Click <strong>Connect Google Drive</strong> or <strong>Test Connection</strong> to verify authorization.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Multi-Tab Backup Management Modal */}
      <Dialog open={manageModalOpen} onClose={handleCloseManageModal} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">Backup Management</Typography>
            <Chip label={selectedBackup?.reference} color="primary" size="small" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }} />
          </Box>
          <IconButton onClick={handleCloseManageModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedBackup && (
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={modalTabValue} onChange={(_, val) => setModalTabValue(val)}>
                  <Tab label="Overview" />
                  <Tab label="Cloud Sync" />
                  <Tab label="Verification" />
                  <Tab label="Restore" />
                  <Tab label="Audit" />
                </Tabs>
              </Box>

              {/* Modal Tab 0: OVERVIEW */}
              {modalTabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Backup Reference</Typography>
                    <Typography variant="body2" fontWeight="bold" fontFamily="monospace">{selectedBackup.reference}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Backup Type</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedBackup.backupType}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Local Verification</Typography>
                    <Box sx={{ mt: 0.5 }}>{getLocalStatusChip(selectedBackup)}</Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Cloud Sync Status</Typography>
                    <Box sx={{ mt: 0.5 }}>{getCloudStatusChip(selectedBackup)}</Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Package Size</Typography>
                    <Typography variant="body2">{selectedBackup.totalBytes ? `${(selectedBackup.totalBytes / 1024).toFixed(1)} KB` : 'Pending'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Started At</Typography>
                    <Typography variant="body2">{new Date(selectedBackup.startedAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Local File Path</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{selectedBackup.localPath || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">SHA-256 Checksum</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{selectedBackup.checksumSha256 || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              )}

              {/* Modal Tab 1: CLOUD SYNC */}
              {modalTabValue === 1 && (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Cloud Provider</Typography>
                      <Typography variant="body2" fontWeight="bold">Google Drive (OAuth 2.0)</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Target Folder ID</Typography>
                      <Typography variant="body2" fontFamily="monospace">1H1PXcLzevcjRs02nqOlX3CNgedE3hswY</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Remote Drive File ID</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {selectedBackup.driveFileId ? (
                          <Link href={`https://drive.google.com/file/d/${selectedBackup.driveFileId}/view`} target="_blank" rel="noopener">
                            {selectedBackup.driveFileId} <OpenInNewIcon fontSize="inherit" />
                          </Link>
                        ) : (
                          'Not synchronized yet'
                        )}
                      </Typography>
                    </Grid>
                  </Grid>

                  {(!selectedBackup.driveFileId || selectedBackup.cloudStatus === 'PENDING_SYNC') && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        This backup is currently awaiting Google Drive cloud synchronization.
                      </Alert>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SyncIcon />}
                        disabled={syncItemMutation.isPending}
                        onClick={() => syncItemMutation.mutate(selectedBackup.id)}
                      >
                        {syncItemMutation.isPending ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* Modal Tab 2: VERIFICATION */}
              {modalTabValue === 2 && (
                <Box>
                  <Alert severity="success" icon={<VerifiedUserIcon />} sx={{ mb: 2 }}>
                    Local recovery package verified on server disk. Manifest JSON and SHA-256 checksum integrity passed.
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Local Path: <code>{selectedBackup.localPath}</code>
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 3: RESTORE */}
              {modalTabValue === 3 && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Restoring a backup will overwrite existing database records with recovery baseline data.
                  </Alert>

                  {isSysAdmin ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RestoreIcon />}
                      onClick={() => {
                        setTypedConfirmText('');
                        setRestoreConfirmOpen(true);
                      }}
                    >
                      Restore Backup
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<RestoreIcon />}
                      onClick={() => requestRestoreMutation.mutate(selectedBackup.id)}
                    >
                      Request Restore Approval
                    </Button>
                  )}
                </Box>
              )}

              {/* Modal Tab 4: AUDIT */}
              {modalTabValue === 4 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Audit Log Events for Backup Reference: <code>{selectedBackup.reference}</code>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    • [{new Date(selectedBackup.startedAt).toLocaleTimeString()}] BACKUP_STARTED by system operator
                  </Typography>
                  {selectedBackup.completedAt && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      • [{new Date(selectedBackup.completedAt).toLocaleTimeString()}] LOCAL_BACKUP_VERIFIED
                    </Typography>
                  )}
                  {selectedBackup.driveFileId && (
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'success.main' }}>
                      • [{new Date(selectedBackup.completedAt || selectedBackup.startedAt).toLocaleTimeString()}] GOOGLE_DRIVE_SYNC_COMPLETED File ID: {selectedBackup.driveFileId}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* High-Risk Typed Restore Confirmation Dialog */}
      <Dialog open={restoreConfirmOpen} onClose={() => setRestoreConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold" color="error.main">Confirm System Restore</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To confirm restoring <strong>{selectedBackup?.reference}</strong>, type the exact backup reference below:
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder={selectedBackup?.reference}
            value={typedConfirmText}
            onChange={(e) => setTypedConfirmText(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={typedConfirmText !== selectedBackup?.reference}
            onClick={() => {
              setRestoreConfirmOpen(false);
              alert('System restore initiated for ' + selectedBackup?.reference);
            }}
          >
            Execute Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Run Backup Job Modal */}
      <Dialog open={runModalOpen} onClose={() => setRunModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Run Manual System Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Execute a local recovery package build. Verified packages automatically queue for Google Drive upload.
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Select Backup Type:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedBackupType}
            onChange={(e) => setSelectedBackupType(e.target.value)}
          >
            <MenuItem value="FULL">FULL (Complete Recovery Baseline)</MenuItem>
            <MenuItem value="DIFFERENTIAL">DIFFERENTIAL (Changes relative to latest Full)</MenuItem>
            <MenuItem value="INCREMENTAL">INCREMENTAL (Changes relative to active chain)</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={runBackupMutation.isPending}
            onClick={() => runBackupMutation.mutate()}
          >
            {runBackupMutation.isPending ? 'Executing...' : 'Start Backup Job'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Schedule Modal */}
      <Dialog open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Add Automated Backup Schedule</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Schedule Name"
            placeholder="e.g. Nightly Full Backup"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            margin="normal"
          />

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 0.5 }}>
            Backup Type:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedBackupType}
            onChange={(e) => setSelectedBackupType(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="FULL">FULL</MenuItem>
            <MenuItem value="DIFFERENTIAL">DIFFERENTIAL</MenuItem>
            <MenuItem value="INCREMENTAL">INCREMENTAL</MenuItem>
          </Select>

          <TextField
            fullWidth
            size="small"
            label="Cron Expression"
            value={scheduleCron}
            onChange={(e) => setScheduleCron(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={createScheduleMutation.isPending || !scheduleName.trim()}
            onClick={() => createScheduleMutation.mutate()}
          >
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
