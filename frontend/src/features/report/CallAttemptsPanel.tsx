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
  MenuItem,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callAttemptApi, EmergencyCallAttempt } from '@/api/callAttemptApi';

export const CallAttemptsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedAttempt, setSelectedAttempt] = useState<EmergencyCallAttempt | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('b1111111-1111-1111-1111-111111111111');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['callAttempts'],
    queryFn: () => callAttemptApi.getCallAttempts(0, 20),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      callAttemptApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callAttempts'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, catId }: { id: string; catId: string }) =>
      callAttemptApi.convertToIncident(id, catId),
    onSuccess: () => {
      setConvertDialogOpen(false);
      setSelectedAttempt(null);
      queryClient.invalidateQueries({ queryKey: ['callAttempts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const attempts = pageData?.content || [];

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'INITIATED':
        return <Chip label="INITIATED" color="warning" size="small" />;
      case 'CALL_LAUNCHED':
        return <Chip label="CALL LAUNCHED" color="primary" size="small" />;
      case 'FOLLOW_UP_REQUIRED':
        return <Chip label="FOLLOW UP REQUIRED" color="error" size="small" />;
      case 'INCIDENT_CREATED':
        return <Chip label="INCIDENT CREATED" color="success" size="small" />;
      case 'CLOSED':
        return <Chip label="CLOSED" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PhoneCallbackIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">
          Citizen Emergency Call Attempts
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Recorded emergency calls initiated by citizens before cellular handoff. Authorized staff can follow up and convert valid calls into operational incidents.
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={200} />
            </Box>
          ) : attempts.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No recent emergency call attempts recorded.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Initiated Time</TableCell>
                    <TableCell>Captured Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attempts.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{item.publicReference}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.destinationPhone}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.destinationType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.initiatedAt ? new Date(item.initiatedAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.latitude && item.longitude ? (
                          <Typography variant="caption" color="primary">
                            ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}) ±
                            {item.locationAccuracyMeters ? `${item.locationAccuracyMeters.toFixed(0)}m` : ''}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Location unavailable
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {item.status !== 'INCIDENT_CREATED' && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: item.id,
                                    status: 'FOLLOW_UP_REQUIRED',
                                  })
                                }
                              >
                                Follow Up
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<LocalHospitalIcon />}
                                onClick={() => {
                                  setSelectedAttempt(item);
                                  setConvertDialogOpen(true);
                                }}
                              >
                                Convert to Incident
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Convert Call Attempt to Incident</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Converting call attempt {selectedAttempt?.publicReference} will create an operational Incident Report and dispatch assignments to the configured emergency agencies.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Select Incident Category:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <MenuItem value="b1111111-1111-1111-1111-111111111111">Fire & Explosion (FIRE)</MenuItem>
            <MenuItem value="b3333333-3333-3333-3333-333333333333">Medical Emergency (AMBULANCE)</MenuItem>
            <MenuItem value="b4444444-4444-4444-4444-444444444444">Road Traffic Accident (POLICE/FIRE/AMBULANCE)</MenuItem>
            <MenuItem value="b6666666-6666-6666-6666-666666666666">Public Safety Hazard (FIRE)</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={convertMutation.isPending}
            onClick={() => {
              if (selectedAttempt) {
                convertMutation.mutate({ id: selectedAttempt.id, catId: categoryId });
              }
            }}
          >
            Confirm Conversion
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
