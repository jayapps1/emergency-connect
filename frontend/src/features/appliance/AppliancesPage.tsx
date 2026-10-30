import React, { useState } from 'react';
import {
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
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BuildIcon from '@mui/icons-material/Build';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import ClearIcon from '@mui/icons-material/Clear';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applianceApi, ApplianceItem } from '@/api/applianceApi';
import { stationApi } from '@/api/stationApi';
import { agencyApi } from '@/api/agencyApi';
import { MetricCard } from '@/features/dashboard/MetricCard';
import { useAuthStore } from '@/auth/useAuthStore';

export const AppliancesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  // Dialog States
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [relocateOpen, setRelocateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceItem | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterStation, setFilterStation] = useState<string>('ALL');
  const [filterState, setFilterState] = useState<string>('ALL');

  // Form states
  const [callSign, setCallSign] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resourceType, setResourceType] = useState('FIRE_ENGINE');
  const [homeStationId, setHomeStationId] = useState('');
  const [regNum, setRegNum] = useState('');

  const [newStatus, setNewStatus] = useState('AVAILABLE');
  const [statusReason, setStatusReason] = useState('');
  const [targetStationId, setTargetStationId] = useState('');

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['applianceSummary'],
    queryFn: applianceApi.getSummary,
  });

  const { data: rawAppliances = [], isLoading: loadingAppliances } = useQuery({
    queryKey: ['appliances'],
    queryFn: applianceApi.getAppliances,
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
    enabled: isSysAdmin,
  });

  const { data: stationsPage } = useQuery({
    queryKey: ['stationsList'],
    queryFn: () => stationApi.getAdminStations(0, 100),
  });

  const { data: historyList = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['applianceHistory', selectedAppliance?.id],
    queryFn: () => applianceApi.getApplianceHistory(selectedAppliance!.id),
    enabled: Boolean(selectedAppliance?.id) && historyOpen,
  });

  const stations = stationsPage?.content || [];

  // Filtered Appliances Calculation
  const appliances = rawAppliances.filter((app) => {
    // 1. Search term match
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matchCallSign = app.callSign.toLowerCase().includes(q);
      const matchName = app.displayName.toLowerCase().includes(q);
      const matchReg = app.registrationNumber?.toLowerCase().includes(q);
      const matchHome = app.homeStationName?.toLowerCase().includes(q);
      const matchCurrent = app.currentStationName?.toLowerCase().includes(q);
      if (!matchCallSign && !matchName && !matchReg && !matchHome && !matchCurrent) {
        return false;
      }
    }

    // 2. Status filter
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'DISPATCHED') {
        const st = app.operationalStatus.toUpperCase();
        if (st !== 'DISPATCHED' && st !== 'EN_ROUTE' && st !== 'ON_SCENE') return false;
      } else if (app.operationalStatus.toUpperCase() !== filterStatus) {
        return false;
      }
    }

    // 3. Type filter
    if (filterType !== 'ALL' && app.resourceType.toUpperCase() !== filterType) {
      return false;
    }

    // 4. Agency filter
    if (filterAgency !== 'ALL' && app.agencyId !== filterAgency) {
      return false;
    }

    // 5. Station filter
    if (filterStation !== 'ALL') {
      if (app.homeStationId !== filterStation && app.currentStationId !== filterStation) {
        return false;
      }
    }

    // 6. Active state filter
    if (filterState === 'ACTIVE' && !app.active) return false;
    if (filterState === 'INACTIVE' && app.active) return false;

    return true;
  });

  const isFilterActive =
    Boolean(searchTerm) || filterStatus !== 'ALL' || filterType !== 'ALL' || filterAgency !== 'ALL' || filterStation !== 'ALL' || filterState !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterType('ALL');
    setFilterAgency('ALL');
    setFilterStation('ALL');
    setFilterState('ALL');
  };

  const createMutation = useMutation({
    mutationFn: applianceApi.createAppliance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setAddOpen(false);
      resetAddForm();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: { id: string; displayName?: string; resourceType?: string; homeStationId?: string; registrationNumber?: string }) =>
      applianceApi.updateAppliance(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setEditOpen(false);
      setManageOpen(false);
      setSelectedAppliance(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: string; reason?: string }) =>
      applianceApi.updateStatus(data.id, data.status, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setStatusOpen(false);
      setManageOpen(false);
      setSelectedAppliance(null);
    },
  });

  const relocateMutation = useMutation({
    mutationFn: (data: { id: string; currentStationId: string }) =>
      applianceApi.relocate(data.id, data.currentStationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setRelocateOpen(false);
      setManageOpen(false);
      setSelectedAppliance(null);
    },
  });

  const returnHomeMutation = useMutation({
    mutationFn: (id: string) => applianceApi.returnToHomeStation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setManageOpen(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => applianceApi.deactivateAppliance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      queryClient.invalidateQueries({ queryKey: ['applianceSummary'] });
      setDeactivateOpen(false);
      setManageOpen(false);
      setSelectedAppliance(null);
    },
  });

  const resetAddForm = () => {
    setCallSign('');
    setDisplayName('');
    setResourceType('FIRE_ENGINE');
    setHomeStationId('');
    setRegNum('');
  };

  const renderStatusChip = (status: string) => {
    const st = status.toUpperCase();
    switch (st) {
      case 'AVAILABLE':
        return <Chip label="Available" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'DISPATCHED':
      case 'EN_ROUTE':
      case 'ON_SCENE':
        return <Chip label="Dispatched" color="warning" size="small" icon={<AccessTimeIcon />} />;
      case 'OUT_OF_COMMISSION':
        return <Chip label="Out of Commission" color="error" size="small" icon={<WarningIcon />} />;
      case 'MAINTENANCE':
        return <Chip label="Maintenance" color="info" size="small" icon={<BuildIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {isSysAdmin ? 'Appliance Oversight' : 'Appliance Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isSysAdmin
              ? 'National read-only operational oversight across all responding agency fleets.'
              : 'Monitor and manage the operational availability of response appliances across your agency.'}
          </Typography>
        </Box>

        {!isSysAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Appliance
          </Button>
        )}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Total Appliances"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.total || 0}
            subtitle="Registered units"
            icon={<DirectionsCarIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Available"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.available || 0}
            subtitle="Ready for dispatch"
            icon={<CheckCircleIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendType="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Dispatched"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.atEmergency || 0}
            subtitle="Active response"
            icon={<AccessTimeIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            trendType="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Out of Commission"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.outOfCommission || 0}
            subtitle="Requires fault repair"
            icon={<WarningIcon />}
            iconBg="#FEF2F2"
            iconColor="#D32F2F"
            trendType="critical"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Maintenance"
            value={loadingSummary ? <Skeleton width={40} /> : summary?.maintenance || 0}
            subtitle="Scheduled service"
            icon={<BuildIcon />}
            iconBg="#F3F4F6"
            iconColor="#4B5563"
          />
        </Grid>
      </Grid>

      {/* Search & Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={isSysAdmin ? 2.5 : 3}>
              <TextField
                placeholder="Search call sign, unit, station..."
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

            {isSysAdmin && (
              <Grid item xs={6} sm={3} md={2}>
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
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="AVAILABLE">Available</MenuItem>
                  <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                  <MenuItem value="OUT_OF_COMMISSION">Out of Commission</MenuItem>
                  <MenuItem value="MAINTENANCE">Under Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Resource Type</InputLabel>
                <Select value={filterType} label="Resource Type" onChange={(e) => setFilterType(e.target.value)}>
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="FIRE_ENGINE">Fire Engine</MenuItem>
                  <MenuItem value="WATER_TENDER">Water Tender</MenuItem>
                  <MenuItem value="RESCUE_APPLIANCE">Rescue Appliance</MenuItem>
                  <MenuItem value="AERIAL_APPLIANCE">Aerial Appliance</MenuItem>
                  <MenuItem value="COMMAND_VEHICLE">Command Vehicle</MenuItem>
                  <MenuItem value="AMBULANCE">Ambulance Unit</MenuItem>
                  <MenuItem value="ADVANCED_LIFE_SUPPORT_AMBULANCE">ALS Ambulance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Station</InputLabel>
                <Select value={filterStation} label="Station" onChange={(e) => setFilterStation(e.target.value)}>
                  <MenuItem value="ALL">All Stations</MenuItem>
                  {stations.map((s: any) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {isFilterActive && (
                  <Button size="small" color="secondary" onClick={handleClearFilters} startIcon={<ClearIcon />}>
                    Clear
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Appliances Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Appliance Fleet & Operational Status
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {appliances.length} of {rawAppliances.length} registered appliances
            </Typography>
          </Box>

          {loadingAppliances ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {isSysAdmin && <TableCell>Agency</TableCell>}
                    <TableCell>Call Sign</TableCell>
                    <TableCell>Appliance / Unit</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Home Station</TableCell>
                    <TableCell>Current Station</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell align="right">{isSysAdmin ? 'Oversight' : 'Manage'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appliances.map((app) => (
                    <TableRow key={app.id} hover>
                      {isSysAdmin && <TableCell sx={{ fontWeight: 'bold' }}>{app.agencyId}</TableCell>}
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {app.callSign}
                      </TableCell>
                      <TableCell>{app.displayName}</TableCell>
                      <TableCell>{app.resourceType}</TableCell>
                      <TableCell>{app.homeStationName || 'Station'}</TableCell>
                      <TableCell>
                        {app.currentStationName || app.homeStationName || 'Station'}
                        {app.currentStationId && app.currentStationId !== app.homeStationId && (
                          <Chip label="Relocated" size="small" color="secondary" variant="outlined" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell>{renderStatusChip(app.operationalStatus)}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.active ? 'Active' : 'Retired'}
                          color={app.active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {isSysAdmin ? (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<HistoryIcon />}
                            onClick={() => {
                              setSelectedAppliance(app);
                              setHistoryOpen(true);
                            }}
                          >
                            History
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SettingsIcon />}
                            onClick={() => {
                              setSelectedAppliance(app);
                              setManageOpen(true);
                            }}
                          >
                            Manage
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {appliances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isSysAdmin ? 9 : 8} align="center" sx={{ py: 3 }}>
                        {isFilterActive
                          ? 'No appliances match the current search and filters.'
                          : 'No appliances have been registered.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Single Comprehensive Manage Appliance Modal */}
      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          Manage Appliance — {selectedAppliance?.callSign}
          <IconButton onClick={() => setManageOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAppliance && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Header Info */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {selectedAppliance.displayName} ({selectedAppliance.resourceType})
                  </Typography>

                  <Typography variant="caption" color="text.secondary" display="block">
                    Home Station: {selectedAppliance.homeStationName || 'Station'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Current Station: {selectedAppliance.currentStationName || selectedAppliance.homeStationName || 'Station'}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" fontWeight="bold">Status:</Typography>
                    {renderStatusChip(selectedAppliance.operationalStatus)}
                  </Box>
                </CardContent>
              </Card>

              {/* Action Operations Grid */}
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                OPERATIONAL ACTIONS
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<BuildIcon />}
                    onClick={() => {
                      setNewStatus(selectedAppliance.operationalStatus === 'EN_ROUTE' || selectedAppliance.operationalStatus === 'ON_SCENE' ? 'DISPATCHED' : selectedAppliance.operationalStatus);
                      setStatusReason(selectedAppliance.statusReason || '');
                      setStatusOpen(true);
                    }}
                  >
                    Change Status
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  {selectedAppliance.currentStationId && selectedAppliance.currentStationId !== selectedAppliance.homeStationId ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<HomeIcon />}
                      onClick={() => returnHomeMutation.mutate(selectedAppliance.id)}
                      disabled={returnHomeMutation.isPending}
                    >
                      Return Home
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => {
                        setTargetStationId(selectedAppliance.currentStationId || selectedAppliance.homeStationId);
                        setRelocateOpen(true);
                      }}
                    >
                      Relocate Unit
                    </Button>
                  )}
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setDisplayName(selectedAppliance.displayName);
                      setResourceType(selectedAppliance.resourceType);
                      setHomeStationId(selectedAppliance.homeStationId);
                      setRegNum(selectedAppliance.registrationNumber || '');
                      setEditOpen(true);
                    }}
                  >
                    Edit Details
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setHistoryOpen(true)}
                  >
                    View History
                  </Button>
                </Grid>
              </Grid>

              {selectedAppliance.active && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeactivateOpen(true)}
                  >
                    Deactivate / Retire Appliance
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Appliance Modal */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">Add New Response Appliance</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Call Sign"
              placeholder="e.g. GNFS-KOM-01"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Display Name / Title"
              placeholder="e.g. Fire Engine 1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Resource Type</InputLabel>
              <Select value={resourceType} label="Resource Type" onChange={(e) => setResourceType(e.target.value)}>
                <MenuItem value="FIRE_ENGINE">Fire Engine</MenuItem>
                <MenuItem value="WATER_TENDER">Water Tender</MenuItem>
                <MenuItem value="RESCUE_APPLIANCE">Rescue Appliance</MenuItem>
                <MenuItem value="AERIAL_APPLIANCE">Aerial Appliance</MenuItem>
                <MenuItem value="COMMAND_VEHICLE">Command Vehicle</MenuItem>
                <MenuItem value="AMBULANCE">Ambulance Unit</MenuItem>
                <MenuItem value="ADVANCED_LIFE_SUPPORT_AMBULANCE">ALS Ambulance</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Home Station</InputLabel>
              <Select value={homeStationId} label="Home Station" onChange={(e) => setHomeStationId(e.target.value)}>
                {stations.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Registration Number (Optional)"
              placeholder="e.g. GV 102-24"
              value={regNum}
              onChange={(e) => setRegNum(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              createMutation.mutate({
                callSign,
                displayName,
                resourceType,
                homeStationId,
                registrationNumber: regNum,
              })
            }
            disabled={!callSign || !displayName || !homeStationId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Add Appliance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Appliance Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">Edit Appliance — {selectedAppliance?.callSign}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Display Name / Title"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Resource Type</InputLabel>
              <Select value={resourceType} label="Resource Type" onChange={(e) => setResourceType(e.target.value)}>
                <MenuItem value="FIRE_ENGINE">Fire Engine</MenuItem>
                <MenuItem value="WATER_TENDER">Water Tender</MenuItem>
                <MenuItem value="RESCUE_APPLIANCE">Rescue Appliance</MenuItem>
                <MenuItem value="AERIAL_APPLIANCE">Aerial Appliance</MenuItem>
                <MenuItem value="COMMAND_VEHICLE">Command Vehicle</MenuItem>
                <MenuItem value="AMBULANCE">Ambulance Unit</MenuItem>
                <MenuItem value="ADVANCED_LIFE_SUPPORT_AMBULANCE">ALS Ambulance</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Home Station</InputLabel>
              <Select value={homeStationId} label="Home Station" onChange={(e) => setHomeStationId(e.target.value)}>
                {stations.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Registration Number"
              value={regNum}
              onChange={(e) => setRegNum(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              selectedAppliance &&
              editMutation.mutate({
                id: selectedAppliance.id,
                displayName,
                resourceType,
                homeStationId,
                registrationNumber: regNum,
              })
            }
            disabled={!displayName || !homeStationId || editMutation.isPending}
          >
            {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Update Operational Status</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Appliance: <strong>{selectedAppliance?.callSign}</strong> ({selectedAppliance?.displayName})
            </Typography>
            <FormControl fullWidth>
              <InputLabel>New Operational Status</InputLabel>
              <Select value={newStatus} label="New Operational Status" onChange={(e) => setNewStatus(e.target.value)}>
                <MenuItem value="AVAILABLE">Available</MenuItem>
                <MenuItem value="DISPATCHED">Dispatched (At Emergency)</MenuItem>
                <MenuItem value="OUT_OF_COMMISSION">Out of Commission</MenuItem>
                <MenuItem value="MAINTENANCE">Under Maintenance</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Status Reason / Fault Notes"
              placeholder="e.g. Pump fault or scheduled service"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              selectedAppliance &&
              statusMutation.mutate({
                id: selectedAppliance.id,
                status: newStatus,
                reason: statusReason,
              })
            }
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Relocate Modal */}
      <Dialog open={relocateOpen} onClose={() => setRelocateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Relocate Appliance</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Relocate <strong>{selectedAppliance?.callSign}</strong> to a temporary station without changing permanent home station ownership.
            </Typography>
            <FormControl fullWidth required>
              <InputLabel>Current Temporary Station</InputLabel>
              <Select value={targetStationId} label="Current Temporary Station" onChange={(e) => setTargetStationId(e.target.value)}>
                {stations.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelocateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() =>
              selectedAppliance &&
              relocateMutation.mutate({
                id: selectedAppliance.id,
                currentStationId: targetStationId,
              })
            }
            disabled={!targetStationId || relocateMutation.isPending}
          >
            {relocateMutation.isPending ? 'Relocating...' : 'Relocate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status History Modal */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          Status Transition History — {selectedAppliance?.callSign}
          <IconButton onClick={() => setHistoryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Skeleton variant="rectangular" height={150} />
          ) : historyList.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {historyList.map((h, idx) => (
                <Box key={h.id || idx} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {h.previousStatus && (
                        <Typography variant="body2" color="text.secondary">
                          {h.previousStatus} →
                        </Typography>
                      )}
                      <Chip label={h.newStatus} size="small" color="primary" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(h.changedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  {h.reason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Reason: "{h.reason}"
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              No status transitions recorded yet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate / Retire Modal */}
      <Dialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Deactivate / Retire Appliance</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Deactivate <strong>{selectedAppliance?.callSign}</strong> ({selectedAppliance?.displayName})?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            This appliance will no longer count toward operational availability. Its historical records and incident dispatch logs will be preserved in PostgreSQL.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => selectedAppliance && deactivateMutation.mutate(selectedAppliance.id)}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Appliance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
