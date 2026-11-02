import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roleApi, RoleItem, PermissionItem } from '@/api/roleApi';
import { useAuthStore } from '@/auth/useAuthStore';

// Loads the complete backend permission catalog so System Administration can manage role mappings without maintaining a duplicate frontend permission list.
export const RolesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermCodes, setSelectedPermCodes] = useState<Set<string>>(new Set());

  const { data: roles, isLoading: loadingRoles, isError: errorRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: roleApi.getRoles,
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: roleApi.getPermissions,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, codes }: { roleId: string; codes: string[] }) =>
      roleApi.updateRolePermissions(roleId, codes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setConfirmOpen(false);
      setModalOpen(false);
      setSelectedRole(null);
    },
  });

  const handleOpenManageModal = (role: RoleItem) => {
    setSelectedRole(role);
    setSelectedPermCodes(new Set(role.permissionCodes || []));
    setSearchTerm('');
    setModalOpen(true);
  };

  const handleTogglePerm = (code: string) => {
    if (selectedRole?.code === 'SYSTEM_ADMIN' && PROTECTED_PERMS.has(code)) {
      return; // Core System Admin permissions cannot be unchecked
    }
    const next = new Set(selectedPermCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedPermCodes(next);
  };

  const PROTECTED_PERMS = new Set([
    'ROLE_READ',
    'ROLE_MANAGE',
    'ADMIN_USER_READ',
    'ADMIN_USER_MANAGE',
    'SYSTEM_SETTINGS_MANAGE',
  ]);

  // Group permissions by category
  const categories = Array.from(new Set(permissions?.map((p) => p.category) || ['System']));

  const originalCodes = new Set(selectedRole?.permissionCodes || []);
  const addedPerms = Array.from(selectedPermCodes).filter((c) => !originalCodes.has(c));
  const removedPerms = Array.from(originalCodes).filter((c) => !selectedPermCodes.has(c));
  const isDirty = addedPerms.length > 0 || removedPerms.length > 0;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      setModalOpen(false);
      setSelectedRole(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Roles & Permissions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Role-Based Access Control (RBAC) definitions and permission mappings
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loadingRoles ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={250} />
            </Box>
          ) : errorRoles ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="error" sx={{ display: 'inline-flex' }}>
                Unable to load roles and permissions catalog.
              </Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Role Code</TableCell>
                    <TableCell>Role Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Permissions Count</TableCell>
                    {isSysAdmin && <TableCell align="right">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles?.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {role.code}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${role.permissionCount} Permissions`}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      {isSysAdmin && (
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenManageModal(role)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Role & Permission Management Workspace Modal */}
      <Dialog open={modalOpen} onClose={handleCloseAttempt} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Role & Permission Management</Typography>

            <Typography variant="caption" color="text.secondary">
              Role: <strong>{selectedRole?.code}</strong> ({selectedRole?.name})
            </Typography>
          </Box>
          <IconButton onClick={handleCloseAttempt} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedRole && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Role Metadata Info */}
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Role Code</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedRole.code}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Role Name</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedRole.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Assigned Permissions</Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">{selectedPermCodes.size} selected</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{selectedRole.description}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Change Summary Banner */}
              {isDirty && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption" fontWeight="bold" display="block">
                    Pending Permission Changes:
                  </Typography>
                  {addedPerms.length > 0 && (
                    <Typography variant="caption" color="success.main" display="block">
                      + Added ({addedPerms.length}): {addedPerms.join(', ')}
                    </Typography>
                  )}
                  {removedPerms.length > 0 && (
                    <Typography variant="caption" color="error.main" display="block">
                      - Removed ({removedPerms.length}): {removedPerms.join(', ')}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Permission Search Input */}
              <TextField
                placeholder="Search permissions by code or description..."
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

              {/* Permission Categories Accordions */}
              <Box>
                {categories.map((cat) => {
                  const catPerms = permissions?.filter((p) => p.category === cat &&
                    (!searchTerm.trim() ||
                      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())))
                  ) || [];

                  if (catPerms.length === 0) return null;

                  const allCatSelected = catPerms.every((p) => selectedPermCodes.has(p.code));

                  const toggleCatAll = () => {
                    const next = new Set(selectedPermCodes);
                    if (allCatSelected) {
                      catPerms.forEach((p) => {
                        if (!(selectedRole.code === 'SYSTEM_ADMIN' && PROTECTED_PERMS.has(p.code))) {
                          next.delete(p.code);
                        }
                      });
                    } else {
                      catPerms.forEach((p) => next.add(p.code));
                    }
                    setSelectedPermCodes(next);
                  };

                  return (
                    <Accordion key={cat} defaultExpanded sx={{ mb: 1, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {cat} ({catPerms.filter((p) => selectedPermCodes.has(p.code)).length} / {catPerms.length})
                          </Typography>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); toggleCatAll(); }}>
                            {allCatSelected ? 'Unselect Category' : 'Select Category'}
                          </Button>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Grid container spacing={1}>
                          {catPerms.map((perm) => {
                            const isChecked = selectedPermCodes.has(perm.code);
                            const isProtected = selectedRole.code === 'SYSTEM_ADMIN' && PROTECTED_PERMS.has(perm.code);

                            return (
                              <Grid item xs={12} sm={6} key={perm.id}>
                                <Box sx={{ p: 1, border: '1px solid', borderColor: isChecked ? 'primary.light' : 'divider', borderRadius: 1.5, bgcolor: isChecked ? 'action.hover' : 'transparent' }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={isChecked}
                                        disabled={isProtected}
                                        onChange={() => handleTogglePerm(perm.code)}
                                        size="small"
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                                            {perm.code}
                                          </Typography>
                                          {isProtected && (
                                            <Chip icon={<LockIcon fontSize="small" />} label="Protected" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                          )}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {perm.description || perm.name}
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAttempt}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!isDirty || updatePermissionsMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog Before Save */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Confirm Permission Updates</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update permissions for role <strong>{selectedRole?.code}</strong>?
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5 }}>
            <Typography variant="caption" color="success.main" display="block">
              + Added: {addedPerms.length} permissions
            </Typography>
            <Typography variant="caption" color="error.main" display="block">
              - Removed: {removedPerms.length} permissions
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
            These changes will immediately update access rights for all staff accounts assigned to this role.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={updatePermissionsMutation.isPending}
            onClick={() => {
              if (selectedRole) {
                updatePermissionsMutation.mutate({
                  roleId: selectedRole.id,
                  codes: Array.from(selectedPermCodes) as string[],
                });
              }
            }}
          >
            {updatePermissionsMutation.isPending ? 'Saving...' : 'Confirm Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Discard Warning */}
      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Discard Unsaved Changes?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            You have unsaved permission modifications for <strong>{selectedRole?.code}</strong>. Closing without saving will discard your changes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>Continue Editing</Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setDiscardOpen(false);
              setModalOpen(false);
              setSelectedRole(null);
            }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
