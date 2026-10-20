import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/api/reportApi';
import { dashboardApi } from '@/api/dashboardApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { EmergencyActivityChart } from './EmergencyActivityChart';
import { DashboardHero } from './DashboardHero';
import { MetricCard } from './MetricCard';
import { RequiresAttentionPanel } from './RequiresAttentionPanel';
import { AgencyPerformanceCard } from './AgencyPerformanceCard';

export const DashboardPage: React.FC = () => {
  const { user, hasRole, hasPermission, roles } = useAuthStore();
  const navigate = useNavigate();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: reportsPage, isLoading: loadingReports } = useQuery({
    queryKey: ['reports', 0, 10],
    queryFn: () => reportApi.getReports(0, 10),
    enabled: hasPermission('REPORT_READ'),
  });

  const reports = reportsPage?.content || [];

  const roleTitle = isSysAdmin
    ? 'SYSTEM ADMIN — National Platform Oversight'
    : user?.agencyName
    ? `${user.agencyName} ${user.region ? `(${user.region})` : ''} — ${roles[0] || 'Agency Staff'}`
    : `${roles[0] || 'User'} Command Dashboard`;

  const heroSubtitle = isSysAdmin
    ? 'Monitor national emergency response timelines, agency performance, and cross-service coordination.'
    : `Coordinate emergency incidents, dispatch stations, and maintain operational response status for ${user?.agencyName || 'your agency'}.`;

  return (
    <Box>
      {/* Premium Dashboard Hero */}
      <DashboardHero
        userName={user?.firstName}
        roleTitle={roleTitle}
        subtitle={heroSubtitle}
      />

      {/* Quick Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Emergency Operations Command & Statistics
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {hasPermission('AGENCY_CREATE') && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => navigate('/agencies')}>
              New Agency
            </Button>
          )}
          {hasPermission('STATION_CREATE') && (
            <Button variant="contained" color="secondary" size="small" startIcon={<LocalOfferIcon />} onClick={() => navigate('/stations')}>
              New Station
            </Button>
          )}
          {hasPermission('ADMIN_USER_CREATE') && (
            <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={() => navigate('/users')}>
              Add Admin User
            </Button>
          )}
        </Box>
      </Box>

      {/* Redesigned Metric Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Reports Today"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.reportsToday || 0}
            subtitle="Incidents submitted today"
            icon={<ReportProblemIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
            trendText="Active Today"
            trendType="info"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Awaiting Response"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.unacknowledgedReports || 0}
            subtitle="Pending acknowledgement"
            icon={<AccessTimeIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            trendText={summary?.unacknowledgedReports ? `${summary.unacknowledgedReports} pending` : 'All clear'}
            trendType={summary?.unacknowledgedReports ? 'warning' : 'success'}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Critical Incidents"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.criticalIncidents || 0}
            subtitle="High & critical priority"
            icon={<WarningIcon />}
            iconBg="#FEF2F2"
            iconColor="#D32F2F"
            trendText="Priority Alert"
            trendType="critical"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Operational Stations"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.activeStations || 0}
            subtitle="Verified emergency units"
            icon={<LocalOfferIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendText="Active Units"
            trendType="success"
          />
        </Grid>
      </Grid>

      {/* Requires Attention Command Panel */}
      {hasPermission('REPORT_READ') && (
        <RequiresAttentionPanel reports={reports} isLoading={loadingReports} />
      )}

      {/* System Admin Agency Performance Overview */}
      {isSysAdmin && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            National Agency Response Performance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            National platform oversight breakdown across major participating emergency services
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <AgencyPerformanceCard
                agencyName="Ghana Police Service"
                agencyCode="GPS"
                agencyType="POLICE"
                totalIncidents={reports.filter(r => r.targetAgencyTypes?.includes('POLICE')).length}
                unacknowledgedCount={reports.filter(r => r.targetAgencyTypes?.includes('POLICE') && r.status === 'SUBMITTED').length}
                inProgressCount={reports.filter(r => r.targetAgencyTypes?.includes('POLICE') && r.status === 'IN_PROGRESS').length}
                resolvedCount={reports.filter(r => r.targetAgencyTypes?.includes('POLICE') && r.status === 'RESOLVED').length}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AgencyPerformanceCard
                agencyName="Ghana National Fire Service"
                agencyCode="GNFS"
                agencyType="FIRE"
                totalIncidents={reports.filter(r => r.targetAgencyTypes?.includes('FIRE')).length}
                unacknowledgedCount={reports.filter(r => r.targetAgencyTypes?.includes('FIRE') && r.status === 'SUBMITTED').length}
                inProgressCount={reports.filter(r => r.targetAgencyTypes?.includes('FIRE') && r.status === 'IN_PROGRESS').length}
                resolvedCount={reports.filter(r => r.targetAgencyTypes?.includes('FIRE') && r.status === 'RESOLVED').length}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AgencyPerformanceCard
                agencyName="National Ambulance Service"
                agencyCode="NAS"
                agencyType="AMBULANCE"
                totalIncidents={reports.filter(r => r.targetAgencyTypes?.includes('AMBULANCE')).length}
                unacknowledgedCount={reports.filter(r => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'SUBMITTED').length}
                inProgressCount={reports.filter(r => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'IN_PROGRESS').length}
                resolvedCount={reports.filter(r => r.targetAgencyTypes?.includes('AMBULANCE') && r.status === 'RESOLVED').length}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AgencyPerformanceCard
                agencyName="NADMO Emergency Service"
                agencyCode="NADMO"
                agencyType="DISASTER_MANAGEMENT"
                totalIncidents={reports.filter(r => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT')).length}
                unacknowledgedCount={reports.filter(r => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'SUBMITTED').length}
                inProgressCount={reports.filter(r => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'IN_PROGRESS').length}
                resolvedCount={reports.filter(r => r.targetAgencyTypes?.includes('DISASTER_MANAGEMENT') && r.status === 'RESOLVED').length}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Emergency Activity Line Chart */}
      <EmergencyActivityChart />

      {/* Recent Incidents Table */}
      {hasPermission('REPORT_READ') && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Emergency Operational Logs
              </Typography>

              <Button size="small" onClick={() => navigate('/reports')}>
                View Full Registry
              </Button>
            </Box>

            {loadingReports ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reference</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submitted Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow
                        key={report.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {report.publicReference}
                        </TableCell>
                        <TableCell>{report.categoryName || 'Incident'}</TableCell>
                        <TableCell>
                          <Chip
                            label={report.severity}
                            color={report.severity === 'CRITICAL' ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.mode}
                            color={report.mode === 'SILENT' ? 'secondary' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.status}
                            size="small"
                            color={report.status === 'RESOLVED' ? 'success' : report.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          No recent incident reports found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
