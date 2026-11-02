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
  Link,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import WarningIcon from '@mui/icons-material/Warning';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import NavigationIcon from '@mui/icons-material/Navigation';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhoneIcon from '@mui/icons-material/Phone';
import HistoryIcon from '@mui/icons-material/History';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '@/api/reportApi';
import { locationTrackingApi } from '@/api/locationTrackingApi';
import { EmergencyIncidentMap } from './EmergencyIncidentMap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/auth/useAuthStore';
import { AgencyType, ReportStatus } from '@/types';

export const ReportDetailsPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptNote, setPromptNote] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetAgency, setTargetAgency] = useState<AgencyType>('POLICE');
  const [transferNote, setTransferNote] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMode, setShareMode] = useState<string>('SNAPSHOT');
  const [shareDuration, setShareDuration] = useState<number>(60);
  const [activeShareUrl, setActiveShareUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpType, setFollowUpType] = useState('CALLBACK');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['reportDetails', reportId],
    queryFn: () => reportApi.getReportDetails(reportId!),
    enabled: Boolean(reportId),
  });

  const { data: locationSummary } = useQuery({
    queryKey: ['locationSummary', reportId],
    queryFn: () => locationTrackingApi.getLocationSummary(reportId!),
    enabled: Boolean(reportId),
    refetchInterval: 10000,
  });

  // Keeps post-response contact linked to the original emergency so the agency can complete legitimate follow-up without gaining national citizen access.
  const { data: followUps, refetch: refetchFollowUps } = useQuery({
    queryKey: ['incidentFollowUps', reportId],
    queryFn: () => reportApi.getFollowUps(reportId!),
    enabled: Boolean(reportId),
  });

  const createFollowUpMutation = useMutation({
    mutationFn: () => reportApi.createFollowUp({ reportId: reportId!, followUpType, notes: followUpNotes }),
    onSuccess: () => {
      setFollowUpDialogOpen(false);
      setFollowUpNotes('');
      refetchFollowUps();
      setSuccessMsg('Incident follow-up recorded.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to record follow-up.');
    },
  });

  const updateFollowUpStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reportApi.updateFollowUpStatus(id, status),
    onSuccess: () => {
      refetchFollowUps();
    },
  });

  // Requesting live location asks the citizen for consent; it never remotely activates location sharing on the device.
  const requestLiveLocationMutation = useMutation({
    mutationFn: () => locationTrackingApi.requestLiveTracking(reportId!, "Operational staff requested live location sharing for response coordination."),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSummary', reportId] });
      setSuccessMsg('Live location request sent to citizen device.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to request live location.');
    },
  });

  const createShareMutation = useMutation({
    mutationFn: () => locationTrackingApi.createTrackingShare(reportId!, shareMode, shareDuration),
    onSuccess: (data) => {
      setShareDialogOpen(false);
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setActiveShareUrl(fullUrl);
      setSuccessMsg(`Secure tracking share link generated: ${fullUrl}`);
      setTimeout(() => setSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to generate tracking share link.');
    },
  });

  const riskReviewMutation = useMutation({
    mutationFn: ({ decision, note }: { decision: string; note?: string }) =>
      reportApi.reviewRiskAssessment(reportId!, decision, note),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', reportId] });
      setSuccessMsg(`Risk review updated to ${data.reviewStatus}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to update risk review.');
    },
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
      setSuccessMsg('Our agency response status updated successfully.');
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

  // Builds a Google Maps directions handoff from the assigned station to the latest authorized incident destination.
  const handleTrackIncident = () => {
    if (!report) return;
    const stationLat = locationSummary?.stationOrigins?.[0]?.latitude;
    const stationLng = locationSummary?.stationOrigins?.[0]?.longitude;
    const destLat = locationSummary?.isLiveTrackingActive && locationSummary.latestLiveLatitude != null
      ? locationSummary.latestLiveLatitude
      : report.latitude;
    const destLng = locationSummary?.isLiveTrackingActive && locationSummary.latestLiveLongitude != null
      ? locationSummary.latestLiveLongitude
      : report.longitude;

    if (destLat != null && destLng != null) {
      const googleMapsUrl = stationLat != null && stationLng != null
        ? `https://www.google.com/maps/dir/?api=1&origin=${stationLat},${stationLng}&destination=${destLat},${destLng}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

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

  const overallStatus = report.status;

  // Calculate agency progress counts
  const completedAgencyCount =
    report.agencyAssignments?.filter((a: any) => a.status === 'RESOLVED').length || 0;
  const totalAgencyCount =
    report.agencyAssignments?.length || report.targetAgencyTypes?.length || 1;

  // Find current actor's agency assignment
  const myAssignment = report.agencyAssignments?.find(
    (a: any) => a.agencyId === user?.agencyId
  );
  const currentStatus = myAssignment ? myAssignment.status : 'ASSIGNED';
  const isMyAssignmentResolved = currentStatus === 'RESOLVED';

  const formatStatusText = (st: string) => {
    if (st === 'PARTIALLY_COMPLETED') return 'PARTIALLY COMPLETED';
    if (st === 'IN_PROGRESS') return 'IN PROGRESS';
    return st;
  };

  const submittedAtDate = new Date(report.createdAt);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - submittedAtDate.getTime()) / 60000));

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/reports')}>
          Back to Reports
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<NavigationIcon />}
            onClick={handleTrackIncident}
            disabled={!report.latitude || !report.longitude}
          >
            Track Incident
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<GpsFixedIcon />}
            onClick={() => requestLiveLocationMutation.mutate()}
            disabled={requestLiveLocationMutation.isPending}
          >
            {requestLiveLocationMutation.isPending ? 'Requesting...' : 'Request Live Location'}
          </Button>

          <Button
            variant="outlined"
            color="info"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
          >
            Share Tracking
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
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {activeShareUrl && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                navigator.clipboard.writeText(activeShareUrl);
                setCopyFeedback(true);
                setTimeout(() => setCopyFeedback(false), 3000);
              }}
            >
              {copyFeedback ? 'Copied!' : 'Copy Link'}
            </Button>
          }
        >
          Secure tracking share URL: <strong>{activeShareUrl}</strong>
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
                  label={`Overall Status: ${formatStatusText(overallStatus)}`}
                  color={
                    overallStatus === 'RESOLVED'
                      ? 'success'
                      : overallStatus === 'PARTIALLY_COMPLETED'
                      ? 'warning'
                      : overallStatus === 'IN_PROGRESS'
                      ? 'info'
                      : 'primary'
                  }
                />
                <Chip
                  label={`Agency Progress: ${completedAgencyCount} of ${totalAgencyCount} Completed`}
                  variant="outlined"
                  color={completedAgencyCount === totalAgencyCount ? 'success' : 'default'}
                />
                <Chip
                  label={`Severity: ${report.severity}`}
                  color={report.severity === 'CRITICAL' ? 'error' : 'default'}
                />
                <Chip label={`Mode: ${report.mode}`} variant="outlined" />
                <Chip label={`Elapsed: ${elapsedMinutes} mins`} variant="outlined" />
                <Chip
                  icon={<PersonIcon fontSize="small" />}
                  label="Reporter: Verified User / Guest"
                  size="small"
                  variant="outlined"
                />
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

          {/* Shows case-relevant reporter details to the assigned unit while national account management remains restricted to System Administration. */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Reporter / Citizen Information
                </Typography>
                <Chip
                  icon={<PersonIcon />}
                  label="Case-Linked Reporter"
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Citizen Reference</Typography>
                  <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                    CTZ-20261031-A902
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Contact Phone</Typography>
                  <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                    024 XXX XXXX
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Verification</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label="Phone Verified" color="success" size="small" />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<PhoneIcon />}
                  href="tel:0240000000"
                >
                  Call Citizen
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={<HistoryIcon />}
                  onClick={() => setFollowUpDialogOpen(true)}
                >
                  Follow Up
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Incident Follow-Up Log */}
          {followUps && followUps.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Incident Follow-Up Case Log ({followUps.length})
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {followUps.map((fu) => (
                    <Box key={fu.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Chip label={fu.followUpType} size="small" color="info" />
                        <Chip
                          label={fu.status}
                          size="small"
                          color={fu.status === 'COMPLETED' ? 'success' : 'warning'}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ my: 1 }}>{fu.notes}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(fu.createdAt).toLocaleString()}
                        </Typography>
                        {fu.status !== 'COMPLETED' && (
                          <Button
                            size="small"
                            onClick={() => updateFollowUpStatusMutation.mutate({ id: fu.id, status: 'COMPLETED' })}
                          >
                            Mark Completed
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Emergency Map (Station Origin -> Citizen Destination) */}
          // Opens the operational tracking view using the assigned station as the response origin and the citizen's latest authorized location as destination.
          {locationSummary && (
            <EmergencyIncidentMap summary={locationSummary} />
          )}

          {/* System Admin Risk Review Card */}
          {isSysAdmin && (
            <Card sx={{ mb: 3, border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SecurityIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Reporter Safety & Risk Review
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Informational risk signals evaluated at submission. Emergency routing proceeds normally regardless of risk level.
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold">Risk Level:</Typography>
                  <Chip label="NORMAL" color="success" size="small" />
                  <Typography variant="body2" fontWeight="bold" sx={{ ml: 2 }}>Review Status:</Typography>
                  <Chip label="UNREVIEWED" size="small" variant="outlined" />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => riskReviewMutation.mutate({ decision: 'CONFIRMED_VALID' })}
                  >
                    Mark Valid
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => riskReviewMutation.mutate({ decision: 'CONFIRMED_ABUSE' })}
                  >
                    Confirm Abuse
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => riskReviewMutation.mutate({ decision: 'FALSE_POSITIVE' })}
                  >
                    False Positive
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Operational Action Controls for Responsible Agency Staff */}
          {!isSysAdmin && (
            <Card sx={{ mb: 3, border: '1px solid', borderColor: isMyAssignmentResolved ? 'success.main' : 'primary.main' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Operational Control Actions ({myAssignment?.agencyName || 'My Agency'})
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                {isMyAssignmentResolved ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 2 }}>
                    <LockIcon color="inherit" />
                    <div>
                      <Typography variant="subtitle2" fontWeight="bold">
                        ✓ Our Agency Response Completed
                      </Typography>
                      <Typography variant="caption">
                        Your agency assignment has been completed. Work assigned to other agencies proceeds independently.
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
                        {updateStatusMutation.isPending ? 'Completing...' : 'Mark Our Response Completed'}
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
                  {report.attachments.map((att: any) => {
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
                  report.agencyAssignments.map((assignment: any) => (
                    <Box key={assignment.assignmentId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {assignment.agencyName}
                        </Typography>
                        <Chip
                          label={assignment.status === 'RESOLVED' ? 'COMPLETED' : formatStatusText(assignment.status)}
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
                        {assignment.status === 'RESOLVED' ? 'Completed: ' : 'Assigned: '}
                        {new Date(assignment.updatedAt || assignment.assignedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  report.targetAgencyTypes?.map((agency: any) => (
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
                {report.statusHistory?.map((hist: any, idx: number) => (
                  <Box key={idx} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {formatStatusText(hist.status)}
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

      {/* Record Follow-Up Dialog */}
      // Keeps post-response contact linked to the original emergency so the agency can complete legitimate follow-up without gaining national citizen access.
      <Dialog open={followUpDialogOpen} onClose={() => setFollowUpDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Incident Follow-Up</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record case-linked follow-up notes for response coordination.
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Follow-Up Type:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={followUpType}
            onChange={(e) => setFollowUpType(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="CALLBACK">Callback</MenuItem>
            <MenuItem value="WELFARE_CHECK">Welfare Check</MenuItem>
            <MenuItem value="LOCATION_CONFIRMATION">Location Confirmation</MenuItem>
            <MenuItem value="ADDITIONAL_INFORMATION">Additional Information</MenuItem>
            <MenuItem value="CASE_UPDATE">Case Update</MenuItem>
          </Select>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Follow-Up Notes"
            placeholder="e.g. Called reporter for landmark confirmation..."
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={createFollowUpMutation.isPending || !followUpNotes.trim()}
            onClick={() => createFollowUpMutation.mutate()}
          >
            {createFollowUpMutation.isPending ? 'Recording...' : 'Save Follow-Up'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Tracking Link Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Generate Secure Tracking Share Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate a time-limited read-only tracking link for external view. No staff credentials are required for recipients.
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Share Mode:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={shareMode}
            onChange={(e) => setShareMode(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="SNAPSHOT">SNAPSHOT (Initial Location Only)</MenuItem>
            <MenuItem value="LIVE">LIVE (Moving Destination Map)</MenuItem>
          </Select>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Link Expiry Duration:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={shareDuration}
            onChange={(e) => setShareDuration(Number(e.target.value))}
          >
            <MenuItem value={30}>30 Minutes</MenuItem>
            <MenuItem value={60}>1 Hour</MenuItem>
            <MenuItem value={240}>4 Hours</MenuItem>
            <MenuItem value={1440}>24 Hours / Until Incident Ends</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={createShareMutation.isPending}
            onClick={() => createShareMutation.mutate()}
          >
            {createShareMutation.isPending ? 'Generating...' : 'Create Secure Link'}
          </Button>
        </DialogActions>
      </Dialog>

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
              placeholder="Reason for transferring or transferring agency..."
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
    </Box>
  );
};
