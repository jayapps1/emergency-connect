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
  MenuItem,
  Select,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '@/api/categoryApi';
import { locationTrackingApi } from '@/api/locationTrackingApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { IncidentCategory } from '@/types';

export const TrackingManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('INCIDENT_LOCATION');

  // Category Policies Query
  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
  });

  // Active Sessions Query
  const {
    data: sessionsPage,
    isLoading: isLoadingSessions,
    isError: isErrorSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['locationSessions'],
    queryFn: () => locationTrackingApi.getLocationSessions(0, 20),
  });

  // Updates the policy only after the backend confirms persistence, preventing the table from showing configuration that was never saved.
  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, policy }: { id: string; policy: string }) =>
      locationTrackingApi.updateCategoryTrackingPolicy(id, policy),
    onSuccess: () => {
      setPolicyDialogOpen(false);
      setSelectedCategory(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => locationTrackingApi.revokeLocationSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSessions'] });
    },
  });

  const sessions = sessionsPage?.content || [];

  const handleOpenPolicyDialog = (cat: IncidentCategory) => {
    setSelectedCategory(cat);
    setSelectedPolicy((cat as any).trackingPolicy || 'INCIDENT_LOCATION');
    setPolicyDialogOpen(true);
  };

  const getPolicyChip = (policy: string) => {
    switch (policy) {
      case 'INCIDENT_LOCATION':
      case 'SNAPSHOT_DEFAULT':
      case 'SNAPSHOT_ONLY':
        return <Chip label="INCIDENT LOCATION" color="default" size="small" />;
      case 'LIVE_OPTIONAL':
        return <Chip label="LIVE OPTIONAL" color="info" size="small" />;
      case 'LIVE_RECOMMENDED':
        return <Chip label="LIVE RECOMMENDED" color="warning" size="small" />;
      default:
        return <Chip label={policy} size="small" />;
    }
  };

  const getSessionStatusChip = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Chip label="ACTIVE" color="success" size="small" />;
      case 'STOPPED_BY_CITIZEN':
        return <Chip label="STOPPED BY CITIZEN" color="default" size="small" />;
      case 'INCIDENT_RESOLVED':
        return <Chip label="RESOLVED" color="primary" size="small" />;
      case 'REVOKED_BY_STAFF':
      case 'REVOKED':
        return <Chip label="REVOKED" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <GpsFixedIcon color="primary" fontSize="large" />
          <Typography variant="h4" fontWeight="bold">
            Emergency Location & Response Tracking Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure category tracking policies and monitor operational consent-based live tracking sessions.
          {!isSysAdmin && ' Tracking policies are configured nationally by System Administration.'}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label="Category Tracking Policies" />
          <Tab label={`Active Emergency Tracking Sessions (${sessions.length})`} />
        </Tabs>
      </Box>

      {/* Tab 0: Category Policies */}
      {tabValue === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoadingCategories ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={250} />
              </Box>
            ) : isErrorCategories ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
                  Unable to load tracking policies.
                </Alert>
                <Box>
                  <Button variant="outlined" onClick={() => refetchCategories()}>
                    Retry
                  </Button>
                </Box>
              </Box>
            ) : (categories?.length || 0) === 0 ? (
              // Show the empty state only after a successful response confirms that no tracking-policy records are available.
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No incident categories configured.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category Code</TableCell>
                      <TableCell>Category Name</TableCell>
                      <TableCell>Default Severity</TableCell>
                      <TableCell>Report Mode</TableCell>
                      <TableCell>Tracking Policy</TableCell>
                      {isSysAdmin && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories?.map((cat) => (
                      <TableRow key={cat.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{cat.code}</TableCell>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell>
                          <Chip label={cat.defaultSeverity} size="small" />
                        </TableCell>
                        <TableCell>
                          {cat.supportsSilent ? (
                            <Chip label="SILENT" size="small" color="secondary" />
                          ) : (
                            <Chip label="GENERAL" size="small" color="primary" />
                          )}
                        </TableCell>
                        <TableCell>{getPolicyChip((cat as any).trackingPolicy || 'INCIDENT_LOCATION')}</TableCell>
                        {isSysAdmin && (
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => handleOpenPolicyDialog(cat)}
                            >
                              Edit Policy
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
      )}

      {/* Tab 1: Active Tracking Sessions */}
      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoadingSessions ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={250} />
              </Box>
            ) : isErrorSessions ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
                  Unable to load active tracking sessions.
                </Alert>
                <Box>
                  <Button variant="outlined" onClick={() => refetchSessions()}>
                    Retry
                  </Button>
                </Box>
              </Box>
            ) : sessions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No active or recent emergency live tracking sessions.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Session ID</TableCell>
                      <TableCell>Tracking Policy</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Started At</TableCell>
                      <TableCell>Last Location Update</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.map((sess) => (
                      <TableRow key={sess.sessionId} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {sess.sessionId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{getPolicyChip(sess.trackingPolicy)}</TableCell>
                        <TableCell>{getSessionStatusChip(sess.status)}</TableCell>
                        <TableCell>{new Date(sess.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {sess.lastLocationAt
                            ? new Date(sess.lastLocationAt).toLocaleTimeString()
                            : 'Pending Update'}
                        </TableCell>
                        <TableCell align="right">
                          {sess.status === 'ACTIVE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<BlockIcon />}
                              onClick={() => revokeSessionMutation.mutate(sess.sessionId)}
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Policy Edit Dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Category Tracking Policy</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Updating tracking policy for <strong>{selectedCategory?.name}</strong>. Future emergency submissions in this category will apply this policy.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Select Tracking Mode:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedPolicy}
            onChange={(e) => setSelectedPolicy(e.target.value)}
          >
            <MenuItem value="INCIDENT_LOCATION">INCIDENT LOCATION (Standard Emergency Location)</MenuItem>
            <MenuItem value="LIVE_OPTIONAL">LIVE OPTIONAL (Option Offered to Citizen)</MenuItem>
            <MenuItem value="LIVE_RECOMMENDED">LIVE RECOMMENDED (Strong Recommendation)</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={updatePolicyMutation.isPending}
            onClick={() => {
              if (selectedCategory) {
                updatePolicyMutation.mutate({ id: selectedCategory.id, policy: selectedPolicy });
              }
            }}
          >
            Save Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
