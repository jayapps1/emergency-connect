import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  FormControlLabel,
  Grid,
  IconButton,
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
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import KeyIcon from '@mui/icons-material/Key';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintIcon from '@mui/icons-material/Print';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userRequestApi, UserManagementRequest } from '@/api/userRequestApi';

export const MyRequestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetRequestId = searchParams.get('requestId');

  const [selectedRequest, setSelectedRequest] = useState<UserManagementRequest | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // Collection Modal States
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectPassword, setCollectPassword] = useState('');
  const [collectedCodes, setCollectedCodes] = useState<string[] | null>(null);
  const [collectedCodesChecked, setCollectedCodesChecked] = useState(false);

  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['myPersonalRequests'],
    queryFn: userRequestApi.getMyRequests,
  });

  const { data: singleTargetRequest } = useQuery({
    queryKey: ['mySingleRequest', targetRequestId],
    queryFn: () => userRequestApi.getMyRequestById(targetRequestId!),
    enabled: Boolean(targetRequestId),
  });

  useEffect(() => {
    if (singleTargetRequest) {
      setSelectedRequest(singleTargetRequest);
      setManageModalOpen(true);
    } else if (targetRequestId && requests && requests.length > 0) {
      const cleanTargetId = targetRequestId.replace(/^REQ-/i, '').toLowerCase();
      const target = requests.find(
        (r) =>
          r.id.toLowerCase() === cleanTargetId ||
          r.id.toLowerCase().startsWith(cleanTargetId) ||
          r.id.replace(/-/g, '').toLowerCase().startsWith(cleanTargetId)
      );
      if (target) {
        setSelectedRequest(target);
        setManageModalOpen(true);
      }
    }
  }, [targetRequestId, singleTargetRequest, requests]);

  const handleCloseManageModal = () => {
    setManageModalOpen(false);
    setSelectedRequest(null);
    if (searchParams.has('requestId')) {
      setSearchParams({}, { replace: true });
    }
  };

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => userRequestApi.withdrawRecoveryRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPersonalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myUserRequests'] });
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      handleCloseManageModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to withdraw recovery request.');
    },
  });

  const collectRecoveryCodesMutation = useMutation({
    mutationFn: () =>
      selectedRequest
        ? userRequestApi.collectRecoveryCodes(selectedRequest.id, collectPassword)
        : Promise.reject('No request selected'),
    onSuccess: (codes) => {
      setCollectedCodes(codes);
      setCollectPassword('');
      queryClient.invalidateQueries({ queryKey: ['myPersonalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myUserRequests'] });
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Current password is incorrect.');
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Personal Administrative Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View status and history for your personal email change and 2FA recovery code requests
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={200} /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>REQUEST TYPE</TableCell>
                    <TableCell>REASON / JUSTIFICATION</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell align="right">ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(requests || []).map((req) => (
                    <TableRow key={req.id} hover>
                      <TableCell>
                        <Chip
                          label={req.requestType}
                          color={req.requestType === 'EMAIL_CHANGE' ? 'secondary' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          color={
                            req.status === 'APPROVED' || req.status === 'COMPLETED'
                              ? 'success'
                              : req.status?.startsWith('REJECTED')
                              ? 'error'
                              : req.status === 'WITHDRAWN'
                              ? 'default'
                              : 'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => {
                            setSelectedRequest(req);
                            setManageModalOpen(true);
                          }}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(requests || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          You have not submitted any personal administrative requests.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Request Detail & Withdrawal Modal */}
      <Dialog open={manageModalOpen} onClose={handleCloseManageModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <span>Personal Request Detail</span>
          <IconButton onClick={handleCloseManageModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedRequest && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Request Type</Typography>
                <Typography variant="body2" fontWeight="bold">{selectedRequest.requestType}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Requested At</Typography>
                <Typography variant="body2">{new Date(selectedRequest.createdAt).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Justification Reason</Typography>
                <Typography variant="body2">{selectedRequest.reason}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedRequest.status}
                    color={
                      selectedRequest.status === 'APPROVED' || selectedRequest.status === 'COMPLETED'
                        ? 'success'
                        : selectedRequest.status?.startsWith('REJECTED')
                        ? 'error'
                        : selectedRequest.status === 'WITHDRAWN'
                        ? 'default'
                        : 'warning'
                    }
                    size="small"
                  />
                </Box>
              </Grid>
              {selectedRequest.rejectionReason && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Rejection Reason</Typography>
                  <Typography variant="body2" color="error.main">{selectedRequest.rejectionReason}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageModal}>Close</Button>

          {selectedRequest?.status === 'APPROVED_AWAITING_COLLECTION' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<KeyIcon />}
              onClick={() => setCollectModalOpen(true)}
            >
              Collect Recovery Codes
            </Button>
          )}

          {selectedRequest && selectedRequest.status.startsWith('PENDING') && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<UndoIcon />}
              disabled={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate(selectedRequest.id)}
            >
              {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Collect 2FA Recovery Codes Modal */}
      <Dialog open={collectModalOpen} onClose={() => setCollectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">
          {collectedCodes ? 'Your New 2FA Recovery Codes' : 'Secure Recovery Code Collection'}
        </DialogTitle>
        <DialogContent dividers>
          {!collectedCodes ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your request has been approved by System Administration. Confirm your current password to collect your new single-use recovery codes.
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Current Password"
                type="password"
                value={collectPassword}
                onChange={(e) => setCollectPassword(e.target.value)}
                margin="normal"
              />
            </Box>
          ) : (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                These recovery codes will be displayed <strong>only once</strong>. Store them in a safe offline location.
              </Alert>

              <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', mb: 2 }}>
                <Grid container spacing={1.5}>
                  {collectedCodes.map((code, idx) => (
                    <Grid item xs={6} key={idx}>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                        {code}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    navigator.clipboard.writeText(collectedCodes.join('\n'));
                    alert('Recovery codes copied to clipboard!');
                  }}
                >
                  Copy Codes
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                >
                  Print Codes
                </Button>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={collectedCodesChecked}
                    onChange={(e) => setCollectedCodesChecked(e.target.checked)}
                  />
                }
                label="I have safely stored my new recovery codes offline."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!collectedCodes ? (
            <>
              <Button onClick={() => setCollectModalOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="success"
                disabled={collectRecoveryCodesMutation.isPending || !collectPassword}
                onClick={() => collectRecoveryCodesMutation.mutate()}
              >
                {collectRecoveryCodesMutation.isPending ? 'Verifying...' : 'Verify & Collect Codes'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              disabled={!collectedCodesChecked}
              onClick={() => {
                setCollectModalOpen(false);
                setCollectedCodes(null);
                setCollectedCodesChecked(false);
                handleCloseManageModal();
              }}
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
