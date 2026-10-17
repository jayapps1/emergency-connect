import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Skeleton,
  Switch,
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AddIcon from '@mui/icons-material/Add';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import MapIcon from '@mui/icons-material/Map';
import EditLocationIcon from '@mui/icons-material/EditLocation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agencyApi } from '@/api/agencyApi';
import { stationApi } from '@/api/stationApi';
import { referenceApi } from '@/api/referenceApi';
import { DistrictRef, RegionRef, StationContactType, StationLevel } from '@/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { LocationPickerModal } from './LocationPickerModal';

export const StationsPage: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(user?.agencyId || '');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [createStationOpen, setCreateStationOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [createMapPickerOpen, setCreateMapPickerOpen] = useState(false);
  const [updateLocationOpen, setUpdateLocationOpen] = useState(false);
  const [updateMapPickerOpen, setUpdateMapPickerOpen] = useState(false);

  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(null);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);

  // Station creation fields
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [stationLevel, setStationLevel] = useState<StationLevel>('DISTRICT_STATION');
  const [selectedRegion, setSelectedRegion] = useState<RegionRef | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRef | null>(null);
  const [locality, setLocality] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);

  // Station location & details update form fields
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editLocality, setEditLocality] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAccuracy, setEditAccuracy] = useState<number | null>(null);

  // Primary Contact fields for Station Creation
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryContactType, setPrimaryContactType] = useState<StationContactType>('WATCHROOM');
  const [primaryPriority, setPrimaryPriority] = useState(1);
  const [primaryIsPublic, setPrimaryIsPublic] = useState(true);
  const [primaryIs24Hour, setPrimaryIs24Hour] = useState(true);

  // Additional Contact fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactType, setContactType] = useState<StationContactType>('WATCHROOM');
  const [priority, setPriority] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [is24Hour, setIs24Hour] = useState(true);

  const queryClient = useQueryClient();

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: referenceApi.getRegions,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts', selectedRegion?.id],
    queryFn: () => referenceApi.getDistrictsByRegion(selectedRegion!.id),
    enabled: Boolean(selectedRegion?.id),
  });

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
    enabled: isSysAdmin,
  });

  const activeAgencyId = user?.agencyId || selectedAgencyId || (agencies && agencies.length > 0 ? agencies[0].id : '');

  const { data: stationsPage, isLoading: loadingStations } = useQuery({
    queryKey: ['adminStations', 0],
    queryFn: () => stationApi.getAdminStations(0, 50),
  });

  const { data: stationDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['stationDetails', selectedStationId],
    queryFn: () => stationApi.getStationDetails(selectedStationId!),
    enabled: Boolean(selectedStationId),
  });

  const createStationMutation = useMutation({
    mutationFn: stationApi.createStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStations'] });
      setCreateStationOpen(false);
      setCreateErrorMessage(null);
      setUpdateSuccessMessage('Station created successfully.');
      setTimeout(() => setUpdateSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setCreateErrorMessage(err.response?.data?.message || err.message || 'Failed to create emergency station.');
    },
  });

  const updateStationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => stationApi.updateStation(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminStations'] });
      await queryClient.invalidateQueries({ queryKey: ['stationDetails', selectedStationId] });
      setUpdateSuccessMessage('Station location updated successfully.');
      setTimeout(() => setUpdateSuccessMessage(null), 4000);
      setUpdateLocationOpen(false);
      setUpdateErrorMessage(null);
    },
    onError: (err: any) => {
      setUpdateErrorMessage(err.response?.data?.message || err.message || 'Failed to update station location.');
    },
  });

  const verifyStationMutation = useMutation({
    mutationFn: stationApi.verifyStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStations'] });
      queryClient.invalidateQueries({ queryKey: ['stationDetails', selectedStationId] });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: ({ stationId, data }: { stationId: string; data: any }) =>
      stationApi.createStationContact(stationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stationDetails', selectedStationId] });
      setAddContactOpen(false);
      setContactErrorMessage(null);
    },
    onError: (err: any) => {
      setContactErrorMessage(err.response?.data?.message || err.message || 'Failed to create station contact.');
    },
  });

  const verifyContactMutation = useMutation({
    mutationFn: stationApi.verifyStationContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stationDetails', selectedStationId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to verify contact.');
    },
  });

  const handleCaptureLocationForCreate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(Math.round(position.coords.accuracy));
        },
        (error) => {
          alert('Unable to capture location: ' + error.message);
        }
      );
    } else {
      alert('Browser geolocation is not supported.');
    }
  };

  const handleCaptureLocationForUpdate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          setEditLat(lat);
          setEditLng(lng);
          setEditAccuracy(Math.round(position.coords.accuracy));
        },
        (error) => {
          alert('Unable to capture location: ' + error.message);
        }
      );
    } else {
      alert('Browser geolocation is not supported.');
    }
  };

  const handleOpenCreateStation = () => {
    setStationName('');
    setStationCode('');
    setStationLevel('DISTRICT_STATION');
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setLocality('');
    setLatitude(null);
    setLongitude(null);
    setAccuracy(undefined);
    setPrimaryPhone('');
    setPrimaryContactType('WATCHROOM');
    setPrimaryPriority(1);
    setPrimaryIsPublic(true);
    setPrimaryIs24Hour(true);
    setCreateErrorMessage(null);
    setCreateStationOpen(true);
  };

  const handleCreateStationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrorMessage(null);

    const agencyToUse = isSysAdmin ? selectedAgencyId : (user?.agencyId || activeAgencyId);
    if (!agencyToUse) {
      setCreateErrorMessage('Please select an Agency for this station.');
      return;
    }

    if (!selectedRegion) {
      setCreateErrorMessage('Please select a region.');
      return;
    }

    if (stationLevel === 'DISTRICT_STATION' && !selectedDistrict) {
      setCreateErrorMessage('District is required for a District Station.');
      return;
    }

    if (latitude == null || longitude == null) {
      setCreateErrorMessage('Please select or confirm station coordinates on the map.');
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) {
      setCreateErrorMessage('Invalid coordinates. Please select valid location coordinates.');
      return;
    }

    createStationMutation.mutate({
      agencyId: agencyToUse,
      name: stationName,
      code: stationCode,
      stationLevel: stationLevel,
      region: selectedRegion.name,
      district: selectedDistrict ? selectedDistrict.name : undefined,
      regionId: selectedRegion.id,
      districtId: selectedDistrict ? selectedDistrict.id : undefined,
      locality: locality || undefined,
      latitude,
      longitude,
      locationAccuracyMeters: accuracy,
      primaryContact: primaryPhone ? {
        phoneNumber: primaryPhone,
        type: primaryContactType,
        priority: primaryPriority,
        publicContact: primaryIsPublic,
        available24Hour: primaryIs24Hour,
      } : undefined,
    });
  };

  const handleOpenUpdateLocation = () => {
    if (station) {
      setEditName(station.name);
      setEditRegion(station.region);
      setEditDistrict(station.district);
      setEditLocality(station.locality || '');
      setEditLat(station.latitude);
      setEditLng(station.longitude);
      setEditAccuracy(station.locationAccuracyMeters ?? null);
      setUpdateErrorMessage(null);
      setUpdateLocationOpen(true);
    }
  };

  const handleSaveUpdatedLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateErrorMessage(null);

    if (!station) return;

    if (editLat == null || editLng == null) {
      setUpdateErrorMessage('Please select or confirm station coordinates on the map.');
      return;
    }

    if (editLat < -90 || editLat > 90 || editLng < -180 || editLng > 180 || (editLat === 0 && editLng === 0)) {
      setUpdateErrorMessage('Invalid coordinates. Please select valid location coordinates.');
      return;
    }

    updateStationMutation.mutate({
      id: station.id,
      data: {
        name: editName || station.name,
        region: editRegion || station.region,
        district: editDistrict || station.district,
        locality: editLocality || undefined,
        latitude: editLat,
        longitude: editLng,
        locationAccuracyMeters: editAccuracy,
      },
    });
  };

  const handleOpenAddContact = () => {
    setPhoneNumber('');
    setContactType('WATCHROOM');
    const usedPriorities = contacts.map((c) => c.priority);
    const nextPriority = usedPriorities.length > 0 ? Math.max(...usedPriorities) + 1 : 1;
    setPriority(nextPriority);
    setIsPublic(true);
    setIs24Hour(true);
    setContactErrorMessage(null);
    setAddContactOpen(true);
  };

  const handleCreateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactErrorMessage(null);
    if (selectedStationId) {
      createContactMutation.mutate({
        stationId: selectedStationId,
        data: {
          phoneNumber,
          type: contactType,
          priority,
          publicContact: isPublic,
          available24Hour: is24Hour,
        },
      });
    }
  };

  const allStations = stationsPage?.content || [];
  const filteredStations = selectedAgencyId
    ? allStations.filter((s) => s.agencyId === selectedAgencyId)
    : allStations;

  const station = stationDetails?.station;
  const contacts = stationDetails?.contacts || [];
  const usedPriorities = contacts.map((c) => c.priority);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Station & Contact Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage stations, administrative levels (NHQ, RHQ, District), Ghana regions/districts, and contacts
          </Typography>
        </div>

        {hasPermission('STATION_CREATE') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateStation}>
            New Station
          </Button>
        )}
      </Box>

      {updateSuccessMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {updateSuccessMessage}
        </Alert>
      )}

      {isSysAdmin && agencies && agencies.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <TextField
              select
              label="Filter by Agency"
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">All Agencies</MenuItem>
              {agencies.map((agency) => (
                <MenuItem key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code})
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Stations List
                </Typography>
              </Box>
              <Divider />

              {loadingStations ? (
                <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Station</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Verified</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStations.map((s) => (
                        <TableRow
                          key={s.id}
                          hover
                          selected={selectedStationId === s.id}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedStationId(s.id)}
                        >
                          <TableCell sx={{ fontWeight: 'bold' }}>{s.name}</TableCell>
                          <TableCell>
                            <Chip label={s.stationLevel || 'DISTRICT_STATION'} size="small" variant="outlined" color="primary" />
                          </TableCell>
                          <TableCell>{s.region}</TableCell>
                          <TableCell>
                            {s.verified ? (
                              <CheckCircleIcon color="primary" fontSize="small" />
                            ) : (
                              <Chip label="Unverified" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            No stations found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          {selectedStationId ? (
            loadingDetails ? (
              <Skeleton variant="rectangular" height={300} />
            ) : station ? (
              <Box>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {station.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!station.verified && hasPermission('STATION_VERIFY') && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<VerifiedUserIcon />}
                            onClick={() => verifyStationMutation.mutate(station.id)}
                          >
                            Verify Station
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Code: <strong>{station.code}</strong> | Level: <strong>{station.stationLevel || 'DISTRICT_STATION'}</strong> | Region: <strong>{station.region}</strong> | District: <strong>{station.district}</strong>
                    </Typography>

                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnIcon color="primary" />
                          <Typography variant="body2" fontWeight="bold">
                            Coordinates: {station.latitude}, {station.longitude}
                          </Typography>
                        </Box>

                        {hasPermission('STATION_UPDATE') && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditLocationIcon />}
                            onClick={handleOpenUpdateLocation}
                            disabled={updateStationMutation.isPending}
                          >
                            Update Location
                          </Button>
                        )}
                      </Box>

                      {station.locationAccuracyMeters != null ? (
                        <Typography variant="caption" color="text.secondary">
                          Source Accuracy: ±{station.locationAccuracyMeters}m (Device Geolocation)
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Location Source: Map Selection
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Station Contacts Section */}
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Station Contacts
                      </Typography>
                      {hasPermission('STATION_CONTACT_CREATE') && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleOpenAddContact}
                        >
                          Add Contact
                        </Button>
                      )}
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Priority</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Phone Number</TableCell>
                            <TableCell>24/7</TableCell>
                            <TableCell>Visibility</TableCell>
                            <TableCell>Verified</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {contacts.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell sx={{ fontWeight: 'bold' }}>#{c.priority}</TableCell>
                              <TableCell><Chip label={c.type} size="small" variant="outlined" /></TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PhoneIcon fontSize="small" color="primary" />
                                  {c.phoneNumber}
                                </Box>
                              </TableCell>
                              <TableCell>{c.is24Hour ? <Chip label="24/7" size="small" color="success" /> : 'No'}</TableCell>
                              <TableCell>
                                {c.publicContact ? (
                                  <Chip label="Public" size="small" color="primary" />
                                ) : (
                                  <Chip label="Internal" size="small" color="default" />
                                )}
                              </TableCell>
                              <TableCell>
                                {c.verified ? (
                                  <CheckCircleIcon color="primary" fontSize="small" />
                                ) : hasPermission('STATION_CONTACT_VERIFY') ? (
                                  <Tooltip title={!station.verified ? 'Verify station first' : ''}>
                                    <span>
                                      <Button
                                        size="small"
                                        disabled={!station.verified}
                                        onClick={() => verifyContactMutation.mutate(c.id)}
                                      >
                                        Verify
                                      </Button>
                                    </span>
                                  </Tooltip>
                                ) : (
                                  'Unverified'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {contacts.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                No contacts assigned to this station yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            ) : null
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <Typography color="text.secondary">
                Select a station from the list to manage details and contact numbers.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Create Station Dialog */}
      <Dialog open={createStationOpen} onClose={() => setCreateStationOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateStationSubmit}>
          <DialogTitle>Create New Emergency Station</DialogTitle>
          <DialogContent>
            {createErrorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createErrorMessage}
              </Alert>
            )}

            {isSysAdmin && (
              <TextField
                select
                fullWidth
                label="Agency *"
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                margin="normal"
                required
              >
                {(agencies || []).map((agency) => (
                  <MenuItem key={agency.id} value={agency.id}>
                    {agency.name} ({agency.code})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              fullWidth
              label="Station Code (Unique)"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Station Name"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              margin="normal"
              required
            />

            <TextField
              select
              fullWidth
              label="Administrative Station Level"
              value={stationLevel}
              onChange={(e) => setStationLevel(e.target.value as StationLevel)}
              margin="normal"
              required
            >
              <MenuItem value="NHQ">National Headquarters (NHQ)</MenuItem>
              <MenuItem value="RHQ">Regional Headquarters (RHQ)</MenuItem>
              <MenuItem value="DISTRICT_STATION">District Station</MenuItem>
            </TextField>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <Autocomplete
                  options={regions || []}
                  getOptionLabel={(option) => option.name}
                  value={selectedRegion}
                  onChange={(_, newValue) => {
                    setSelectedRegion(newValue);
                    setSelectedDistrict(null);
                  }}
                  renderInput={(params) => <TextField {...params} label="Region *" required />}
                />
              </Grid>
              <Grid item xs={6}>
                <Autocomplete
                  options={districts || []}
                  getOptionLabel={(option) => option.name}
                  value={selectedDistrict}
                  onChange={(_, newValue) => setSelectedDistrict(newValue)}
                  disabled={!selectedRegion}
                  renderInput={(params) => <TextField {...params} label="District *" required={stationLevel === 'DISTRICT_STATION'} />}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Locality / Town"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              margin="normal"
            />

            {/* Station Location Map Section */}
            <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Station Geographic Location
                </Typography>

                {latitude != null && longitude != null ? (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Location Selected"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    label="No map location selected"
                    color="warning"
                    size="small"
                  />
                )}
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Latitude *"
                    type="number"
                    value={latitude != null ? latitude : ''}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Longitude *"
                    type="number"
                    value={longitude != null ? longitude : ''}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                    size="small"
                    required
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<MapIcon />}
                  onClick={() => setCreateMapPickerOpen(true)}
                  size="small"
                >
                  Select on Map
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<MyLocationIcon />}
                  onClick={handleCaptureLocationForCreate}
                  size="small"
                >
                  Use Current Location
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Primary Emergency Contact
            </Typography>

            <TextField
              fullWidth
              label="Emergency Phone Number (e.g. 0300000001)"
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value)}
              margin="normal"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="Contact Type"
                  value={primaryContactType}
                  onChange={(e) => setPrimaryContactType(e.target.value as StationContactType)}
                  margin="normal"
                >
                  <MenuItem value="WATCHROOM">Watchroom</MenuItem>
                  <MenuItem value="CONTROL_ROOM">Control Room</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency Direct</MenuItem>
                  <MenuItem value="ALTERNATIVE">Alternative Line</MenuItem>
                  <MenuItem value="ADMINISTRATIVE">Administrative</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Priority (1 = Highest)"
                  type="number"
                  value={primaryPriority}
                  onChange={(e) => setPrimaryPriority(parseInt(e.target.value) || 1)}
                  margin="normal"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 1, display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={<Switch checked={primaryIsPublic} onChange={(e) => setPrimaryIsPublic(e.target.checked)} />}
                label={primaryIsPublic ? "Publicly Visible (Available on Mobile App)" : "Internal Admin Only (Hidden from Public App)"}
              />
              <FormControlLabel
                control={<Switch checked={primaryIs24Hour} onChange={(e) => setPrimaryIs24Hour(e.target.checked)} />}
                label="Available 24/7"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateStationOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createStationMutation.isPending}>
              {createStationMutation.isPending ? 'Creating...' : 'Create Station'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Map Location Picker Dialog for Create Station */}
      <LocationPickerModal
        open={createMapPickerOpen}
        onClose={() => setCreateMapPickerOpen(false)}
        initialLat={latitude}
        initialLng={longitude}
        regionName={selectedRegion?.name}
        districtName={selectedDistrict?.name}
        onConfirm={(selectedLat, selectedLng, suggestedLocality) => {
          setLatitude(selectedLat);
          setLongitude(selectedLng);
          setAccuracy(undefined);
          if (suggestedLocality && !locality) {
            setLocality(suggestedLocality);
          }
        }}
      />

      {/* Edit Station Location & Details Dialog */}
      {station && (
        <Dialog open={updateLocationOpen} onClose={() => setUpdateLocationOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSaveUpdatedLocationSubmit}>
            <DialogTitle>Update Station Location & Details</DialogTitle>
            <DialogContent>
              {updateErrorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {updateErrorMessage}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Station Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                margin="normal"
                required
              />

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Region"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="District"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    required
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Locality / Town"
                value={editLocality}
                onChange={(e) => setEditLocality(e.target.value)}
                margin="normal"
              />

              <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Station Location Coordinates
                  </Typography>

                  {editLat != null && editLng != null ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Location Selected"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label="No map location selected"
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Latitude *"
                      type="number"
                      value={editLat != null ? editLat : ''}
                      onChange={(e) => setEditLat(e.target.value ? parseFloat(e.target.value) : null)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Longitude *"
                      type="number"
                      value={editLng != null ? editLng : ''}
                      onChange={(e) => setEditLng(e.target.value ? parseFloat(e.target.value) : null)}
                      size="small"
                      required
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<MapIcon />}
                    onClick={() => setUpdateMapPickerOpen(true)}
                    size="small"
                  >
                    Select on Map
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<MyLocationIcon />}
                    onClick={handleCaptureLocationForUpdate}
                    size="small"
                  >
                    Use Current Location
                  </Button>
                </Box>

                {editAccuracy != null ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Location Accuracy: ±{editAccuracy}m (Device Geolocation)
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Location Source: Map Selection
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUpdateLocationOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={updateStationMutation.isPending}>
                {updateStationMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Map Location Picker Dialog for Edit Station Location */}
      {station && (
        <LocationPickerModal
          open={updateMapPickerOpen}
          onClose={() => setUpdateMapPickerOpen(false)}
          initialLat={editLat != null ? editLat : station.latitude}
          initialLng={editLng != null ? editLng : station.longitude}
          regionName={editRegion || station.region}
          districtName={editDistrict || station.district}
          onConfirm={(selectedLat, selectedLng, suggestedLocality) => {
            setEditLat(selectedLat);
            setEditLng(selectedLng);
            setEditAccuracy(null);
            if (suggestedLocality && !editLocality) {
              setEditLocality(suggestedLocality);
            }
          }}
        />
      )}

      {/* Add Contact Dialog */}
      <Dialog open={addContactOpen} onClose={() => setAddContactOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateContactSubmit}>
          <DialogTitle>Add Station Contact Number</DialogTitle>
          <DialogContent>
            {contactErrorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {contactErrorMessage}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Contact Type"
              value={contactType}
              onChange={(e) => setContactType(e.target.value as StationContactType)}
              margin="normal"
              required
            >
              <MenuItem value="WATCHROOM">Watchroom</MenuItem>
              <MenuItem value="CONTROL_ROOM">Control Room</MenuItem>
              <MenuItem value="EMERGENCY">Emergency Direct</MenuItem>
              <MenuItem value="ALTERNATIVE">Alternative Line</MenuItem>
              <MenuItem value="ADMINISTRATIVE">Administrative</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Priority (1 = Highest)"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              margin="normal"
              error={usedPriorities.includes(priority)}
              helperText={
                usedPriorities.includes(priority)
                  ? `Priority ${priority} is already assigned to a contact for this station.`
                  : usedPriorities.length > 0
                  ? `Priorities already assigned: ${usedPriorities.sort((a, b) => a - b).join(', ')}`
                  : ''
              }
              required
            />
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
                label={isPublic ? "Publicly Visible (Available on Mobile App)" : "Internal Admin Only (Hidden from Public App)"}
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Switch checked={is24Hour} onChange={(e) => setIs24Hour(e.target.checked)} />}
                label="Available 24/7"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddContactOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createContactMutation.isPending || usedPriorities.includes(priority)}>
              {createContactMutation.isPending ? 'Adding...' : 'Add Contact'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
