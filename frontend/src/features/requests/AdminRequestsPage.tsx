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
  InputLabel,
  MenuItem,
  Select,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import KeyIcon from '@mui/icons-material/Key';
import UndoIcon from '@mui/icons-material/Undo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminRequestApi, CentralizedRequestItem } from '@/api/adminRequestApi';
import { userRequestApi } from '@/api/userRequestApi';
import { useAuthStore } from '@/auth/useAuthStore';

// Keeps request timestamps inside the management detail view while simplifying the operational request table to the fields needed for review.
export const AdminRequestsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedRequest, setSelectedRequest] = useState<CentralizedRequestItem | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [emailApproveConfirmReq, setEmailApproveConfirmReq] = useState<CentralizedRequestItem | null>(null);

  // Agency Verification Modal States for 2FA Recovery
  const [agencyVerifyModalOpen, setAgencyVerifyModalOpen] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('OFFICIAL_ID_CHECK');
  const [verificationNotes, setVerificationNotes] = useState('');

  // System Approval Modal State for 2FA Recovery
  const [systemApproveRecoveryModalOpen, setSystemApproveRecoveryModalOpen] = useState(false);

  const [rejectDialogReq, setRejectDialogReq] = useState<CentralizedRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedPasswordDialog, setApprovedPasswordDialog] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { hasRole, user } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['centralizedAdminRequests'],
    queryFn: adminRequestApi.getCentralizedRequests,
    refetchInterval: 10000,
  });

  const approveAgencyAccessMutation = useMutation({
    mutationFn: adminRequestApi.approveRequest,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setApprovedPasswordDialog(res.temporaryPassword);
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const approveEmailChangeMutation = useMutation({
    mutationFn: userRequestApi.approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEmailApproveConfirmReq(null);
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => userRequestApi.withdrawRecoveryRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myPersonalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myUserRequests'] });
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const agencyVerifyRecoveryMutation = useMutation({
    mutationFn: () =>
      selectedRequest
        ? userRequestApi.agencyVerifyRecovery(selectedRequest.id, {
            verificationMethod,
            verificationNotes,
          })
        : Promise.reject('No request selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setAgencyVerifyModalOpen(false);
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const systemApproveRecoveryMutation = useMutation({
    mutationFn: () =>
      selectedRequest ? userRequestApi.systemApproveRecovery(selectedRequest.id) : Promise.reject('No request selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setSystemApproveRecoveryModalOpen(false);
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const rejectAgencyAccessMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminRequestApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setRejectDialogReq(null);
      setRejectionReason('');
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const rejectEmailChangeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => userRequestApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setRejectDialogReq(null);
      setRejectionReason('');
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const rejectRecoveryMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => userRequestApi.rejectRecoveryRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralizedAdminRequests'] });
      setRejectDialogReq(null);
      setRejectionReason('');
      setManageModalOpen(false);
      setSelectedRequest(null);
    },
  });

  const handleCopyPassword = () => {
    if (approvedPasswordDialog) {
      navigator.clipboard.writeText(approvedPasswordDialog);
      alert('Temporary password copied to clipboard!');
    }
  };

  const handleOpenManageModal = (req: CentralizedRequestItem) => {
    setSelectedRequest(req);
    setManageModalOpen(true);
  };

  const totalPending = summaryData?.totalPendingCount || 0;
  const agencyAccessPending = summaryData?.agencyAccessPendingCount || 0;
  const emailChangePending = summaryData?.emailChangePendingCount || 0;
  const mfaRecoveryPending = summaryData?.mfaRecoveryPendingCount || 0;

  const allRequests = summaryData?.allRequests || [];
  const agencyAccessRequests = (summaryData?.allRequests || []).filter((r) => r.requestType === 'AGENCY_ADMIN_ACCESS');
  const emailChangeRequests = (summaryData?.allRequests || []).filter((r) => r.requestType === 'EMAIL_CHANGE');
  const mfaRecoveryRequests = (summaryData?.allRequests || []).filter((r) => r.requestType === 'MFA_RECOVERY_CODE_REISSUE');

  const isRequestOwner =
    selectedRequest &&
    (selectedRequest.requestedByName?.includes(user?.firstName || '') ||
      selectedRequest.targetUserName?.includes(user?.firstName || '') ||
      selectedRequest.currentEmail === user?.email);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Admin Request Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review, approve, reject and monitor administrative requests across the Ghana Emergency Connect platform.
          </Typography>
        </div>
        {totalPending > 0 && (
          <Chip
            label={`Admin Requests [${totalPending}]`}
            color="warning"
            sx={{ fontWeight: 'bold', fontSize: '0.9rem', py: 2, px: 1 }}
          />
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label={`ALL REQUESTS (${allRequests.length})`} />
          <Tab label={`AGENCY ADMIN ACCESS (${agencyAccessRequests.length}${agencyAccessPending > 0 ? ` · ${agencyAccessPending} Pending` : ''})`} />
          <Tab label={`EMAIL CHANGE REQUESTS (${emailChangeRequests.length}${emailChangePending > 0 ? ` · ${emailChangePending} Pending` : ''})`} />
          <Tab label={`2FA RECOVERY REQUESTS (${mfaRecoveryRequests.length}${mfaRecoveryPending > 0 ? ` · ${mfaRecoveryPending} Pending` : ''})`} />
        </Tabs>
      </Box>

      {/* Tab 0: ALL REQUESTS */}
      {tabValue === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoading ? (
              <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={250} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>REQUEST REF</TableCell>
                      <TableCell>REQUEST TYPE</TableCell>
                      <TableCell>REQUESTED BY / CANDIDATE</TableCell>
                      <TableCell>ROLE</TableCell>
                      <TableCell>AGENCY / SCOPE</TableCell>
                      <TableCell>STATUS</TableCell>
                      <TableCell align="right">ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{req.requestRef}</TableCell>
                        <TableCell>
                          <Chip
                            label={req.requestType}
                            color={req.requestType === 'EMAIL_CHANGE' ? 'secondary' : req.requestType === 'MFA_RECOVERY_CODE_REISSUE' ? 'warning' : 'primary'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{req.requestedByName}</TableCell>
                        <TableCell><Chip label={req.role} size="small" /></TableCell>
                        <TableCell>{req.agencyName}</TableCell>
                        <TableCell>
                          <Chip
                            label={req.status}
                            color={req.status === 'APPROVED' || req.status === 'COMPLETED' ? 'success' : req.status?.startsWith('REJECTED') ? 'error' : req.status === 'WITHDRAWN' ? 'default' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenManageModal(req)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No administrative requests found.
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
      )}

      {/* Tab 1: AGENCY ADMIN ACCESS REQUESTS */}
      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoading ? (
              <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={250} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>CANDIDATE NAME</TableCell>
                      <TableCell>CANDIDATE EMAIL</TableCell>
                      <TableCell>REQUESTED ROLE</TableCell>
                      <TableCell>REASON / JUSTIFICATION</TableCell>
                      <TableCell>STATUS</TableCell>
                      <TableCell align="right">ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agencyAccessRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{req.requestedByName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{req.currentEmail}</TableCell>
                        <TableCell><Chip label={req.role} color="primary" size="small" variant="outlined" /></TableCell>
                        <TableCell>{req.reason}</TableCell>
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
                            onClick={() => handleOpenManageModal(req)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {agencyAccessRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No Agency Administrator access requests found.
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
      )}

      {/* Tab 2: EMAIL CHANGE REQUESTS */}
      {tabValue === 2 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoading ? (
              <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={250} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>REQUEST REF</TableCell>
                      <TableCell>STAFF</TableCell>
                      <TableCell>ROLE</TableCell>
                      <TableCell>AGENCY / SCOPE</TableCell>
                      <TableCell>CURRENT EMAIL</TableCell>
                      <TableCell>REQUESTED EMAIL</TableCell>
                      <TableCell>STATUS</TableCell>
                      <TableCell align="right">ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emailChangeRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{req.requestRef}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{req.targetUserName}</TableCell>
                        <TableCell><Chip label={req.role} size="small" /></TableCell>
                        <TableCell>{req.agencyName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{req.currentEmail}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                          {req.requestedEmail}
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
                            onClick={() => handleOpenManageModal(req)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {emailChangeRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No email change requests found.
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
      )}

      {/* Tab 3: 2FA RECOVERY REQUESTS */}
      {tabValue === 3 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {isLoading ? (
              <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={250} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>REQUEST REF</TableCell>
                      <TableCell>STAFF</TableCell>
                      <TableCell>AGENCY / SCOPE</TableCell>
                      <TableCell>REASON</TableCell>
                      <TableCell>STATUS</TableCell>
                      <TableCell align="right">ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mfaRecoveryRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{req.requestRef}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{req.targetUserName} ({req.currentEmail})</TableCell>
                        <TableCell>{req.agencyName}</TableCell>
                        <TableCell>{req.reason}</TableCell>
                        <TableCell>
                          <Chip
                            label={req.status}
                            color={req.status === 'COMPLETED' ? 'success' : req.status?.startsWith('REJECTED') ? 'error' : req.status === 'WITHDRAWN' ? 'default' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenManageModal(req)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {mfaRecoveryRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No 2FA recovery requests found.
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
      )}

      {/* Comprehensive Manage Request Modal */}
      <Dialog open={manageModalOpen} onClose={() => setManageModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">Request Detail</Typography>
            <Chip label={selectedRequest?.requestRef} color="primary" size="small" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }} />
          </Box>
          <IconButton onClick={() => setManageModalOpen(false)} size="small">
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
                <Typography variant="caption" color="text.secondary">Candidate / Staff</Typography>
                <Typography variant="body2" fontWeight="bold">{selectedRequest.targetUserName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Role</Typography>
                <Typography variant="body2">{selectedRequest.role}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Agency / Scope</Typography>
                <Typography variant="body2">{selectedRequest.agencyName}</Typography>
              </Grid>

              {selectedRequest.requestType === 'EMAIL_CHANGE' && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Current Login Email</Typography>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">{selectedRequest.currentEmail}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Requested New Email</Typography>
                    <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="primary.main">
                      {selectedRequest.requestedEmail}
                    </Typography>
                  </Grid>
                </>
              )}

              {selectedRequest.requestType === 'MFA_RECOVERY_CODE_REISSUE' && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Staff Email</Typography>
                  <Typography variant="body2" fontFamily="monospace">{selectedRequest.currentEmail}</Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Justification Reason</Typography>
                <Typography variant="body2">{selectedRequest.reason}</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Requested At</Typography>
                <Typography variant="body2">{new Date(selectedRequest.requestedAt).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedRequest.status}
                    color={selectedRequest.status === 'APPROVED' || selectedRequest.status === 'COMPLETED' ? 'success' : selectedRequest.status?.startsWith('REJECTED') ? 'error' : selectedRequest.status === 'WITHDRAWN' ? 'default' : 'warning'}
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageModalOpen(false)}>Close</Button>
          {selectedRequest && selectedRequest.status?.startsWith('PENDING') && (
            <>
              {/* Context-sensitive actions based on request ownership */}
              {isRequestOwner ? (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<UndoIcon />}
                  disabled={withdrawMutation.isPending}
                  onClick={() => withdrawMutation.mutate(selectedRequest.id)}
                >
                  Withdraw Request
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setRejectDialogReq(selectedRequest)}
                  >
                    Reject
                  </Button>

                  {selectedRequest.requestType === 'EMAIL_CHANGE' && isSysAdmin && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setEmailApproveConfirmReq(selectedRequest)}
                    >
                      Approve
                    </Button>
                  )}

                  {selectedRequest.requestType === 'AGENCY_ADMIN_ACCESS' && isSysAdmin && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      disabled={approveAgencyAccessMutation.isPending}
                      onClick={() => approveAgencyAccessMutation.mutate(selectedRequest.id)}
                    >
                      Approve
                    </Button>
                  )}

                  {selectedRequest.requestType === 'MFA_RECOVERY_CODE_REISSUE' && (
                    <>
                      {/* Agency Admin Verify & Forward ONLY if NOT System Admin */}
                      {selectedRequest.status === 'PENDING_AGENCY_VERIFICATION' && !isSysAdmin && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<VerifiedUserIcon />}
                          onClick={() => setAgencyVerifyModalOpen(true)}
                        >
                          Verify & Forward
                        </Button>
                      )}

                      {/* System Admin Approve Recovery */}
                      {(selectedRequest.status === 'PENDING_SYSTEM_APPROVAL' || (selectedRequest.status === 'PENDING_AGENCY_VERIFICATION' && isSysAdmin)) && isSysAdmin && (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<KeyIcon />}
                          onClick={() => setSystemApproveRecoveryModalOpen(true)}
                        >
                          Approve Recovery
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Agency Verification Modal for 2FA Recovery */}
      <Dialog open={agencyVerifyModalOpen} onClose={() => setAgencyVerifyModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">VERIFY STAFF IDENTITY</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Verify staff member <strong>{selectedRequest?.targetUserName}</strong> using an auditable identity check before forwarding to System Administration.
          </Typography>

          <FormControl fullWidth size="small" margin="normal">
            <InputLabel>Verification Method</InputLabel>
            <Select
              value={verificationMethod}
              label="Verification Method"
              onChange={(e) => setVerificationMethod(e.target.value)}
            >
              <MenuItem value="OFFICIAL_ID_CHECK">Official Agency ID Check</MenuItem>
              <MenuItem value="IN_PERSON_VERIFICATION">In-Person Verification</MenuItem>
              <MenuItem value="SECURITY_CALL">Recorded Security Verification Call</MenuItem>
              <MenuItem value="DOCUMENT_VERIFICATION">Documentary Verification</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Verification Notes"
            placeholder="e.g. Verified official national ID and agency ID card..."
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgencyVerifyModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={agencyVerifyRecoveryMutation.isPending || !verificationNotes.trim()}
            onClick={() => agencyVerifyRecoveryMutation.mutate()}
          >
            {agencyVerifyRecoveryMutation.isPending ? 'Verifying...' : 'Verify & Forward'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Approval Modal for 2FA Recovery */}
      <Dialog open={systemApproveRecoveryModalOpen} onClose={() => setSystemApproveRecoveryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">APPROVE 2FA RECOVERY?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Staff Member: <strong>{selectedRequest?.targetUserName}</strong> ({selectedRequest?.currentEmail})
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Approving this request authorizes a 24-hour single-use recovery code collection token for the requesting staff member.
          </Alert>

          <Alert severity="warning">
            Recovery codes will <strong>never</strong> be displayed to administrators or included in notifications. Only the staff member can collect codes securely with password confirmation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSystemApproveRecoveryModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={systemApproveRecoveryMutation.isPending}
            onClick={() => systemApproveRecoveryMutation.mutate()}
          >
            {systemApproveRecoveryMutation.isPending ? 'Authorizing...' : 'Approve Recovery'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Admin Approval Confirmation Dialog for Email Change */}
      <Dialog open={Boolean(emailApproveConfirmReq)} onClose={() => setEmailApproveConfirmReq(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">APPROVE EMAIL CHANGE?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Staff: <strong>{emailApproveConfirmReq?.targetUserName}</strong>
          </Typography>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">Current Email</Typography>
            <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary', mb: 1 }}>
              {emailApproveConfirmReq?.currentEmail}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">New Login Email</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {emailApproveConfirmReq?.requestedEmail}
            </Typography>
          </Box>

          <Alert severity="warning">
            Approving this request will immediately change the staff member's login email and terminate all of their active sessions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailApproveConfirmReq(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={approveEmailChangeMutation.isPending}
            onClick={() => emailApproveConfirmReq && approveEmailChangeMutation.mutate(emailApproveConfirmReq.id)}
          >
            {approveEmailChangeMutation.isPending ? 'Updating...' : 'Approve & Change Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={Boolean(rejectDialogReq)} onClose={() => setRejectDialogReq(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Reject Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason / Review Note"
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
            disabled={!rejectionReason.trim() || rejectAgencyAccessMutation.isPending || rejectEmailChangeMutation.isPending || rejectRecoveryMutation.isPending}
            onClick={() => {
              if (!rejectDialogReq) return;
              if (rejectDialogReq.requestType === 'EMAIL_CHANGE') {
                rejectEmailChangeMutation.mutate({ id: rejectDialogReq.id, reason: rejectionReason });
              } else if (rejectDialogReq.requestType === 'MFA_RECOVERY_CODE_REISSUE') {
                rejectRecoveryMutation.mutate({ id: rejectDialogReq.id, reason: rejectionReason });
              } else {
                rejectAgencyAccessMutation.mutate({ id: rejectDialogReq.id, reason: rejectionReason });
              }
            }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-time Approved Password Dialog for Agency Admin Access Creation */}
      <Dialog open={Boolean(approvedPasswordDialog)} onClose={() => setApprovedPasswordDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Agency Admin Account Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This temporary password will be shown <strong>only once</strong>. Share it securely with the candidate.
          </Alert>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold" fontFamily="monospace">
              {approvedPasswordDialog}
            </Typography>
            <IconButton onClick={handleCopyPassword} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setApprovedPasswordDialog(null)}>
            Close & Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
