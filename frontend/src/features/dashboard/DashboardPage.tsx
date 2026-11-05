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
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Rating,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import StarIcon from '@mui/icons-material/Star';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '@/api/reportApi';
import { stationApi } from '@/api/stationApi';
import { agencyApi } from '@/api/agencyApi';
import { applianceApi } from '@/api/applianceApi';
import { reviewApi } from '@/api/reviewApi';
import { dashboardApi } from '@/api/dashboardApi';
import { userApi } from '@/api/userApi';
import { MetricCard } from './MetricCard';
import { AgencyPerformanceCard } from './AgencyPerformanceCard';
import { RequiresAttentionPanel } from './RequiresAttentionPanel';
import { EmergencyActivityChart } from './EmergencyActivityChart';
import { useAuthStore } from '@/auth/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { AdminUser } from '@/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission, hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const isAgencyLeadP1 =
    (hasRole('AGENCY_ADMIN') || hasRole('ROLE_AGENCY_ADMIN')) && user?.priorityLevel === 1;

  const canManagePrioritiesOnDashboard = isSysAdmin || isAgencyLeadP1;

  // Manage Staff Priorities Modal States
  const [managePrioritiesModalOpen, setManagePrioritiesModalOpen] = useState(false);
  const [priorityGroupAgencyId, setPriorityGroupAgencyId] = useState('ALL');
  const [priorityGroupRole, setPriorityGroupRole] = useState('AGENCY_ADMIN');
  const [assignPriorityDialogOpen, setAssignPriorityDialogOpen] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<AdminUser | null>(null);
  const [assignPriorityVal, setAssignPriorityVal] = useState<number | null>(2);

  // Transfer Leadership Modal States
  const [transferLeadershipOpen, setTransferLeadershipOpen] = useState(false);
  const [transferRecipientId, setTransferRecipientId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const { data: dashboardSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
    enabled: hasPermission('REPORT_READ'),
  });

  const { data: reportsPage, isLoading: loadingReports } = useQuery({
    queryKey: ['dashboardReports'],
    queryFn: () => reportApi.getReports(0, 100),
    enabled: hasPermission('REPORT_READ'),
  });

  const { data: stationsPage, isLoading: loadingStations } = useQuery({
    queryKey: ['dashboardStations'],
    queryFn: () => stationApi.getAdminStations(0, 1),
    enabled: hasPermission('STATION_READ'),
  });

  const { data: agencies = [], isLoading: loadingAgencies } = useQuery({
    queryKey: ['dashboardAgencies'],
    queryFn: agencyApi.getAgencies,
    enabled: hasPermission('AGENCY_READ'),
  });

  const { data: usersPage } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(0, 100),
    enabled: canManagePrioritiesOnDashboard,
  });

  const { data: applianceSummary, isLoading: loadingAppliances } = useQuery({
    queryKey: ['applianceSummary'],
    queryFn: applianceApi.getSummary,
    enabled: hasPermission('STATION_READ') && !isSysAdmin,
  });

  const { data: reviewSummary, isLoading: loadingReviews } = useQuery({
    queryKey: ['reviewSummary'],
    queryFn: () => reviewApi.getSummary(),
    enabled: hasPermission('REPORT_READ') && !isSysAdmin,
  });

  const { data: recentReviewsPage } = useQuery({
    queryKey: ['recentReviews'],
    queryFn: () => reviewApi.getReviews(0, 3),
    enabled: hasPermission('REPORT_READ') && !isSysAdmin,
  });

  const reports = reportsPage?.content || [];
  const recentReviews = recentReviewsPage?.content || [];
  const rawUsers = usersPage?.content || [];

  const eligibleTransferRecipients = rawUsers.filter(
    (u) =>
      u.active &&
      u.id !== user?.id &&
      (u.roles.includes('AGENCY_ADMIN') || u.roles.includes('ROLE_AGENCY_ADMIN')) &&
      (!user?.agencyId || u.agencyId === user.agencyId)
  );

  const priorityGroupUsers = rawUsers.filter((u) => {
    if (priorityGroupAgencyId !== 'ALL' && u.agencyId !== priorityGroupAgencyId) return false;
    if (priorityGroupRole !== 'ALL') {
      const targetRoleCode = priorityGroupRole.replace('ROLE_', '');
      const hasRoleMatch = u.roles.some((r) => r.replace('ROLE_', '') === targetRoleCode);
      if (!hasRoleMatch) return false;
    }
    return true;
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; email: string; firstName: string; lastName: string; phoneNumber?: string; agencyId?: string; region?: string; stationId?: string; priorityLevel?: number | null; roleCodes?: string[] }) =>
      userApi.updateUser(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAssignPriorityDialogOpen(false);
      setAssignTargetUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update user priority.');
    },
  });

  const transferLeadershipMutation = useMutation({
    mutationFn: () =>
      userApi.transferAgencyLeadership({
        recipientUserId: transferRecipientId,
        password: transferPassword,
        reason: transferReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setTransferLeadershipOpen(false);
      setTransferRecipientId('');
      setTransferPassword('');
      setTransferReason('');
      alert('Agency Leadership transferred successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to transfer agency leadership.');
    },
  });

  const openIncidentsCount = dashboardSummary?.openIncidents ?? reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'RECEIVED' || r.status === 'ACKNOWLEDGED' || r.status === 'IN_PROGRESS'
  ).length;

  const criticalCount = dashboardSummary?.criticalIncidents ?? reports.filter((r) => r.severity === 'CRITICAL').length;

  const unacknowledgedCount = dashboardSummary?.unacknowledgedReports ?? reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'RECEIVED'
  ).length;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {isSysAdmin ? 'National Emergency Operations Command' : `${user?.agencyName || 'Agency'} Emergency Operations`}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isSysAdmin
            ? 'Real-time multi-agency coordination, station readiness, and incident response monitoring across Ghana'
            : 'Operational dispatch readiness, active incident handling, and fleet availability'}
        </Typography>
      </Box>

      {/* Primary KPI Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {hasPermission('AGENCY_READ') && isSysAdmin && (
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Responding Agencies"
              value={loadingAgencies ? <Skeleton width={40} /> : agencies?.length || 0}
              subtitle="Active national services"
              icon={<BusinessIcon />}
              iconBg="#EFF6FF"
              iconColor="#0066CC"
            />
          </Grid>
        )}

        {hasPermission('STATION_READ') && (
          <Grid item xs={12} sm={6} md={isSysAdmin ? 2.4 : 3}>
            <MetricCard
              title="Active Stations"
              value={loadingStations ? <Skeleton width={40} /> : (dashboardSummary?.activeStations ?? stationsPage?.totalElements ?? 0)}
              subtitle="Operational centers"
              icon={<LocalHospitalIcon />}
              iconBg="#ECFDF5"
              iconColor="#059669"
            />
          </Grid>
        )}

        {hasPermission('REPORT_READ') && (
          <>
            <Grid item xs={12} sm={6} md={isSysAdmin ? 2.4 : 3}>
              <MetricCard
                title="Active Incidents"
                value={loadingSummary && loadingReports ? <Skeleton width={40} /> : openIncidentsCount}
                subtitle="Open responses"
                icon={<AssignmentIcon />}
                iconBg="#FEF3C7"
                iconColor="#D97706"
                trendType={openIncidentsCount > 5 ? 'warning' : 'info'}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={isSysAdmin ? 2.4 : 3}>
              <MetricCard
                title="Critical Incidents"
                value={loadingSummary && loadingReports ? <Skeleton width={40} /> : criticalCount}
                subtitle="High priority alerts"
                icon={<WarningIcon />}
                iconBg="#FEF2F2"
                iconColor="#D32F2F"
                trendType={criticalCount > 0 ? 'critical' : 'success'}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={isSysAdmin ? 2.4 : 3}>
              <MetricCard
                title="Awaiting Action"
                value={loadingSummary && loadingReports ? <Skeleton width={40} /> : unacknowledgedCount}
                subtitle="Unacknowledged reports"
                icon={<ReportProblemIcon />}
                iconBg="#F3F4F6"
                iconColor="#4B5563"
                trendType={unacknowledgedCount > 0 ? 'warning' : 'success'}
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* Agency Leadership & Priority Hierarchy Card Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MilitaryTechIcon color="warning" />
              <Typography variant="h6" fontWeight="bold">
                Agency Leadership & Priority Hierarchy
              </Typography>
            </Box>
            {canManagePrioritiesOnDashboard && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<MilitaryTechIcon />}
                onClick={() => {
                  setPriorityGroupAgencyId(user?.agencyId || 'ALL');
                  setPriorityGroupRole('AGENCY_ADMIN');
                  setManagePrioritiesModalOpen(true);
                }}
              >
                Manage Priorities
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {isSysAdmin
              ? 'National oversight of Agency Leads (Priority 1) and senior administrative staff hierarchies.'
              : `Agency Lead: ${user?.firstName} ${user?.lastName} (${user?.email}) — Priority 1 (Agency Lead). You have authorized control over your agency's staff priority assignments.`}
          </Typography>
        </CardContent>
      </Card>

      {/* Agency Admin Operations & Review Cards */}
      {!isSysAdmin && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Appliance Availability Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCarIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Appliance Fleet Status
                    </Typography>
                  </Box>
                  {hasPermission('STATION_READ') && (
                    <Button size="small" onClick={() => navigate('/appliances')}>
                      Manage Fleet
                    </Button>
                  )}
                </Box>

                {loadingAppliances ? (
                  <Skeleton height={100} />
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">TOTAL</Typography>
                      <Typography variant="h5" fontWeight="bold">{applianceSummary?.total || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="success.main" fontWeight="bold" display="block">AVAILABLE</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">{applianceSummary?.available || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="warning.main" fontWeight="bold" display="block">RESPONSE</Typography>
                      <Typography variant="h5" fontWeight="bold" color="warning.main">{applianceSummary?.atEmergency || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="error.main" fontWeight="bold" display="block">OUT OF COMM.</Typography>
                      <Typography variant="h5" fontWeight="bold" color="error.main">{applianceSummary?.outOfCommission || 0}</Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Citizen Response Rating Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StarIcon sx={{ color: '#D97706' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Citizen Response Rating
                    </Typography>
                  </Box>
                  {hasPermission('REPORT_READ') && (
                    <Button size="small" onClick={() => navigate('/reviews')}>
                      View All Reviews
                    </Button>
                  )}
                </Box>

                {loadingReviews ? (
                  <Skeleton height={100} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight="bold" color="primary.main">
                        {reviewSummary?.averageRating ? reviewSummary.averageRating.toFixed(1) : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Out of 5 stars
                      </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                      <Rating value={reviewSummary?.averageRating || 0} precision={0.1} readOnly size="medium" />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Based on {reviewSummary?.totalReviews || 0} citizen feedback ratings
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Requires Attention Command Panel */}
      {hasPermission('REPORT_READ') && (
        <RequiresAttentionPanel reports={reports} isLoading={loadingReports} />
      )}

      {/* System Admin National Performance Overview */}
      {isSysAdmin && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <AgencyPerformanceCard
              agencyName="Ghana Police Service"
              agencyCode="GPS"
              agencyType="POLICE"
              totalIncidents={reports.filter((r) => r.targetAgencyTypes?.includes('POLICE')).length}
              unacknowledgedCount={reports.filter((r) => r.targetAgencyTypes?.includes('POLICE') && r.status === 'SUBMITTED').length}
              inProgressCount={reports.filter((r) => r.targetAgencyTypes?.includes('POLICE') && r.status === 'IN_PROGRESS').length}
              resolvedCount={reports.filter((r) => r.targetAgencyTypes?.includes('POLICE') && r.status === 'RESOLVED').length}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AgencyPerformanceCard
              agencyName="Ghana National Fire Service"
              agencyCode="GNFS"
              agencyType="FIRE"
              totalIncidents={reports.filter((r) => r.targetAgencyTypes?.includes('FIRE')).length}
              unacknowledgedCount={reports.filter((r) => r.targetAgencyTypes?.includes('FIRE') && r.status === 'SUBMITTED').length}
              inProgressCount={reports.filter((r) => r.targetAgencyTypes?.includes('FIRE') && r.status === 'IN_PROGRESS').length}
              resolvedCount={reports.filter((r) => r.targetAgencyTypes?.includes('FIRE') && r.status === 'RESOLVED').length}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AgencyPerformanceCard
              agencyName="National Ambulance Service"
              agencyCode="NAS"
              agencyType="AMBULANCE"
              totalIncidents={reports.filter((r) => r.targetAgencyTypes?.includes('AMBULANCE')).length}
              unacknowledgedCount={reports.filter((r) => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'SUBMITTED').length}
              inProgressCount={reports.filter((r) => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'IN_PROGRESS').length}
              resolvedCount={reports.filter((r) => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'RESOLVED').length}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AgencyPerformanceCard
              agencyName="NADMO"
              agencyCode="NADMO"
              agencyType="DISASTER_MANAGEMENT"
              totalIncidents={reports.filter((r) => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT')).length}
              unacknowledgedCount={reports.filter((r) => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'SUBMITTED').length}
              inProgressCount={reports.filter((r) => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'IN_PROGRESS').length}
              resolvedCount={reports.filter((r) => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'RESOLVED').length}
            />
          </Grid>
        </Grid>
      )}

      {/* Recent Feedback Section */}
      {!isSysAdmin && recentReviews.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Citizen Feedback
              </Typography>
              {hasPermission('REPORT_READ') && (
                <Button size="small" onClick={() => navigate('/reviews')}>
                  View All Reviews
                </Button>
              )}
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Report Reference</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Comment</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentReviews.map((rev) => (
                    <TableRow key={rev.id} hover>
                      <TableCell>{new Date(rev.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{rev.publicReference || 'Report'}</TableCell>
                      <TableCell>
                        <Rating value={rev.rating} readOnly size="small" />
                      </TableCell>
                      <TableCell>{rev.comment || 'No comment'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/reports/${rev.reportId}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* National Emergency Incident Activity Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <EmergencyActivityChart />
        </Grid>
      </Grid>

      {/* Staff Priority Management Modal */}
      <Dialog open={managePrioritiesModalOpen} onClose={() => setManagePrioritiesModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <span>Staff Priority Management</span>
          <IconButton onClick={() => setManagePrioritiesModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter Agency</InputLabel>
                <Select
                  value={priorityGroupAgencyId}
                  label="Filter Agency"
                  onChange={(e) => setPriorityGroupAgencyId(e.target.value)}
                >
                  <MenuItem value="ALL">All Agencies</MenuItem>
                  {agencies.map((ag) => (
                    <MenuItem key={ag.id} value={ag.id}>
                      {ag.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role Group</InputLabel>
                <Select
                  value={priorityGroupRole}
                  label="Role Group"
                  onChange={(e) => setPriorityGroupRole(e.target.value)}
                >
                  <MenuItem value="ALL">All Roles</MenuItem>
                  <MenuItem value="AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>
                  <MenuItem value="REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                  <MenuItem value="STATION_ADMIN">STATION_ADMIN</MenuItem>
                  <MenuItem value="CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                  <MenuItem value="RESPONDER">RESPONDER</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff Name & Email</TableCell>
                  <TableCell>Agency / Scope</TableCell>
                  <TableCell>Current Priority</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {priorityGroupUsers.map((u) => {
                  const pLevel = u.priorityLevel;
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {u.firstName} {u.lastName} ({u.email})
                      </TableCell>
                      <TableCell>{u.agencyName || 'Platform Scope'}</TableCell>
                      <TableCell>
                        {pLevel === 1 ? (
                          <Chip label="Priority 1 — Agency Lead" color="warning" size="small" sx={{ fontWeight: 'bold' }} />
                        ) : pLevel === 2 ? (
                          <Chip label="Priority 2" color="primary" size="small" />
                        ) : pLevel === 3 ? (
                          <Chip label="Priority 3" size="small" variant="outlined" />
                        ) : (
                          <Chip label="Not Assigned" size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {pLevel === 1 && (isSysAdmin || isAgencyLeadP1) && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<SwapHorizIcon />}
                              onClick={() => {
                                setTransferRecipientId('');
                                setTransferPassword('');
                                setTransferReason('');
                                setTransferLeadershipOpen(true);
                              }}
                            >
                              Transfer Leadership
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setAssignTargetUser(u);
                              setAssignPriorityVal(u.priorityLevel ?? 2);
                              setAssignPriorityDialogOpen(true);
                            }}
                          >
                            {pLevel != null ? 'Edit Priority' : 'Assign Priority'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {priorityGroupUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      No staff members match the selected agency and role group filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManagePrioritiesModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Priority Dialog */}
      <Dialog open={assignPriorityDialogOpen} onClose={() => setAssignPriorityDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Assign Priority Level</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Staff Member: <strong>{assignTargetUser?.firstName} {assignTargetUser?.lastName}</strong> ({assignTargetUser?.email})
          </Typography>

          <FormControl fullWidth size="small" margin="normal">
            <InputLabel>Priority Level</InputLabel>
            <Select
              value={assignPriorityVal ?? ''}
              label="Priority Level"
              onChange={(e) => setAssignPriorityVal(e.target.value === '' ? null : Number(e.target.value))}
            >
              <MenuItem value="">Not Assigned</MenuItem>
              {isSysAdmin && <MenuItem value={1}>Priority 1 (Agency Lead)</MenuItem>}
              <MenuItem value={2}>Priority 2 (Senior Admin)</MenuItem>
              <MenuItem value={3}>Priority 3 (Staff Operator)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignPriorityDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={updateUserMutation.isPending || !assignTargetUser}
            onClick={() => {
              if (!assignTargetUser) return;
              updateUserMutation.mutate({
                id: assignTargetUser.id,
                email: assignTargetUser.email,
                firstName: assignTargetUser.firstName,
                lastName: assignTargetUser.lastName,
                phoneNumber: assignTargetUser.phoneNumber,
                agencyId: assignTargetUser.agencyId,
                region: assignTargetUser.region,
                stationId: assignTargetUser.stationId,
                priorityLevel: assignPriorityVal,
                roleCodes: assignTargetUser.roles.map((r) => r.replace('ROLE_', '')),
              });
            }}
          >
            {updateUserMutation.isPending ? 'Saving...' : 'Save Priority'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Agency Leadership Dialog */}
      <Dialog open={transferLeadershipOpen} onClose={() => setTransferLeadershipOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Transfer Agency Leadership</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Transferring leadership designates the recipient as <strong>Priority 1 (Agency Lead)</strong>. Your priority will become Priority 2.
          </Alert>

          <FormControl fullWidth size="small" margin="normal" required>
            <InputLabel>New Agency Lead (Recipient)</InputLabel>
            <Select
              value={transferRecipientId}
              label="New Agency Lead (Recipient)"
              onChange={(e) => setTransferRecipientId(e.target.value)}
            >
              {eligibleTransferRecipients.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Current Password"
            type="password"
            value={transferPassword}
            onChange={(e) => setTransferPassword(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Handover / Transfer Reason"
            placeholder="e.g. Official administrative handover..."
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferLeadershipOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={transferLeadershipMutation.isPending || !transferRecipientId || !transferPassword}
            onClick={() => transferLeadershipMutation.mutate()}
          >
            {transferLeadershipMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
