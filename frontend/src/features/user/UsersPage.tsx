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
  Tooltip,
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
import KeyIcon from '@mui/icons-material/Key';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SecurityIcon from '@mui/icons-material/Security';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { agencyApi } from '@/api/agencyApi';
import { stationApi } from '@/api/stationApi';
import { userRequestApi } from '@/api/userRequestApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { AdminUser } from '@/types';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentActor, hasRole, hasPermission } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterAgency, setFilterAgency] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [assistedRecoveryOpen, setAssistedRecoveryOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);

  // Transfer Leadership Modal States
  const [transferLeadershipOpen, setTransferLeadershipOpen] = useState(false);
  const [transferRecipientId, setTransferRecipientId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Manage Staff Priorities Modal States
  const [managePrioritiesModalOpen, setManagePrioritiesModalOpen] = useState(false);
  const [priorityGroupAgencyId, setPriorityGroupAgencyId] = useState('ALL');
  const [priorityGroupRole, setPriorityGroupRole] = useState('AGENCY_ADMIN');
  const [assignPriorityDialogOpen, setAssignPriorityDialogOpen] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<AdminUser | null>(null);
  const [assignPriorityVal, setAssignPriorityVal] = useState<number | null>(2);

  // Assisted 2FA Recovery Form States
  const [verificationMethod, setVerificationMethod] = useState('IN_PERSON_VERIFICATION');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState('CONTROL_ROOM_OPERATOR');
  const [agencyId, setAgencyId] = useState('');
  const [region, setRegion] = useState('');
  const [stationId, setStationId] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<number | null>(null);

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

  const isAgencyLeadP1 =
    (currentActor?.roles?.includes('AGENCY_ADMIN') || currentActor?.roles?.includes('ROLE_AGENCY_ADMIN')) &&
    currentActor?.priorityLevel === 1;

  const eligibleTransferRecipients = rawUsers.filter(
    (u) =>
      u.active &&
      u.id !== currentActor?.id &&
      (u.roles.includes('AGENCY_ADMIN') || u.roles.includes('ROLE_AGENCY_ADMIN')) &&
      (!currentActor?.agencyId || u.agencyId === currentActor.agencyId)
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

  const canManageTargetUser = (target: AdminUser, action: 'EDIT' | 'DEACTIVATE' | 'RESET_PASSWORD') => {
    if (!currentActor) return false;

    // Self-protection: actor cannot deactivate or delete their own account
    if (currentActor.id === target.id && action === 'DEACTIVATE') {
      return false;
    }

    // System Admin can manage all target users
    if (isSysAdmin) {
      if ((target.roles.includes('SYSTEM_ADMIN') || target.roles.includes('ROLE_SYSTEM_ADMIN')) && target.id !== currentActor.id) {
        const actorPriority = currentActor.priorityLevel != null ? currentActor.priorityLevel : 999;
        const targetPriority = target.priorityLevel != null ? target.priorityLevel : 999;
        if (actorPriority > targetPriority && targetPriority === 1) return false;
      }
      return true;
    }

    // Non-System-Admin actors: require scope check & actor.priorityLevel < target.priorityLevel
    const actorPriority = currentActor.priorityLevel != null ? currentActor.priorityLevel : 999;
    const targetPriority = target.priorityLevel != null ? target.priorityLevel : 999;

    return actorPriority < targetPriority;
  };

  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setCreatedTempPassword(res.temporaryPassword);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create user account.');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; email: string; firstName: string; lastName: string; phoneNumber?: string; agencyId?: string; region?: string; stationId?: string; priorityLevel?: number | null; roleCodes?: string[] }) =>
      userApi.updateUser(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setAssignPriorityDialogOpen(false);
      setSelectedUser(null);
      setAssignTargetUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update user details.');
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

  const assistedRecoveryMutation = useMutation({
    mutationFn: () =>
      selectedUser
        ? userRequestApi.submitAssistedRecoveryRequest({
            targetUserId: selectedUser.id,
            verificationMethod,
            verificationNotes,
            reason: recoveryReason,
          })
        : Promise.reject('No target user'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
      setAssistedRecoveryOpen(false);
      setSelectedUser(null);
      setVerificationMethod('IN_PERSON_VERIFICATION');
      setVerificationNotes('');
      setRecoveryReason('');
      alert('Assisted 2FA recovery request submitted for System Admin approval.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to submit assisted 2FA recovery request.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: userApi.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to deactivate account.');
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
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to reset password.');
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
    setPriorityLevel(null);
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
            Manage operational administrative accounts, priority hierarchy, roles, and security credentials
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {(isSysAdmin || isAgencyLeadP1) && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<MilitaryTechIcon />}
              onClick={() => {
                setPriorityGroupAgencyId(currentActor?.agencyId || 'ALL');
                setPriorityGroupRole('AGENCY_ADMIN');
                setManagePrioritiesModalOpen(true);
              }}
            >
              Manage Priorities
            </Button>
          )}

          {(isSysAdmin || isAgencyLeadP1) && (
            <Button
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
              Transfer Agency Leadership
            </Button>
          )}

          {hasPermission('ADMIN_USER_CREATE') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              Add Staff Account
            </Button>
          )}
        </Box>
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
                    <TableCell>Priority</TableCell>
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
                  {users.map((userItem) => {
                    const pLevel = userItem.priorityLevel;
                    const canEdit = canManageTargetUser(userItem, 'EDIT');
                    const canDeactivate = canManageTargetUser(userItem, 'DEACTIVATE');
                    const canResetPass = canManageTargetUser(userItem, 'RESET_PASSWORD');

                    const isStationAdminRole =
                      userItem.roles.includes('STATION_ADMIN') || userItem.roles.includes('ROLE_STATION_ADMIN');

                    const scopeDisplay = isStationAdminRole
                      ? userItem.stationName || 'Station Unassigned'
                      : userItem.stationName || userItem.region || 'National Scope';

                    return (
                      <TableRow key={userItem.id} hover>
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
                        <TableCell>{scopeDisplay}</TableCell>
                        <TableCell>
                          <Chip
                            label={userItem.active ? 'Active' : 'Disabled'}
                            color={userItem.active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={canEdit ? 'Edit User Details' : 'You cannot modify an account with equal or higher administrative priority.'}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={!canEdit}
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setFirstName(userItem.firstName);
                                  setLastName(userItem.lastName);
                                  setPhoneNumber(userItem.phoneNumber || '');
                                  setAgencyId(userItem.agencyId || '');
                                  setRegion(userItem.region || '');
                                  setStationId(userItem.stationId || '');
                                  setPriorityLevel(userItem.priorityLevel ?? null);
                                  setSelectedRole(userItem.roles[0]?.replace('ROLE_', '') || 'CONTROL_ROOM_OPERATOR');
                                  setEditDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title={canResetPass ? 'Reset Password' : 'You cannot reset password for an account with equal or higher priority.'}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={!canResetPass}
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setResetDialogOpen(true);
                                }}
                              >
                                <LockResetIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          {userItem.id !== currentActor?.id && (
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                setSelectedUser(userItem);
                                setVerificationMethod('IN_PERSON_VERIFICATION');
                                setVerificationNotes('');
                                setRecoveryReason('');
                                setAssistedRecoveryOpen(true);
                              }}
                              title="Initiate Assisted 2FA Recovery"
                            >
                              <KeyIcon fontSize="small" />
                            </IconButton>
                          )}

                          {userItem.active ? (
                            <Tooltip title={canDeactivate ? 'Disable User' : userItem.id === currentActor?.id ? 'You cannot disable your own account.' : 'You cannot disable an account with equal or higher priority.'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={!canDeactivate}
                                  onClick={() => deactivateMutation.mutate(userItem.id)}
                                >
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip title={canEdit ? 'Re-enable User' : 'You cannot re-enable an account with equal or higher priority.'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="success"
                                  disabled={!canEdit}
                                  onClick={() => reactivateMutation.mutate(userItem.id)}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
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

      {/* Staff Priority Management Modal */}
      <Dialog open={managePrioritiesModalOpen} onClose={() => setManagePrioritiesModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight="bold">Staff Priority Management</DialogTitle>
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
                  <MenuItem value="SYSTEM_ADMIN">SYSTEM_ADMIN (National Administration)</MenuItem>
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
                  const isSelfP1 = u.id === currentActor?.id && pLevel === 1;

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
                          {!isSelfP1 && (
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
                          )}
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

          {assignTargetUser?.id === currentActor?.id && assignTargetUser?.priorityLevel === 1 ? (
            <Alert severity="warning" sx={{ my: 1 }}>
              <strong>Priority 1 — Lead Administrator</strong>
              <br />
              Your leadership priority cannot be changed directly. Use Transfer Leadership to hand over this position.
            </Alert>
          ) : (
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignPriorityDialogOpen(false)}>Cancel</Button>
          {assignTargetUser?.id === currentActor?.id && assignTargetUser?.priorityLevel === 1 ? (
            <Button
              variant="contained"
              color="warning"
              startIcon={<SwapHorizIcon />}
              onClick={() => {
                setAssignPriorityDialogOpen(false);
                setTransferRecipientId('');
                setTransferPassword('');
                setTransferReason('');
                setTransferLeadershipOpen(true);
              }}
            >
              Transfer Leadership
            </Button>
          ) : (
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
          )}
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
              priorityLevel,
              roleCodes: [selectedRole],
            });
          }}
        >
          <DialogTitle fontWeight="bold">Create Internal Staff Account</DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>
              Note: Priorities establish administrative management hierarchy. Select 'Not Assigned' for operational staff.
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

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Operational Role</InputLabel>
                    <Select value={selectedRole} label="Operational Role" onChange={(e) => setSelectedRole(e.target.value)}>
                      {isSysAdmin && <MenuItem value="AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>}
                      <MenuItem value="REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                      <MenuItem value="STATION_ADMIN">STATION_ADMIN</MenuItem>
                      <MenuItem value="CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                      <MenuItem value="REPORT_REVIEWER">REPORT_REVIEWER</MenuItem>
                      <MenuItem value="AUDITOR">AUDITOR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority Level</InputLabel>
                    <Select
                      value={priorityLevel ?? ''}
                      label="Priority Level"
                      onChange={(e) => setPriorityLevel(e.target.value === '' ? null : Number(e.target.value))}
                    >
                      <MenuItem value="">Not Assigned</MenuItem>
                      {isSysAdmin && <MenuItem value={1}>Priority 1 (Agency Lead)</MenuItem>}
                      <MenuItem value={2}>Priority 2 (Senior Admin)</MenuItem>
                      <MenuItem value={3}>Priority 3 (Staff Operator)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {isSysAdmin && (
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

      {/* Initiate Assisted 2FA Recovery Dialog for Locked-Out Staff */}
      <Dialog open={assistedRecoveryOpen} onClose={() => setAssistedRecoveryOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Initiate Assisted 2FA Recovery</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Staff Member: <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> ({selectedUser?.email})
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Initiating assisted recovery records your identity check and forwards the request directly to System Administration for final 2FA code authorization.
          </Alert>

          <FormControl fullWidth size="small" margin="normal">
            <InputLabel>Identity Verification Method</InputLabel>
            <Select
              value={verificationMethod}
              label="Identity Verification Method"
              onChange={(e) => setVerificationMethod(e.target.value)}
            >
              <MenuItem value="IN_PERSON_VERIFICATION">In-Person Verification</MenuItem>
              <MenuItem value="OFFICIAL_ID_CHECK">Official Agency ID Card Check</MenuItem>
              <MenuItem value="SECURITY_CALL">Recorded Security Verification Call</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Verification Notes"
            placeholder="e.g. Verified official national ID card in-person at headquarters..."
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Justification Reason"
            placeholder="e.g. Staff member locked out of authenticator device following phone replacement..."
            value={recoveryReason}
            onChange={(e) => setRecoveryReason(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssistedRecoveryOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={assistedRecoveryMutation.isPending || !verificationNotes.trim() || !recoveryReason.trim()}
            onClick={() => assistedRecoveryMutation.mutate()}
          >
            {assistedRecoveryMutation.isPending ? 'Initiating...' : 'Submit Assisted Recovery'}
          </Button>
        </DialogActions>
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

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Operational Role</InputLabel>
                  <Select value={selectedRole} label="Operational Role" onChange={(e) => setSelectedRole(e.target.value)}>
                    {isSysAdmin && <MenuItem value="AGENCY_ADMIN">AGENCY_ADMIN</MenuItem>}
                    <MenuItem value="REGIONAL_ADMIN">REGIONAL_ADMIN</MenuItem>
                    <MenuItem value="STATION_ADMIN">STATION_ADMIN</MenuItem>
                    <MenuItem value="CONTROL_ROOM_OPERATOR">CONTROL_ROOM_OPERATOR</MenuItem>
                    <MenuItem value="REPORT_REVIEWER">REPORT_REVIEWER</MenuItem>
                    <MenuItem value="AUDITOR">AUDITOR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority Level</InputLabel>
                  <Select
                    value={priorityLevel ?? ''}
                    label="Priority Level"
                    onChange={(e) => setPriorityLevel(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <MenuItem value="">Not Assigned</MenuItem>
                    {isSysAdmin && <MenuItem value={1}>Priority 1 (Agency Lead)</MenuItem>}
                    <MenuItem value={2}>Priority 2 (Senior Admin)</MenuItem>
                    <MenuItem value={3}>Priority 3 (Staff Operator)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {isSysAdmin && (
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
                priorityLevel,
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
