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
  Divider,
  FormControlLabel,
  Grid,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import KeyIcon from '@mui/icons-material/Key';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/auth/useAuthStore';
import { authApi } from '@/api/authApi';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// Allows staff to maintain personal contact information while preventing self-service changes to role, operational scope, or permissions.
export const ProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const { hasRole, setAuth } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Agency Email Change Request Modal States
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState('');
  const [emailChangeReason, setEmailChangeReason] = useState('');

  // System Admin 2-Step Direct Email Change Modal States
  const [sysAdminDirectEmailOpen, setSysAdminDirectEmailOpen] = useState(false);
  const [directStep, setDirectStep] = useState<1 | 2>(1);
  const [directPassword, setDirectPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [directNewEmail, setDirectNewEmail] = useState('');
  const [directConfirmEmail, setDirectConfirmEmail] = useState('');

  // 2FA Setup / Reset Modal States
  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpStep, setTotpStep] = useState<1 | 2>(1);
  const [setupSecret, setSetupSecret] = useState('');
  const [provisioningUri, setProvisioningUri] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copyKeyFeedback, setCopyKeyFeedback] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedCodesChecked, setSavedCodesChecked] = useState(false);
  const [disableTotpOpen, setDisableTotpOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const { data: emailStatus, refetch: refetchEmailStatus } = useQuery({
    queryKey: ['emailChangeStatus'],
    queryFn: authApi.getEmailChangeStatus,
  });

  const { data: emailHistory } = useQuery({
    queryKey: ['emailHistory'],
    queryFn: authApi.getEmailHistory,
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSave = async (data: ProfileFormData) => {
    setErrorMessage(null);
    try {
      const resp = await authApi.updateProfile(data);
      if (resp.user) {
        setAuth(resp.accessToken, resp.user, resp.roles, resp.permissions);
      }
      setToastMessage('Personal information updated successfully.');
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Failed to update profile information.');
    }
  };

  const onPasswordChange = async (data: PasswordFormData) => {
    setErrorMessage(null);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setToastMessage('Password changed successfully.');
      resetPassword();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Failed to change password.');
    }
  };

  const emailRequestMutation = useMutation({
    mutationFn: () => authApi.requestEmailChange({ requestedEmail, reason: emailChangeReason }),
    onSuccess: () => {
      setEmailModalOpen(false);
      setRequestedEmail('');
      setEmailChangeReason('');
      refetchEmailStatus();
      setToastMessage('Email change request submitted for System Admin approval.');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to submit email change request.');
    },
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: () => authApi.verifyPasswordForEmailChange(directPassword),
    onSuccess: (data) => {
      setVerificationToken(data.verificationToken);
      setDirectStep(2);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Current password is incorrect.');
    },
  });

  const directChangeEmailMutation = useMutation({
    mutationFn: () =>
      authApi.changeEmailDirect({
        verificationToken,
        newEmail: directNewEmail,
        confirmNewEmail: directConfirmEmail,
      }),
    onSuccess: (resp) => {
      setSysAdminDirectEmailOpen(false);
      setDirectStep(1);
      setDirectPassword('');
      setVerificationToken('');
      setDirectNewEmail('');
      setDirectConfirmEmail('');
      if (resp.user) {
        setAuth(resp.accessToken, resp.user, resp.roles, resp.permissions);
      }
      refetchEmailStatus();
      setToastMessage('Email address updated successfully. Please sign in again if required.');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update email address.');
    },
  });

  const startTotpSetup = async () => {
    setErrorMessage(null);
    try {
      const res = await authApi.startTotpSetup();
      setSetupSecret(res.manualSetupKey || res.secret);
      setProvisioningUri(res.provisioningUri);
      setTotpStep(1);
      setTotpModalOpen(true);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Failed to start Two-Step Verification setup.');
    }
  };

  const confirmTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await authApi.confirmTotpSetup(confirmCode);
      setRecoveryCodes(res.recoveryCodes || []);
      setTotpStep(2);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Invalid 6-digit TOTP code.');
    }
  };

  const handleFinishMfaSetup = async () => {
    setTotpModalOpen(false);
    try {
      const me = await authApi.getMe();
      const loginResp = me as any;
      if (loginResp.user) {
        setAuth(useAuthStore.getState().accessToken!, loginResp.user, loginResp.roles, loginResp.permissions);
      }
    } catch (_: any) {}
  };

  const disableTotpMutation = useMutation({
    mutationFn: () => authApi.disableTotp(disablePassword),
    onSuccess: async () => {
      setDisableTotpOpen(false);
      setDisablePassword('');
      setToastMessage('Authenticator 2-Step Verification disabled.');
      try {
        const me = await authApi.getMe();
        const loginResp = me as any;
        if (loginResp.user) {
          setAuth(useAuthStore.getState().accessToken!, loginResp.user, loginResp.roles, loginResp.permissions);
        }
      } catch (_: any) {}
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to disable Authenticator.');
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Staff Profile & Account Security
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Personal identity, login security, Two-Step Verification, and operational scope
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Personal Information & Email & Authenticator */}
        <Grid item xs={12} md={6}>
          {/* Personal Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Personal Information
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />

              <form onSubmit={handleSubmitProfile(onProfileSave)}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="First Name"
                      {...registerProfile('firstName')}
                      error={Boolean(profileErrors.firstName)}
                      helperText={profileErrors.firstName?.message}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Last Name"
                      {...registerProfile('lastName')}
                      error={Boolean(profileErrors.lastName)}
                      helperText={profileErrors.lastName?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Contact Phone Number"
                      placeholder="+233 54 201 1738"
                      {...registerProfile('phoneNumber')}
                      error={Boolean(profileErrors.phoneNumber)}
                      helperText={profileErrors.phoneNumber?.message}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<SaveIcon />}
                  disabled={isProfileSubmitting}
                  sx={{ mt: 2 }}
                >
                  {isProfileSubmitting ? 'Saving...' : 'Save Personal Info'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email & Identity */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmailIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Email & Authenticated Identity
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary">Current Login Email</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 1.5 }}>
                {user?.email}
              </Typography>

              {isSysAdmin ? (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    System Administrators can update their login email address directly without an approval request.
                  </Alert>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setDirectStep(1);
                      setDirectPassword('');
                      setVerificationToken('');
                      setDirectNewEmail('');
                      setDirectConfirmEmail('');
                      setSysAdminDirectEmailOpen(true);
                    }}
                  >
                    Change Email
                  </Button>
                </Box>
              ) : (
                <Box>
                  {emailStatus?.hasPendingEmailChange && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      You already have an email change request awaiting review for <strong>{emailStatus.pendingRequestedEmail}</strong>.
                    </Alert>
                  )}

                  {!emailStatus?.hasPendingEmailChange && emailStatus?.status === 'REJECTED_COOLDOWN' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Previous email change request was rejected. You may request another email change after: <strong>{emailStatus.nextEmailChangeEligibleAt ? new Date(emailStatus.nextEmailChangeEligibleAt).toLocaleString() : '1 hour'}</strong>.
                    </Alert>
                  )}

                  {!emailStatus?.hasPendingEmailChange && emailStatus?.status === 'APPROVED_COOLDOWN' && emailStatus?.nextEmailChangeEligibleAt && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      You can request another email change on <strong>{new Date(emailStatus.nextEmailChangeEligibleAt).toLocaleString()}</strong>.
                    </Alert>
                  )}

                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    disabled={!emailStatus?.emailChangeAllowed}
                    onClick={() => setEmailModalOpen(true)}
                  >
                    Request Email Change
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Permanent Email History Section */}
          {emailHistory && emailHistory.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Email Identity Change History
                  </Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Old Email</TableCell>
                        <TableCell>New Email</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emailHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{item.oldEmail}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.newEmail}</TableCell>
                          <TableCell>
                            <Chip label={item.changeType} size="small" variant="outlined" color="primary" />
                          </TableCell>
                          <TableCell>{new Date(item.changedAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Authenticator / 2FA */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ShieldIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Authenticator / Two-Step Verification
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <div>
                  <Typography variant="body2" fontWeight="bold">Authenticator Status</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.totpEnabled ? 'Authenticator app enabled' : 'Not configured'}
                  </Typography>
                </div>
                <Chip
                  label={user?.totpEnabled ? 'ENABLED' : 'NOT CONFIGURED'}
                  color={user?.totpEnabled ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              {user?.totpEnabled ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={startTotpSetup}
                  >
                    Reset Authenticator
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setDisableTotpOpen(true)}
                  >
                    Disable 2FA
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<QrCodeIcon />}
                  onClick={startTotpSetup}
                >
                  Set Up Authenticator
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Security (Password) & Read-Only Operational Scope */}
        <Grid item xs={12} md={6}>
          {/* Password Security */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Password Security
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />

              <form onSubmit={handleSubmitPassword(onPasswordChange)}>
                <TextField
                  fullWidth
                  size="small"
                  label="Current Password"
                  type="password"
                  margin="normal"
                  {...registerPassword('currentPassword')}
                  error={Boolean(passwordErrors.currentPassword)}
                  helperText={passwordErrors.currentPassword?.message}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="New Password"
                  type="password"
                  margin="normal"
                  {...registerPassword('newPassword')}
                  error={Boolean(passwordErrors.newPassword)}
                  helperText={passwordErrors.newPassword?.message}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Confirm New Password"
                  type="password"
                  margin="normal"
                  {...registerPassword('confirmPassword')}
                  error={Boolean(passwordErrors.confirmPassword)}
                  helperText={passwordErrors.confirmPassword?.message}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={isPasswordSubmitting}
                  sx={{ mt: 2 }}
                >
                  {isPasswordSubmitting ? 'Updating...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Operational Scope (Read-Only) */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ShieldIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Operational Role & Scope (Read-Only)
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Role, agency, region, and station assignments are administratively managed.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Assigned Roles</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {roles.map((r) => (
                      <Chip key={r} label={r} size="small" color="primary" />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Agency</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {user?.agencyName || 'National Platform Oversight'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Region</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {user?.region || 'All Regions'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Station</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {user?.stationName || 'All Stations'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Last Login Time</Typography>
                  <Typography variant="body2">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Active Session'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Request Email Change Modal (Agency Staff) */}
      <Dialog open={emailModalOpen} onClose={() => setEmailModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Request Email Change</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Email changes for operational staff require approval from System Administration.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Requested New Email Address"
            type="email"
            value={requestedEmail}
            onChange={(e) => setRequestedEmail(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Request"
            placeholder="e.g. Official agency email updated..."
            value={emailChangeReason}
            onChange={(e) => setEmailChangeReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={emailRequestMutation.isPending || !requestedEmail.trim() || !emailChangeReason.trim()}
            onClick={() => emailRequestMutation.mutate()}
          >
            {emailRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Admin 2-Step Direct Email Change Modal */}
      <Dialog open={sysAdminDirectEmailOpen} onClose={() => setSysAdminDirectEmailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">
          {directStep === 1 ? 'CHANGE EMAIL ADDRESS' : 'NEW EMAIL ADDRESS'}
        </DialogTitle>
        <DialogContent>
          {directStep === 1 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                For security, confirm your current password before changing your login email.
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Current Password"
                type="password"
                value={directPassword}
                onChange={(e) => setDirectPassword(e.target.value)}
                margin="normal"
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your new email address and confirm it.
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="New Email Address"
                type="email"
                value={directNewEmail}
                onChange={(e) => setDirectNewEmail(e.target.value)}
                margin="normal"
              />

              <TextField
                fullWidth
                size="small"
                label="Confirm New Email Address"
                type="email"
                value={directConfirmEmail}
                onChange={(e) => setDirectConfirmEmail(e.target.value)}
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSysAdminDirectEmailOpen(false)}>Cancel</Button>
          {directStep === 1 ? (
            <Button
              variant="contained"
              color="primary"
              disabled={verifyPasswordMutation.isPending || !directPassword}
              onClick={() => verifyPasswordMutation.mutate()}
            >
              {verifyPasswordMutation.isPending ? 'Verifying...' : 'Verify Password'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              disabled={
                directChangeEmailMutation.isPending ||
                !directNewEmail.trim() ||
                !directConfirmEmail.trim() ||
                directNewEmail.trim() !== directConfirmEmail.trim()
              }
              onClick={() => directChangeEmailMutation.mutate()}
            >
              {directChangeEmailMutation.isPending ? 'Updating...' : 'Update Email Address'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Two-Step Verification Modal */}
      <Dialog open={totpModalOpen} onClose={() => setTotpModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Set Up Two-Step Verification</DialogTitle>
        <DialogContent>
          {totpStep === 1 ? (
            <form onSubmit={confirmTotpSetup}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan the QR code below using Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
              </Typography>

              <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', mb: 2.5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {provisioningUri ? (
                  <QRCodeSVG value={provisioningUri} size={200} includeMargin />
                ) : (
                  <Typography variant="body2" color="error">
                    Unable to display QR code. Use setup key below.
                  </Typography>
                )}

                <Button
                  size="small"
                  variant="text"
                  startIcon={<KeyIcon />}
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  sx={{ mt: 1.5 }}
                >
                  {showSecretKey ? 'Hide Setup Key' : 'Reveal Manual Setup Key'}
                </Button>

                {showSecretKey && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Manual Setup Key
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary" sx={{ letterSpacing: '0.12em', my: 0.5 }}>
                      {setupSecret}
                    </Typography>
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => { navigator.clipboard.writeText(setupSecret); setCopyKeyFeedback(true); setTimeout(() => setCopyKeyFeedback(false), 2000); }}>
                      {copyKeyFeedback ? 'Copied!' : 'Copy Key'}
                    </Button>
                  </Box>
                )}
              </Box>

              <TextField
                fullWidth
                label="Enter 6-Digit Code From Authenticator App"
                placeholder="123456"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, ''))}
                margin="normal"
                required
                inputProps={{ maxLength: 6, autoComplete: 'one-time-code' }}
              />

              <DialogActions sx={{ px: 0, pt: 2 }}>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={confirmCode.length !== 6}>
                  Confirm & Enable MFA
                </Button>
              </DialogActions>
            </form>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Two-Step Verification enabled successfully!
              </Alert>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Save Your Recovery Codes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Single-use recovery codes can be used to sign in if you lose your authenticator device.
              </Typography>

              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                <Grid container spacing={1}>
                  {recoveryCodes.map((code, idx) => (
                    <Grid item xs={6} key={idx}>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                        {code}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <FormControlLabel
                control={<Checkbox checked={savedCodesChecked} onChange={(e) => setSavedCodesChecked(e.target.checked)} />}
                label="I have saved my recovery codes in a safe place."
              />

              <DialogActions sx={{ px: 0, pt: 2 }}>
                <Button variant="contained" disabled={!savedCodesChecked} onClick={handleFinishMfaSetup}>
                  Done
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Authenticator Confirmation Modal */}
      <Dialog open={disableTotpOpen} onClose={() => setDisableTotpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Disable Authenticator 2FA</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your password to confirm disabling Two-Step Verification for this account.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Current Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableTotpOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={disableTotpMutation.isPending || !disablePassword}
            onClick={() => disableTotpMutation.mutate()}
          >
            {disableTotpMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Box>
  );
};
