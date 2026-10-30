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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { agencyApi } from '@/api/agencyApi';
import { stationApi } from '@/api/stationApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { AdminUser } from '@/types';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentActor, hasRole, hasPermission } = useAuthStore();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterAgency, setFilterAgency] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState('CONTROL_ROOM_OPERATOR');
  const [agencyId, setAgencyId] = useState('');
  const [region, setRegion] = useState('');
  const [stationId, setStationId] = useState('');

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(0, 100),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
    enabled: hasPermission('AGENCY_READ'),
  });

  const { data: stationsPage } = useQuery({
    queryKey: ['stationsList'],
    queryFn: () => stationApi.getAdminStations(0, 100),
  });

  const stations = stationsPage?.content || [];
  const rawUsers = usersPage?.content || [];

  // Filtered Users Calculation
  const users = rawUsers.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phoneNumber?.toLowerCase().includes(q);
      const matchAgency = u.agencyName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchAgency) return false;
    }

    if (filterRole !== 'ALL' && !u.roles.includes(filterRole)) return false;
    if (filterAgency !== 'ALL' && u.agencyId !== filterAgency) return false;
    if (filterStatus === 'ACTIVE' && !u.active) return false;
    if (filterStatus === 'INACTIVE' && u.active) return false;

    return true;
  });

  const isFilterActive = Boolean(searchTerm) || filterRole !== 'ALL' || filterAgency !== 'ALL' || filterStatus !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterRole('ALL');
    setFilterAgency('ALL');
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
    setSelectedRole('CONTROL_ROOM_OPERATOR');
    setAgencyId('');
    setRegion('');
    setStationId('');
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
            Internal Staff & Admin Accounts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage operational administrative accounts, roles, and security credentials across all agencies
          </Typography>
        </div>

        {hasPermission('ADMIN_USER_CREATE') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            Add Staff Account
          </Button>
        )}
      </Box>

      {/* Search & Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                placeholder="Search name, email, phone, agency..."
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

            <Grid item xs={6} sm={3} md={2.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={filterRole} label="Role" onChange={(e) => setFilterRole(e.target.value)}>
                  <MenuItem value="ALL">All Roles</MenuItem>
                  <MenuItem value="ROLE_SYSTEM_ADMIN">SYSTEM_ADMIN</MenuItem>
                  <MenuItem value="ROLE_AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>
                  <MenuItem value="ROLE_REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                  <MenuItem value="ROLE_STATION_ADMIN">STATION_ADMIN</MenuItem>
                  <MenuItem value="ROLE_CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                  <MenuItem value="ROLE_REPORT_REVIEWER">REPORT_REVIEWER</MenuItem>
                  <MenuItem value="ROLE_AUDITOR">AUDITOR</MenuItem>
                  <MenuItem value="ROLE_RESPONDER">RESPONDER (Field Unit)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {hasRole('SYSTEM_ADMIN') && (
              <Grid item xs={6} sm={3} md={2.5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Agency</InputLabel>
                  <Select value={filterAgency} label="Agency" onChange={(e) => setFilterAgency(e.target.value)}>
                    <MenuItem value="ALL">All Agencies</MenuItem>
                    {agencies.map((ag) => (
                      <MenuItem key={ag.id} value={ag.id}>
                        {ag.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive / Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              {isFilterActive && (
                <Button size="small" color="secondary" onClick={handleClearFilters} startIcon={<ClearIcon />}>
                  Clear Filters
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Operational Accounts ({users.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {users.length} of {rawUsers.length} total staff accounts
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rectangular" height={250} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email / Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Agency Scope</TableCell>
                    <TableCell>Station / Scope</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {userItem.firstName} {userItem.lastName}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{userItem.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{userItem.phoneNumber || 'No phone'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {userItem.roles.map((role) => (
                            <Chip key={role} label={role.replace('ROLE_', '')} size="small" color="primary" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>{userItem.agencyName || 'Platform-Wide'}</TableCell>
                      <TableCell>{userItem.stationName || userItem.region || 'National Scope'}</TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.active ? 'Active' : 'Disabled'}
                          color={userItem.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedUser(userItem);
                            setFirstName(userItem.firstName);
                            setLastName(userItem.lastName);
                            setPhoneNumber(userItem.phoneNumber || '');
                            setAgencyId(userItem.agencyId || '');
                            setRegion(userItem.region || '');
                            setStationId(userItem.stationId || '');
                            setSelectedRole(userItem.roles[0]?.replace('ROLE_', '') || 'CONTROL_ROOM_OPERATOR');
                            setEditDialogOpen(true);
                          }}
                          title="Edit User Details"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedUser(userItem);
                            setResetDialogOpen(true);
                          }}
                          title="Reset Password"
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>

                        {userItem.active ? (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deactivateMutation.mutate(userItem.id)}
                            title="Disable User"
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => reactivateMutation.mutate(userItem.id)}
                            title="Re-enable User"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        {isFilterActive
                          ? 'No internal users match the current search and filters.'
                          : 'No admin user accounts found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Internal User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate({
              email,
              firstName,
              lastName,
              phoneNumber,
              agencyId: agencyId || currentActor?.agencyId,
              region,
              stationId,
              roleCodes: [selectedRole],
            });
          }}
        >
          <DialogTitle fontWeight="bold">Create Internal Staff Account</DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>
              Note: To register field unit responders for emergency dispatch, please use the dedicated <strong>Field Responders</strong> workspace.
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </Grid>
              </Grid>
              <TextField fullWidth label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />

              <FormControl fullWidth required>
                <InputLabel>Operational Role</InputLabel>
                <Select value={selectedRole} label="Operational Role" onChange={(e) => setSelectedRole(e.target.value)}>
                  {hasRole('SYSTEM_ADMIN') && <MenuItem value="AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>}
                  <MenuItem value="REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                  <MenuItem value="STATION_ADMIN">STATION_ADMIN</MenuItem>
                  <MenuItem value="CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                  <MenuItem value="REPORT_REVIEWER">REPORT_REVIEWER</MenuItem>
                  <MenuItem value="AUDITOR">AUDITOR</MenuItem>
                </Select>
              </FormControl>

              {hasRole('SYSTEM_ADMIN') && (
                <FormControl fullWidth required>
                  <InputLabel>Assign Agency</InputLabel>
                  <Select value={agencyId} label="Assign Agency" onChange={(e) => setAgencyId(e.target.value)}>
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl fullWidth>
                <InputLabel>Station Scope (Optional)</InputLabel>
                <Select value={stationId} label="Station Scope (Optional)" onChange={(e) => setStationId(e.target.value)}>
                  <MenuItem value="">National / Agency Scope</MenuItem>
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
              {createUserMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">Edit Internal User — {selectedUser?.email}</DialogTitle>
        <DialogContent dividers>
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

            <FormControl fullWidth required>
              <InputLabel>Operational Role</InputLabel>
              <Select value={selectedRole} label="Operational Role" onChange={(e) => setSelectedRole(e.target.value)}>
                {hasRole('SYSTEM_ADMIN') && <MenuItem value="AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>}
                <MenuItem value="REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                <MenuItem value="STATION_ADMIN">STATION_ADMIN</MenuItem>
                <MenuItem value="CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                <MenuItem value="REPORT_REVIEWER">REPORT_REVIEWER</MenuItem>
                <MenuItem value="AUDITOR">AUDITOR</MenuItem>
              </Select>
            </FormControl>

            {hasRole('SYSTEM_ADMIN') && (
              <FormControl fullWidth required>
                <InputLabel>Assign Agency</InputLabel>
                <Select value={agencyId} label="Assign Agency" onChange={(e) => setAgencyId(e.target.value)}>
                  {agencies.map((agency) => (
                    <MenuItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Station Scope</InputLabel>
              <Select value={stationId} label="Station Scope" onChange={(e) => setStationId(e.target.value)}>
                <MenuItem value="">National / Agency Scope</MenuItem>
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
                agencyId,
                region,
                stationId,
                roleCodes: [selectedRole],
              })
            }
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Reset Password</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Reset password for <strong>{selectedUser?.email}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            A new temporary password will be generated. The user will be required to change it on their next sign-in.
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
            This temporary password will be shown <strong>only once</strong>. Provide it to the staff member.
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
