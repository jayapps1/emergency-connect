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
  InputAdornment,
  InputLabel,
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
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicUserApi, PublicUserItem, GuestInstallationItem } from '@/api/publicUserApi';
import { MetricCard } from '@/features/dashboard/MetricCard';
import { useAuthStore } from '@/auth/useAuthStore';

// Loads detailed citizen activity only when requested, keeping the main citizen directory lightweight and role-scoped.
export const PublicUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, roles } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Authenticated, 1 = Guests, 2 = Disabled
  const [modalTabValue, setModalTabValue] = useState<number>(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [selectedUser, setSelectedUser] = useState<PublicUserItem | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestInstallationItem | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  const pageSubtitle = isSysAdmin
    ? 'National citizen oversight, activity history and account administration.'
    : hasRole('AGENCY_ADMIN')
    ? 'Citizens connected to your agency through reports, emergency calls, complaints, incidents and follow-ups.'
    : hasRole('REGIONAL_ADMIN')
    ? 'Citizens connected to emergency activity across stations in your region.'
    : 'Citizens connected to emergency activity handled by your station.';

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['publicUserSummary'],
    queryFn: publicUserApi.getSummary,
  });

  const { data: publicUsersPage, isLoading: loadingUsers } = useQuery({
    queryKey: ['publicUsers', filterStatus, searchTerm],
    queryFn: () => publicUserApi.getPublicUsers(0, 50, filterStatus, searchTerm),
    enabled: activeTab !== 1,
  });

  const { data: guestInstallationsPage, isLoading: loadingGuests } = useQuery({
    queryKey: ['guestInstallations'],
    queryFn: () => publicUserApi.getGuestInstallations(0, 50),
    enabled: activeTab === 1,
  });

  const disableMutation = useMutation({
    mutationFn: publicUserApi.disablePublicUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicUsers'] });
      queryClient.invalidateQueries({ queryKey: ['publicUserSummary'] });
      setDisableModalOpen(false);
      setSelectedUser(null);
    },
  });

  const enableMutation = useMutation({
    mutationFn: publicUserApi.enablePublicUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicUsers'] });
      queryClient.invalidateQueries({ queryKey: ['publicUserSummary'] });
      setSelectedUser(null);
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: publicUserApi.revokeSessions,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['publicUsers'] });
      setRevokeModalOpen(false);
      alert(`Successfully revoked ${res.revokedCount} active sessions.`);
    },
  });

  const rawUsers = publicUsersPage?.content || [];
  const rawGuests = guestInstallationsPage?.content || [];

  const displayedUsers = rawUsers.filter((u) => {
    if (activeTab === 2 && u.status.toUpperCase() !== 'DISABLED') return false;
    return true;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Citizen Users
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {pageSubtitle}
        </Typography>
      </Box>

      {/* Summary KPI Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title={isSysAdmin ? 'TOTAL ACCOUNTS' : 'CONNECTED CITIZENS'}
            value={loadingSummary ? <Skeleton width={40} /> : summary?.totalAccounts || 0}
            subtitle={isSysAdmin ? 'Registered citizen profiles' : 'Citizens with agency cases'}
            icon={<PeopleIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title={isSysAdmin ? 'VERIFIED CITIZENS' : 'REPORTERS'}
            value={loadingSummary ? <Skeleton width={40} /> : summary?.verifiedAccounts || 0}
            subtitle={isSysAdmin ? 'Phone verified accounts' : 'Case-linked reporters'}
            icon={<VerifiedUserIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendType="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title={isSysAdmin ? 'ACTIVE ACCOUNTS' : 'EMERGENCY CALLERS'}
            value={loadingSummary ? <Skeleton width={40} /> : summary?.activeAccounts || 0}
            subtitle={isSysAdmin ? 'Enabled citizen users' : 'Call attempt callers'}
            icon={<CheckCircleIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title={isSysAdmin ? 'GUEST INSTALLATIONS' : 'OPEN FOLLOW-UPS'}
            value={loadingSummary ? <Skeleton width={40} /> : summary?.guestInstallations || 0}
            subtitle={isSysAdmin ? 'Anonymous app users' : 'Active case follow-ups'}
            icon={<SmartphoneIcon />}
            iconBg="#F3F4F6"
            iconColor="#4B5563"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title={isSysAdmin ? 'DISABLED ACCOUNTS' : 'COMPLAINT CASES'}
            value={loadingSummary ? <Skeleton width={40} /> : summary?.disabledAccounts || 0}
            subtitle={isSysAdmin ? 'Suspended accounts' : 'Review & complaint cases'}
            icon={<BlockIcon />}
            iconBg="#FEF2F2"
            iconColor="#D32F2F"
            trendType="critical"
          />
        </Grid>
      </Grid>

      {/* Category Tabs & Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              handleClearFilters();
            }}
          >
            <Tab label={`Authenticated Citizens (${summary?.totalAccounts || 0})`} />
            <Tab label={`Guest Installations (${summary?.guestInstallations || 0})`} />
            <Tab label={`Disabled Accounts (${summary?.disabledAccounts || 0})`} />
          </Tabs>
        </Box>

        {activeTab !== 1 && (
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  placeholder="Search phone number or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Account Status</InputLabel>
                  <Select value={filterStatus} label="Account Status" onChange={(e) => setFilterStatus(e.target.value)}>
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="DISABLED">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                {(searchTerm || filterStatus !== 'ALL') && (
                  <Button size="small" color="secondary" onClick={handleClearFilters} startIcon={<ClearIcon />}>
                    Clear Filters
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Main Table Content */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          {activeTab !== 1 ? (
            /* Authenticated Citizen Accounts Table */
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Authenticated Citizen Accounts ({displayedUsers.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing {displayedUsers.length} of {rawUsers.length} citizen accounts
                </Typography>
              </Box>

              {loadingUsers ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{isSysAdmin ? 'ACCOUNT REF' : 'CITIZEN REF'}</TableCell>
                        <TableCell>{isSysAdmin ? 'PHONE NUMBER' : 'PHONE'}</TableCell>
                        <TableCell>VERIFICATION</TableCell>
                        {isSysAdmin && <TableCell>STATUS</TableCell>}
                        <TableCell>REPORTS</TableCell>
                        <TableCell>COMPLAINTS</TableCell>
                        <TableCell>CALLS</TableCell>
                        <TableCell>{isSysAdmin ? 'FOLLOW-UPS' : 'OPEN FOLLOW-UPS'}</TableCell>
                        <TableCell>{isSysAdmin ? 'CREATED' : 'LAST ACTIVITY'}</TableCell>
                        <TableCell align="right">ACTION</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedUsers.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {u.publicReference}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {u.phoneNumberMasked}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.phoneVerified ? 'VERIFIED' : 'UNVERIFIED'}
                              color={u.phoneVerified ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          {isSysAdmin && (
                            <TableCell>
                              <Chip
                                label={u.status}
                                color={u.status === 'ACTIVE' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 'bold' }}>{u.reportCount}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{(u as any).complaintCount || 0}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{(u as any).callCount || 0}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{(u as any).followUpCount || 0}</TableCell>
                          <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedUser(u);
                                setModalTabValue(0);
                                setUserModalOpen(true);
                              }}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {displayedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSysAdmin ? 10 : 9} align="center" sx={{ py: 3 }}>
                            No public citizen accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            /* Guest App Installations Table */
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Anonymous Guest App Installations ({rawGuests.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing {rawGuests.length} guest app installations
                </Typography>
              </Box>

              {loadingGuests ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>GUEST REF</TableCell>
                        <TableCell>ACCOUNT LINK STATUS</TableCell>
                        <TableCell>GUEST REPORTS</TableCell>
                        <TableCell>FIRST SEEN</TableCell>
                        <TableCell>LAST ACTIVE</TableCell>
                        <TableCell align="right">ACTION</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rawGuests.map((g) => (
                        <TableRow key={g.id} hover>
                          <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
                            {g.guestReference}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={g.isLinkedAccount ? 'Linked to Account' : 'Unlinked Guest'}
                              color={g.isLinkedAccount ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{g.reportCount}</TableCell>
                          <TableCell>{new Date(g.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(g.lastSeenAt).toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedGuest(g);
                                setGuestModalOpen(true);
                              }}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rawGuests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            No guest app users found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Authenticated Citizen User Management Modal */}
      <Dialog open={userModalOpen} onClose={() => setUserModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Citizen Management</Typography>
            <Typography variant="caption" color="text.secondary">Citizen Ref: {selectedUser?.publicReference}</Typography>
          </Box>
          <IconButton onClick={() => setUserModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={modalTabValue} onChange={(_, val) => setModalTabValue(val)}>
            <Tab label="Overview" />
            <Tab label="Reports" />
            <Tab label="Complaints" />
            <Tab label="Emergency Calls" />
            <Tab label="Follow-Ups" />
            {isSysAdmin && <Tab label="Devices" />}
            {isSysAdmin && <Tab label="Account Management" />}
          </Tabs>
        </Box>
        <DialogContent dividers>
          {selectedUser && (
            <Box>
              {/* Modal Tab 0: Overview */}
              {modalTabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Citizen Reference</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedUser.publicReference}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                    <Typography variant="body1" fontWeight="bold" fontFamily="monospace">{selectedUser.phoneNumberMasked}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Verification</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={selectedUser.phoneVerified ? 'Verified' : 'Unverified'} color={selectedUser.phoneVerified ? 'success' : 'default'} size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Submitted Reports</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedUser.reportCount} reports</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Complaints & Reviews</Typography>
                    <Typography variant="body1" fontWeight="bold">{(selectedUser as any).complaintCount || 0} cases</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Emergency Calls</Typography>
                    <Typography variant="body1" fontWeight="bold">{(selectedUser as any).callCount || 0} attempts</Typography>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="caption" color="text.secondary">Created Date</Typography>
                    <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="caption" color="text.secondary">Last Login</Typography>
                    <Typography variant="body2">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</Typography>
                  </Grid>
                </Grid>
              )}

              {/* Modal Tab 1: Reports */}
              {modalTabValue === 1 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total {selectedUser.reportCount} emergency reports submitted by this citizen account.
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 2: Complaints */}
              {modalTabValue === 2 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total {(selectedUser as any).complaintCount || 0} response reviews & complaints recorded for this citizen.
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 3: Calls */}
              {modalTabValue === 3 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total {(selectedUser as any).callCount || 0} emergency call attempts linked to this citizen account.
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 4: Follow-Ups */}
              {modalTabValue === 4 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Case-linked incident follow-up records for this citizen.
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 5: Devices (System Admin Only) */}
              {modalTabValue === 5 && isSysAdmin && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Registered app installations linked to this citizen account.
                  </Typography>
                </Box>
              )}

              {/* Modal Tab 6: Account Management (System Admin Only) */}
              {modalTabValue === 6 && isSysAdmin && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', py: 2 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<SecurityIcon />}
                    onClick={() => {
                      setUserModalOpen(false);
                      setRevokeModalOpen(true);
                    }}
                  >
                    Revoke Active Sessions
                  </Button>

                  {selectedUser.status === 'ACTIVE' ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<BlockIcon />}
                      onClick={() => {
                        setUserModalOpen(false);
                        setDisableModalOpen(true);
                      }}
                    >
                      Disable Account
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => enableMutation.mutate(selectedUser.id)}
                    >
                      Reactivate Account
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Guest Installation Detail Modal */}
      <Dialog open={guestModalOpen} onClose={() => setGuestModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Guest App User</Typography>
            <Typography variant="caption" color="text.secondary">Guest Ref: {selectedGuest?.guestReference}</Typography>
          </Box>
          <IconButton onClick={() => setGuestModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedGuest && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Guest references hide raw installation identifiers to maintain privacy while preserving emergency response continuity.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Guest Reference</Typography>
                  <Typography variant="body1" fontWeight="bold" fontFamily="monospace">{selectedGuest.guestReference}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Linkage</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedGuest.isLinkedAccount ? 'Linked to Account' : 'Unlinked Guest'} color={selectedGuest.isLinkedAccount ? 'success' : 'default'} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Submitted Reports</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedGuest.reportCount} reports</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">First Seen</Typography>
                  <Typography variant="body2">{new Date(selectedGuest.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Last Active</Typography>
                  <Typography variant="body2">{new Date(selectedGuest.lastSeenAt).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Disable Account Modal */}
      <Dialog open={disableModalOpen} onClose={() => setDisableModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Disable Citizen Account</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Disable citizen account <strong>{selectedUser?.publicReference}</strong> ({selectedUser?.phoneNumberMasked})?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            This will suspend active login sessions. Existing emergency report history and audit records will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => selectedUser && disableMutation.mutate(selectedUser.id)}
            disabled={disableMutation.isPending}
          >
            {disableMutation.isPending ? 'Disabling...' : 'Disable Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Sessions Modal */}
      <Dialog open={revokeModalOpen} onClose={() => setRevokeModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Revoke Active Sessions</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Revoke all active sessions for <strong>{selectedUser?.publicReference}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            The citizen will be required to re-authenticate on their Android application.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => selectedUser && revokeSessionsMutation.mutate(selectedUser.id)}
            disabled={revokeSessionsMutation.isPending}
          >
            {revokeSessionsMutation.isPending ? 'Revoking...' : 'Revoke Sessions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
