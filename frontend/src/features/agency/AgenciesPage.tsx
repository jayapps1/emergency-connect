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
  IconButton,
  InputAdornment,
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
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agencyApi } from '@/api/agencyApi';
import { Agency, AgencyType } from '@/types';
import { useAuthStore } from '@/auth/useAuthStore';

export const AgenciesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<AgencyType>('FIRE');
  const [emergencyNumber, setEmergencyNumber] = useState('');

  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuthStore();

  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const { data: agencies, isLoading, isError, error } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
  });

  const createMutation = useMutation({
    mutationFn: agencyApi.createAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      handleCloseDialogs();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; type: AgencyType; emergencyNumber?: string } }) =>
      agencyApi.updateAgency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      handleCloseDialogs();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: agencyApi.verifyAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: agencyApi.toggleAgencyStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const handleOpenCreate = () => {
    setName('');
    setCode('');
    setType('FIRE');
    setEmergencyNumber('');
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (agency: Agency) => {
    setEditAgency(agency);
    setName(agency.name);
    setType(agency.type);
    setEmergencyNumber(agency.emergencyNumber || '');
  };

  const handleCloseDialogs = () => {
    setCreateDialogOpen(false);
    setEditAgency(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, code, type, emergencyNumber });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editAgency) {
      updateMutation.mutate({ id: editAgency.id, data: { name, type, emergencyNumber } });
    }
  };

  const filteredAgencies = (agencies || []).filter(
    (agency) =>
      agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {isSysAdmin ? 'Emergency Response Agencies' : 'My Emergency Agency'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isSysAdmin ? 'Verified public emergency response agencies' : 'Your assigned public emergency response agency'}
          </Typography>
        </div>

        {hasPermission('AGENCY_CREATE') && isSysAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            New Agency
          </Button>
        )}
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(error as any)?.response?.data?.message || 'Access Denied: The requested agency resource is outside your authorized scope.'}
        </Alert>
      )}

      {isSysAdmin && (agencies || []).length > 1 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <TextField
              placeholder="Search agencies by name or code..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={250} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Agency Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Emergency Shortcode</TableCell>
                    <TableCell>Verified Status</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAgencies.map((agency) => (
                    <TableRow key={agency.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{agency.code}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{agency.name}</TableCell>
                      <TableCell>
                        <Chip label={agency.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={agency.emergencyNumber || 'N/A'}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {agency.verified ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Verified"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip label="Unverified" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={agency.active}
                          onChange={() => toggleStatusMutation.mutate(agency.id)}
                          disabled={!hasPermission('AGENCY_UPDATE') || !isSysAdmin}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {!agency.verified && hasPermission('AGENCY_VERIFY') && isSysAdmin && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<VerifiedUserIcon />}
                              onClick={() => verifyMutation.mutate(agency.id)}
                            >
                              Verify
                            </Button>
                          )}
                          {hasPermission('AGENCY_UPDATE') && (
                            <IconButton size="small" onClick={() => handleOpenEdit(agency)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgencies.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        No agency details found or no agency is assigned to your account.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseDialogs} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>Create Emergency Agency</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Agency Code (Unique)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Agency Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Agency Type"
              value={type}
              onChange={(e) => setType(e.target.value as AgencyType)}
              margin="normal"
              required
            >
              <MenuItem value="FIRE">FIRE</MenuItem>
              <MenuItem value="POLICE">POLICE</MenuItem>
              <MenuItem value="AMBULANCE">AMBULANCE</MenuItem>
              <MenuItem value="DISASTER_MANAGEMENT">DISASTER_MANAGEMENT</MenuItem>
              <MenuItem value="OTHER">OTHER</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Emergency Shortcode (e.g. 192)"
              value={emergencyNumber}
              onChange={(e) => setEmergencyNumber(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button type="submit" variant="contained">
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editAgency)} onClose={handleCloseDialogs} maxWidth="xs" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit Emergency Agency</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Agency Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Agency Type"
              value={type}
              onChange={(e) => setType(e.target.value as AgencyType)}
              margin="normal"
              required
            >
              <MenuItem value="FIRE">FIRE</MenuItem>
              <MenuItem value="POLICE">POLICE</MenuItem>
              <MenuItem value="AMBULANCE">AMBULANCE</MenuItem>
              <MenuItem value="DISASTER_MANAGEMENT">DISASTER_MANAGEMENT</MenuItem>
              <MenuItem value="OTHER">OTHER</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Emergency Shortcode"
              value={emergencyNumber}
              onChange={(e) => setEmergencyNumber(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
