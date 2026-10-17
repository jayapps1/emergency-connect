import React, { useState } from 'react';
import {
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
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '@/api/categoryApi';
import { AgencyType, IncidentCategory, IncidentSeverity } from '@/types';
import { useAuthStore } from '@/auth/useAuthStore';

const ALL_AGENCY_TYPES: { code: AgencyType; label: String }[] = [
  { code: 'POLICE', label: 'Ghana Police Service' },
  { code: 'FIRE', label: 'Ghana National Fire Service' },
  { code: 'AMBULANCE', label: 'National Ambulance Service' },
  { code: 'DISASTER_MANAGEMENT', label: 'NADMO' },
  { code: 'OTHER', label: 'Other Emergency Services' },
];

export const IncidentCategoriesPage: React.FC = () => {
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<IncidentCategory | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields for Create / Edit
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [reportMode, setReportMode] = useState<'SILENT' | 'GENERAL'>('GENERAL');
  const [supportsCall, setSupportsCall] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [active, setActive] = useState(true);
  const [selectedAgencies, setSelectedAgencies] = useState<AgencyType[]>(['POLICE']);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: categoryApi.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['incidentCategories'] });
      setCreateOpen(false);
      setSuccessMessage('Incident category created successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to create category.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoryApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['incidentCategories'] });
      setEditOpen(false);
      setSuccessMessage('Incident category updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update category.');
    },
  });

  const handleOpenCreate = () => {
    setCode('');
    setName('');
    setDescription('');
    setSeverity('MEDIUM');
    setReportMode('GENERAL');
    setSupportsCall(true);
    setDisplayOrder(((categories?.length || 0) + 1) * 10);
    setActive(true);
    setSelectedAgencies(['POLICE']);
    setErrorMessage(null);
    setCreateOpen(true);
  };

  const handleOpenEdit = (cat: IncidentCategory) => {
    setSelectedCat(cat);
    setCode(cat.code);
    setName(cat.name);
    setDescription(cat.description || '');
    setSeverity(cat.defaultSeverity);
    setReportMode(cat.supportsSilent ? 'SILENT' : 'GENERAL');
    setSupportsCall(cat.supportsCall);
    setDisplayOrder(cat.displayOrder ?? 0);
    setActive(cat.active);
    setSelectedAgencies(cat.defaultAgencyTypes || []);
    setErrorMessage(null);
    setEditOpen(true);
  };

  const handleToggleAgency = (agencyType: AgencyType) => {
    if (selectedAgencies.includes(agencyType)) {
      setSelectedAgencies(selectedAgencies.filter((a) => a !== agencyType));
    } else {
      setSelectedAgencies([...selectedAgencies, agencyType]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate({
      code,
      name,
      description,
      defaultSeverity: severity,
      supportsSilent: reportMode === 'SILENT',
      supportsGeneral: reportMode === 'GENERAL',
      supportsCall,
      displayOrder,
      defaultAgencyTypes: selectedAgencies,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (selectedCat) {
      updateMutation.mutate({
        id: selectedCat.id,
        data: {
          name,
          description,
          defaultSeverity: severity,
          supportsSilent: reportMode === 'SILENT',
          supportsGeneral: reportMode === 'GENERAL',
          supportsCall,
          displayOrder,
          active,
          defaultAgencyTypes: selectedAgencies,
        },
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Incident Categories Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure emergency report categories, exclusive report modes (Silent vs General), and agency routing
          </Typography>
        </div>

        {isSysAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            New Category
          </Button>
        )}
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={200} /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Category Name</TableCell>
                    <TableCell>Default Severity</TableCell>
                    <TableCell>Exclusive Report Mode</TableCell>
                    <TableCell>Call Support</TableCell>
                    <TableCell>Assigned Agencies</TableCell>
                    <TableCell>Status</TableCell>
                    {isSysAdmin && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(categories || []).map((cat) => (
                    <TableRow key={cat.id} hover sx={{ opacity: cat.active ? 1 : 0.6 }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{cat.displayOrder ?? 0}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{cat.code}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{cat.name}</Typography>
                        {cat.description && (
                          <Typography variant="caption" color="text.secondary" display="block">{cat.description}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cat.defaultSeverity}
                          color={cat.defaultSeverity === 'CRITICAL' ? 'error' : cat.defaultSeverity === 'HIGH' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {cat.supportsSilent ? (
                          <Chip label="Silent Report" color="error" size="small" />
                        ) : (
                          <Chip label="General Report" color="primary" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{cat.supportsCall ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(cat.defaultAgencyTypes || []).map((agency) => (
                            <Chip key={agency} label={agency} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cat.active ? 'Active' : 'Inactive'}
                          color={cat.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      {isSysAdmin && (
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(cat)}>
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                        No incident categories found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>Create Incident Category</DialogTitle>
          <DialogContent>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Category Code (e.g. ROBBERY, SUSPICIOUS)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Category Name (e.g. Theft / Robbery / Assault)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="Default Severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Display Order"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.875rem', mb: 1 }}>
                  Exclusive Report Mode
                </FormLabel>
                <RadioGroup
                  value={reportMode}
                  onChange={(e) => setReportMode(e.target.value as 'SILENT' | 'GENERAL')}
                >
                  <FormControlLabel value="SILENT" control={<Radio color="error" />} label="Silent Emergency Report (Stealth Alert)" />
                  <FormControlLabel value="GENERAL" control={<Radio color="primary" />} label="General Public Incident Report" />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                control={<Switch checked={supportsCall} onChange={(e) => setSupportsCall(e.target.checked)} />}
                label="Supports Emergency Call Options"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Assigned Emergency Agencies</Typography>
              <Grid container>
                {ALL_AGENCY_TYPES.map((agency) => (
                  <Grid item xs={6} key={agency.code}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedAgencies.includes(agency.code)}
                          onChange={() => handleToggleAgency(agency.code)}
                        />
                      }
                      label={agency.code}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUpdateSubmit}>
          <DialogTitle>Edit Incident Category ({code})</DialogTitle>
          <DialogContent>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="Default Severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Display Order"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.875rem', mb: 1 }}>
                  Exclusive Report Mode
                </FormLabel>
                <RadioGroup
                  value={reportMode}
                  onChange={(e) => setReportMode(e.target.value as 'SILENT' | 'GENERAL')}
                >
                  <FormControlLabel value="SILENT" control={<Radio color="error" />} label="Silent Emergency Report (Stealth Alert)" />
                  <FormControlLabel value="GENERAL" control={<Radio color="primary" />} label="General Public Incident Report" />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                control={<Switch checked={supportsCall} onChange={(e) => setSupportsCall(e.target.checked)} />}
                label="Supports Emergency Call Options"
              />

              <FormControlLabel
                control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
                label="Active Category"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Assigned Emergency Agencies</Typography>
              <Grid container>
                {ALL_AGENCY_TYPES.map((agency) => (
                  <Grid item xs={6} key={agency.code}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedAgencies.includes(agency.code)}
                          onChange={() => handleToggleAgency(agency.code)}
                        />
                      }
                      label={agency.code}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
