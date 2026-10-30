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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BadgeIcon from '@mui/icons-material/Badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { stationApi } from '@/api/stationApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { AdminUser } from '@/types';

/**
 * Agency administrators cannot select another agency when creating a
 * responder. Agency ownership is inherited from the authenticated session
 * and enforced again by the backend.
 */
export const RespondersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentActor, hasRole } = useAuthStore();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStation, setFilterStation] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [region, setRegion] = useState('');
  const [stationId, setStationId] = useState('');

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(0, 100),
  });

  const { data: stationsPage } = useQuery({
    queryKey: ['stationsList'],
    queryFn: () => stationApi.getAdminStations(0, 100),
  });

  const stations = stationsPage?.content || [];
  const rawUsers = usersPage?.content || [];

  // Filter specifically for Field Unit Responders
  const responders = rawUsers.filter((u) => {
    // Role filter: Must be RESPONDER
    const isResponder = u.roles.some((r) => r.includes('RESPONDER'));
    if (!isResponder) return false;

    // Agency Scope filter for non-System Admin
    if (!hasRole('SYSTEM_ADMIN') && currentActor?.agencyId) {
      if (u.agencyId !== currentActor.agencyId) return false;
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phoneNumber?.toLowerCase().includes(q);
      const matchStation = u.stationName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchStation) return false;
    }

    if (filterStation !== 'ALL' && u.stationId !== filterStation) return false;
    if (filterStatus === 'ACTIVE' && !u.active) return false;
    if (filterStatus === 'INACTIVE' && u.active) return false;

    return true;
  });

  const isFilterActive = Boolean(searchTerm) || filterStation !== 'ALL' || filterStatus !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStation('ALL');
    setFilterStatus('ALL');
  };

  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setCreatedTempPassword(res.temporaryPassword);
      resetForm();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; email: string; firstName: string; lastName: string; phoneNumber?: string; agencyId?: string; region?: string; stationId?: string; roleCodes?: string[] }) =>
      userApi.updateUser(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      setEditError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update field responder details. Please check values and try again.';
      setEditError(msg);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: userApi.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: userApi.reactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: userApi.resetPassword,
    onSuccess: (res) => {
      setResetDialogOpen(false);
      setCreatedTempPassword(res.temporaryPassword);
    },
  });

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setRegion('');
    setStationId('');
    setEditError(null);
  };

  const handleCopyPassword = () => {
    if (createdTempPassword) {
      navigator.clipboard.writeText(createdTempPassword);
      alert('Temporary password copied to clipboard!');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Field Unit Responders
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage active emergency response staff, station dispatches, and credentials for mobile units
          </Typography>
        </div>

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          Add Field Responder
        </Button>
      </Box>

      {/* Search & Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                placeholder="Search responder name, email, phone, station..."
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
                <InputLabel>Station Scope</InputLabel>
                <Select value={filterStation} label="Station Scope" onChange={(e) => setFilterStation(e.target.value)}>
                  <MenuItem value="ALL">All Agency Stations</MenuItem>
                  {stations.map((st: any) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Disabled / Locked</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={12} md={2}>
              {isFilterActive && (
                <Button size="small" color="secondary" onClick={handleClearFilters} startIcon={<ClearIcon />}>
                  Clear Filters
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Responders Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Active Field Responders ({responders.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {responders.length} active field unit staff members
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rectangular" height={250} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name / Role</TableCell>
                    <TableCell>Email / Phone</TableCell>
                    <TableCell>Agency</TableCell>
                    <TableCell>Assigned Station</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responders.map((resp) => (
                    <TableRow key={resp.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BadgeIcon color="primary" fontSize="small" />
                          <div>
                            <Typography variant="body2" fontWeight="bold">
                              {resp.firstName} {resp.lastName}
                            </Typography>
                            <Chip label="RESPONDER" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                          </div>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{resp.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{resp.phoneNumber || 'No phone'}</Typography>
                      </TableCell>
                      <TableCell>{resp.agencyName || currentActor?.agencyName || 'Agency Unit'}</TableCell>
                      <TableCell>{resp.stationName || 'Unassigned Station'}</TableCell>
                      <TableCell>
                        <Chip
                          label={resp.active ? 'Active' : 'Disabled'}
                          color={resp.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => {
                            setSelectedUser(resp);
                            setDetailDialogOpen(true);
                          }}
                          title="View Responder Details"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedUser(resp);
                            setFirstName(resp.firstName);
                            setLastName(resp.lastName);
                            setPhoneNumber(resp.phoneNumber || '');
                            setRegion(resp.region || '');
                            setStationId(resp.stationId || '');
                            setEditError(null);
                            setEditDialogOpen(true);
                          }}
                          title="Edit Responder Scope"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedUser(resp);
                            setResetDialogOpen(true);
                          }}
                          title="Reset Password"
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>

                        {resp.active ? (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deactivateMutation.mutate(resp.id)}
                            title="Disable Responder"
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => reactivateMutation.mutate(resp.id)}
                            title="Re-enable Responder"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {responders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        {isFilterActive
                          ? 'No field unit responders match the current search filters.'
                          : 'No field unit responders registered for this agency.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Field Responder Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate({
              email,
              firstName,
              lastName,
              phoneNumber,
              agencyId: currentActor?.agencyId,
              region,
              stationId,
              roleCodes: ['RESPONDER'],
            });
          }}
        >
          <DialogTitle fontWeight="bold">Register New Field Unit Responder</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Email Address / Staff Identifier" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </Grid>
              </Grid>
              <TextField fullWidth label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />

              <TextField
                fullWidth
                label="Assigned Agency"
                value={currentActor?.agencyName || 'Authenticated Agency Scope'}
                disabled
                helperText="Agency ownership is derived from authenticated administrator scope."
              />

              <FormControl fullWidth>
                <InputLabel>Assigned Station Scope</InputLabel>
                <Select value={stationId} label="Assigned Station Scope" onChange={(e) => setStationId(e.target.value)}>
                  <MenuItem value="">Agency-Wide / Mobile Unit</MenuItem>
                  {stations.map((st: any) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creating...' : 'Create Responder Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Responder Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">Edit Responder — {selectedUser?.email}</DialogTitle>
        <DialogContent dividers>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </Grid>
            </Grid>
            <TextField fullWidth label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />

            <FormControl fullWidth>
              <InputLabel>Assigned Station Scope</InputLabel>
              <Select value={stationId} label="Assigned Station Scope" onChange={(e) => setStationId(e.target.value)}>
                <MenuItem value="">Agency-Wide / Mobile Unit</MenuItem>
                {stations.map((st: any) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              selectedUser &&
              updateUserMutation.mutate({
                id: selectedUser.id,
                email: selectedUser.email,
                firstName,
                lastName,
                phoneNumber,
                agencyId: currentActor?.agencyId,
                region,
                stationId,
                roleCodes: ['RESPONDER'],
              })
            }
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Responder Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Responder Details</DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedUser.firstName} {selectedUser.lastName}
              </Typography>
              <Typography variant="body2"><strong>Email:</strong> {selectedUser.email}</Typography>
              <Typography variant="body2"><strong>Phone:</strong> {selectedUser.phoneNumber || 'N/A'}</Typography>
              <Typography variant="body2"><strong>Agency:</strong> {selectedUser.agencyName || currentActor?.agencyName}</Typography>
              <Typography variant="body2"><strong>Station:</strong> {selectedUser.stationName || 'Agency-Wide'}</Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {selectedUser.active ? 'Active' : 'Disabled'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Reset Password</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Reset password for field responder <strong>{selectedUser?.email}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            A new temporary password will be generated. The responder will be required to change it on their next mobile sign-in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset & Issue Temp Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-Time Temp Password Dialog */}
      <Dialog open={Boolean(createdTempPassword)} onClose={() => setCreatedTempPassword(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Temporary Password Issued</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This temporary password will be shown <strong>only once</strong>. Provide it to the responder.
          </Alert>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold" fontFamily="monospace">
              {createdTempPassword}
            </Typography>
            <IconButton onClick={handleCopyPassword} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setCreatedTempPassword(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
