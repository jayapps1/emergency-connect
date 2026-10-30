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

export const PublicUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Authenticated, 1 = Guests, 2 = Disabled

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
        <Typography variant="h5" fontWeight="bold">
          Citizen Users & App Installations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          National System Admin oversight for authenticated citizen accounts and anonymous guest app installations.
        </Typography>
      </Box>

      {/* Summary KPI Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Total Accounts"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.totalAccounts || 0}
            subtitle="Registered citizen profiles"
            icon={<PeopleIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Verified Citizens"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.verifiedAccounts || 0}
            subtitle="Phone verified accounts"
            icon={<VerifiedUserIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendType="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Active Accounts"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.activeAccounts || 0}
            subtitle="Enabled citizen users"
            icon={<CheckCircleIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Guest Installations"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.guestInstallations || 0}
            subtitle="Anonymous app users"
            icon={<SmartphoneIcon />}
            iconBg="#F3F4F6"
            iconColor="#4B5563"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Disabled Accounts"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.disabledAccounts || 0}
            subtitle="Suspended accounts"
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
                  placeholder="Search masked phone or reference..."
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
                        <TableCell>Account Ref</TableCell>
                        <TableCell>Phone (Masked)</TableCell>
                        <TableCell>Verification</TableCell>
                        <TableCell>Account Status</TableCell>
                        <TableCell>TOTP MFA</TableCell>
                        <TableCell>Submitted Reports</TableCell>
                        <TableCell>Created At</TableCell>
                        <TableCell align="right">Actions</TableCell>
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
                              label={u.phoneVerified ? 'Verified' : 'Unverified'}
                              color={u.phoneVerified ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.status}
                              color={u.status === 'ACTIVE' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.totpEnabled ? 'Enabled' : 'Disabled'}
                              color={u.totpEnabled ? 'primary' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{u.reportCount}</TableCell>
                          <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => {
                                setSelectedUser(u);
                                setUserModalOpen(true);
                              }}
                              sx={{ mr: 1 }}
                            >
                              Details
                            </Button>

                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => {
                                setSelectedUser(u);
                                setRevokeModalOpen(true);
                              }}
                              title="Revoke Sessions"
                              sx={{ mr: 0.5 }}
                            >
                              <SecurityIcon fontSize="small" />
                            </IconButton>

                            {u.status === 'ACTIVE' ? (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setDisableModalOpen(true);
                                }}
                                title="Disable Account"
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            ) : (
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => enableMutation.mutate(u.id)}
                                title="Enable Account"
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {displayedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
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
                        <TableCell>Guest Ref</TableCell>
                        <TableCell>Account Link Status</TableCell>
                        <TableCell>Guest Reports</TableCell>
                        <TableCell>First Seen</TableCell>
                        <TableCell>Last Active</TableCell>
                        <TableCell align="right">Actions</TableCell>
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
                              startIcon={<VisibilityIcon />}
                              onClick={() => {
                                setSelectedGuest(g);
                                setGuestModalOpen(true);
                              }}
                            >
                              View Activity
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

      {/* Authenticated Citizen User Detail Modal */}
      <Dialog open={userModalOpen} onClose={() => setUserModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          Citizen Account — {selectedUser?.publicReference}
          <IconButton onClick={() => setUserModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Reference</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedUser.publicReference}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Masked Phone Number</Typography>
                  <Typography variant="body1" fontWeight="bold" fontFamily="monospace">{selectedUser.phoneNumberMasked}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Phone Verification</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedUser.phoneVerified ? 'Verified' : 'Unverified'} color={selectedUser.phoneVerified ? 'success' : 'default'} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">TOTP 2-Step Verification</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedUser.totpEnabled ? 'Enabled' : 'Disabled'} color={selectedUser.totpEnabled ? 'primary' : 'default'} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Submitted Reports</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedUser.reportCount} reports</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Active Sessions</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedUser.activeSessionCount} sessions</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Created Date</Typography>
                  <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Last Login</Typography>
                  <Typography variant="body2">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</Typography>
                </Grid>
              </Grid>
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
          Guest App User — {selectedGuest?.guestReference}
          <IconButton onClick={() => setGuestModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedGuest && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                // Guest references intentionally hide raw installation identifiers to maintain privacy.
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
