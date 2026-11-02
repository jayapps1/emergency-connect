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
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userRequestApi, UserManagementRequest } from '@/api/userRequestApi';
import { useAuthStore } from '@/auth/useAuthStore';

export const UserRequestsPage: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [manageReq, setManageReq] = useState<UserManagementRequest | null>(null);
  const [approveConfirmReq, setApproveConfirmReq] = useState<UserManagementRequest | null>(null);
  const [rejectDialogReq, setRejectDialogReq] = useState<UserManagementRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['userRequests'],
    queryFn: userRequestApi.getRequests,
  });

  const approveMutation = useMutation({
    mutationFn: userRequestApi.approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setApproveConfirmReq(null);
      setManageReq(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => userRequestApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
      setRejectDialogReq(null);
      setRejectionReason('');
      setManageReq(null);
    },
  });

  const filteredRequests = (requests || []).filter((req) => {
    if (filterTab === 'ALL') return true;
    return req.status === filterTab;
  });

  const pendingCount = (requests || []).filter((r) => r.status === 'PENDING').length;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            User Management & Email Change Requests
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and approve agency administrator requests for account email updates, deactivations, or role transfers
          </Typography>
        </div>
        {pendingCount > 0 && (
          <Chip
            label={`${pendingCount} Pending Review`}
            color="warning"
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={filterTab} onChange={(_, val) => setFilterTab(val)}>
          <Tab label={`All Requests (${requests?.length || 0})`} value="ALL" />
          <Tab label={`Pending (${pendingCount})`} value="PENDING" />
          <Tab label={`Approved (${(requests || []).filter((r) => r.status === 'APPROVED').length})`} value="APPROVED" />
          <Tab label={`Rejected (${(requests || []).filter((r) => r.status === 'REJECTED').length})`} value="REJECTED" />
        </Tabs>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={200} /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Target User</TableCell>
                    <TableCell>Agency Scope</TableCell>
                    <TableCell>Request Type</TableCell>
                    <TableCell>Details / Requested Change</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {req.targetUserName} ({req.targetUserEmail})
                      </TableCell>
                      <TableCell>{req.agencyName || req.agencyId}</TableCell>
                      <TableCell>
                        <Chip
                          label={req.requestType}
                          color={req.requestType === 'EMAIL_CHANGE' ? 'secondary' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {req.requestType === 'EMAIL_CHANGE' && req.requestedEmail ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">{req.targetUserEmail}</Typography>
                            <ArrowForwardIcon fontSize="small" color="action" />
                            <Chip label={req.requestedEmail} color="primary" size="small" sx={{ fontWeight: 'bold' }} />
                          </Box>
                        ) : (
                          req.reason
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => setManageReq(req)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No {filterTab.toLowerCase()} user management or email change requests found.
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

      {/* Manage Request Modal */}
      <Dialog open={Boolean(manageReq)} onClose={() => setManageReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <span>Request Details — {manageReq?.requestType}</span>
          <IconButton onClick={() => setManageReq(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {manageReq && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Target User Name</Typography>
                <Typography variant="body2" fontWeight="bold">{manageReq.targetUserName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Agency Scope</Typography>
                <Typography variant="body2" fontWeight="bold">{manageReq.agencyName || manageReq.agencyId}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Current Email</Typography>
                <Typography variant="body2" fontFamily="monospace">{manageReq.targetUserEmail}</Typography>
              </Grid>
              {manageReq.requestType === 'EMAIL_CHANGE' && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Requested New Email</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary" fontFamily="monospace">
                    {manageReq.requestedEmail}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Justification / Reason</Typography>
                <Typography variant="body2">{manageReq.reason}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Requested At</Typography>
                <Typography variant="body2">{new Date(manageReq.createdAt).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={manageReq.status}
                    color={manageReq.status === 'APPROVED' ? 'success' : manageReq.status === 'REJECTED' ? 'error' : 'warning'}
                    size="small"
                  />
                </Box>
              </Grid>
              {manageReq.rejectionReason && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Rejection Reason</Typography>
                  <Typography variant="body2" color="error.main">{manageReq.rejectionReason}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageReq(null)}>Close</Button>
          {manageReq?.status === 'PENDING' && isSysAdmin && (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setRejectDialogReq(manageReq)}
              >
                Reject Request
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => setApproveConfirmReq(manageReq)}
              >
                Approve Request
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* System Admin Approval Confirmation Dialog */}
      <Dialog open={Boolean(approveConfirmReq)} onClose={() => setApproveConfirmReq(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Approve Email Change?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Staff Member: <strong>{approveConfirmReq?.targetUserName}</strong>
          </Typography>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">Current Email</Typography>
            <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary', mb: 1 }}>
              {approveConfirmReq?.targetUserEmail}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">New Login Email</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {approveConfirmReq?.requestedEmail}
            </Typography>
          </Box>

          <Alert severity="warning">
            Approving this request will immediately update the staff member's login email and terminate their existing sessions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveConfirmReq(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={approveMutation.isPending}
            onClick={() => approveConfirmReq && approveMutation.mutate(approveConfirmReq.id)}
          >
            {approveMutation.isPending ? 'Updating...' : 'Approve & Update Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={Boolean(rejectDialogReq)} onClose={() => setRejectDialogReq(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Reject User Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            placeholder="e.g. Requested address is not an approved agency account..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogReq(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim() || rejectMutation.isPending}
            onClick={() => rejectDialogReq && rejectMutation.mutate({ id: rejectDialogReq.id, reason: rejectionReason })}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
