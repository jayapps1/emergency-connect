import React, { useState } from 'react';
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
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import ShieldIcon from '@mui/icons-material/Shield';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import WarningIcon from '@mui/icons-material/Warning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '@/api/reportApi';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/auth/useAuthStore';
import { AgencyType, ReportStatus } from '@/types';

export const ReportDetailsPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptNote, setPromptNote] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetAgency, setTargetAgency] = useState<AgencyType>('POLICE');
  const [transferNote, setTransferNote] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reportDetails', reportId],
    queryFn: () => reportApi.getReportDetails(reportId!),
    enabled: Boolean(reportId),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => reportApi.acknowledgeReport(reportId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', reportId] });
      setSuccessMsg('Incident acknowledged successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to acknowledge report.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ReportStatus) => reportApi.updateReportStatus(reportId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', reportId] });
      setSuccessMsg('Incident status updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to update report status.');
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => reportApi.transferReport(reportId!, { targetAgencyType: targetAgency, note: transferNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', reportId] });
      setTransferOpen(false);
      setTransferNote('');
      setSuccessMsg(`Incident transferred to ${targetAgency}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to transfer report.');
    },
  });

  const promptMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => reportApi.promptAgency(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', reportId] });
      setPromptOpen(false);
      setPromptNote('');
      setSuccessMsg('Oversight reminder prompt sent to responsible agency.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to send oversight prompt.');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Report not found.</Alert>
      </Box>
    );
  }

  const mapUrl =
    report.latitude && report.longitude
      ? `https://maps.google.com/?q=${report.latitude},${report.longitude}`
      : null;

  const isOutsideGhana =
    report.latitude != null &&
    report.longitude != null &&
    (report.latitude < 4.5 ||
      report.latitude > 11.5 ||
      report.longitude < -3.5 ||
      report.longitude > 1.5);

  const hasVehicleInfo = Boolean(
    report.vehicleRegistrationNumber ||
      report.vehicleType ||
      report.vehicleColour ||
      report.directionOfTravel
  );

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    promptMutation.mutate({ id: report.id, note: promptNote });
  };

  const handleSendTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate();
  };

  const currentStatus = report.status;
  const isResolved = currentStatus === 'RESOLVED';

  // Calculate elapsed time in minutes
  const submittedAtDate = new Date(report.createdAt);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - submittedAtDate.getTime()) / 60000));

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/reports')}>
          Back to Reports
        </Button>

        {isSysAdmin && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<NotificationsActiveIcon />}
            onClick={() => setPromptOpen(true)}
          >
            Prompt Responsible Agency
          </Button>
        )}
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          {/* Main Incident Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Public Reference
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                {report.publicReference}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, my: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`Status: ${report.status}`}
                  color={report.status === 'RESOLVED' ? 'success' : report.status === 'IN_PROGRESS' ? 'warning' : 'primary'}
                />
                <Chip label={`Severity: ${report.severity}`} color={report.severity === 'CRITICAL' ? 'error' : 'default'} />
                <Chip label={`Mode: ${report.mode}`} variant="outlined" />
                <Chip label={`Elapsed: ${elapsedMinutes} mins`} variant="outlined" />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Category: <strong>{report.categoryName}</strong> | Created: <strong>{submittedAtDate.toLocaleString()}</strong>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Description Notes
              </Typography>
              <Typography variant="body1" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                {report.description || 'No description provided.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Operational Action Controls for Responsible Agency Staff */}
          {!isSysAdmin && (
            <Card sx={{ mb: 3, border: '1px solid', borderColor: isResolved ? 'success.main' : 'primary.main' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Operational Control Actions
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                {isResolved ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 2 }}>
                    <LockIcon color="inherit" />
                    <div>
                      <Typography variant="subtitle2" fontWeight="bold">
                        ✓ Incident Resolved and Locked
                      </Typography>
                      <Typography variant="caption">
                        This agency assignment has been completed and locked against further modifications.
                      </Typography>
                    </div>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {(currentStatus === 'SUBMITTED' || currentStatus === 'RECEIVED' || currentStatus === 'ASSIGNED') && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => acknowledgeMutation.mutate()}
                        disabled={acknowledgeMutation.isPending}
                      >
                        {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge Incident'}
                      </Button>
                    )}

                    {currentStatus === 'ACKNOWLEDGED' && (
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => updateStatusMutation.mutate('IN_PROGRESS')}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? 'Updating...' : 'Start Action (In Progress)'}
                      </Button>
                    )}

                    {currentStatus === 'IN_PROGRESS' && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => updateStatusMutation.mutate('RESOLVED')}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? 'Resolving...' : 'Mark Incident Resolved'}
                      </Button>
                    )}

                    {(currentStatus === 'ACKNOWLEDGED' || currentStatus === 'IN_PROGRESS') && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<SendIcon />}
                        onClick={() => setTransferOpen(true)}
                      >
                        Transfer / Escalating Agency
                      </Button>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Evidence Attachments Section */}
          {report.attachments && report.attachments.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Attached Photo & Video Evidence ({report.attachments.length})
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={2}>
                  {report.attachments.map((att) => {
                    const mediaUrl = `/api/v1/admin/reports/${report.id}/attachments/${att.id}`;
                    return (
                      <Grid item xs={12} sm={6} key={att.id}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {att.mediaType === 'IMAGE' ? (
                              <PhotoCameraIcon color="primary" fontSize="small" />
                            ) : (
                              <VideocamIcon color="secondary" fontSize="small" />
                            )}
                            <Typography variant="caption" fontWeight="bold" noWrap>
                              {att.originalFileName || `${att.mediaType} Evidence`}
                            </Typography>
                          </Box>

                          {att.mediaType === 'IMAGE' ? (
                            <Box
                              component="img"
                              src={mediaUrl}
                              alt="Emergency Evidence Photo"
                              onClick={() => setPreviewImageUrl(mediaUrl)}
                              sx={{
                                width: '100%',
                                height: 160,
                                objectFit: 'cover',
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.9 },
                              }}
                            />
                          ) : (
                            <Box
                              component="video"
                              controls
                              src={mediaUrl}
                              sx={{
                                width: '100%',
                                height: 160,
                                borderRadius: 1.5,
                                bgcolor: 'black',
                              }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Size: {(att.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Info */}
          {hasVehicleInfo && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Vehicle Information
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Plate Number</Typography>
                    <Typography variant="body2" fontWeight="bold">{report.vehicleRegistrationNumber || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Vehicle Type</Typography>
                    <Typography variant="body2" fontWeight="bold">{report.vehicleType || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Colour</Typography>
                    <Typography variant="body2" fontWeight="bold">{report.vehicleColour || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Direction of Travel</Typography>
                    <Typography variant="body2" fontWeight="bold">{report.directionOfTravel || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Location Details */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Location Details
                </Typography>
                {mapUrl && (
                  <Link href={mapUrl} target="_blank" rel="noopener" underline="none">
                    <Button size="small" startIcon={<MapIcon />}>Open in Map</Button>
                  </Link>
                )}
              </Box>
              <Divider sx={{ my: 1.5 }} />

              {report.latitude && report.longitude ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon color="primary" />
                    <Typography variant="body2">
                      Coordinates: <strong>{report.latitude}, {report.longitude}</strong>
                      {report.locationAccuracyMeters && ` (±${report.locationAccuracyMeters}m)`}
                    </Typography>
                  </Box>
                  {isOutsideGhana && (
                    <Box sx={{ mt: 1.5 }}>
                      <Chip
                        icon={<WarningIcon />}
                        label="⚠ Location appears outside Ghana (e.g. Test / Emulator Location)"
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No GPS coordinates attached.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          {/* Target Agencies / Per-Agency Assignments */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Responsible Agency Assignments
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {report.agencyAssignments && report.agencyAssignments.length > 0 ? (
                  report.agencyAssignments.map((assignment) => (
                    <Box key={assignment.assignmentId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {assignment.agencyName}
                        </Typography>
                        <Chip
                          label={assignment.status}
                          size="small"
                          color={assignment.status === 'RESOLVED' ? 'success' : assignment.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                        />
                      </Box>
                      {assignment.stationName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Station: <strong>{assignment.stationName}</strong>
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Assigned: {new Date(assignment.assignedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  report.targetAgencyTypes?.map((agency) => (
                    <Chip
                      key={agency}
                      icon={<ShieldIcon />}
                      label={agency}
                      color="primary"
                      variant="outlined"
                      sx={{ justifyContent: 'flex-start', py: 2 }}
                    />
                  ))
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Status History Timeline */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Status History Timeline
              </Typography>
              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {report.statusHistory?.map((hist, idx) => (
                  <Box key={idx} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {hist.status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(hist.timestamp).toLocaleString()}
                    </Typography>
                    {hist.note && (
                      <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                        {hist.note}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Admin Prompt Agency Dialog */}
      <Dialog open={promptOpen} onClose={() => setPromptOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSendPrompt}>
          <DialogTitle>Issue System Oversight Reminder</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Send an oversight prompt to the responsible agency to request immediate acknowledgement or dispatch update.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Oversight Reminder Note"
              placeholder="e.g. High severity report waiting acknowledgment over 15 minutes. Please review immediately."
              value={promptNote}
              onChange={(e) => setPromptNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPromptOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={promptMutation.isPending}>
              {promptMutation.isPending ? 'Sending...' : 'Send Reminder Prompt'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Transfer Incident Dialog */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSendTransfer}>
          <DialogTitle>Transfer / Escalate Incident</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Transfer this incident to another agency for joint multi-agency emergency response.
            </Typography>

            <TextField
              select
              fullWidth
              label="Target Agency Type"
              value={targetAgency}
              onChange={(e) => setTargetAgency(e.target.value as AgencyType)}
              margin="normal"
            >
              <MenuItem value="POLICE">Ghana Police Service</MenuItem>
              <MenuItem value="FIRE">Ghana National Fire Service</MenuItem>
              <MenuItem value="AMBULANCE">National Ambulance Service</MenuItem>
              <MenuItem value="DISASTER_MANAGEMENT">NADMO</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Transfer Note"
              placeholder="Reason for transfer or escalation..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Full Size Image Preview Dialog */}
      <Dialog open={Boolean(previewImageUrl)} onClose={() => setPreviewImageUrl(null)} maxWidth="md">
        <Box sx={{ position: 'relative', bgcolor: 'black', p: 1 }}>
          <IconButton
            onClick={() => setPreviewImageUrl(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {previewImageUrl && (
            <Box
              component="img"
              src={previewImageUrl}
              alt="Full size evidence"
              sx={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: 'auto' }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};
