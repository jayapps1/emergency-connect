import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ShieldIcon from '@mui/icons-material/Shield';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import KeyIcon from '@mui/icons-material/Key';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { LoginResponse } from '@/types';
import { TotpCodeInput } from './TotpCodeInput';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [loginMethodTab, setLoginMethodTab] = useState<0 | 1>(0); // 0 = Password, 1 = Direct Authenticator
  const [totpEmail, setTotpEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MFA Challenge State (used during enrollment)
  const [authState, setAuthState] = useState<'LOGIN' | 'MFA_REQUIRED' | 'MFA_SETUP_REQUIRED'>('LOGIN');
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);

  // MFA Setup Modal State
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [setupSecret, setSetupSecret] = useState('');
  const [provisioningUri, setProvisioningUri] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copyKeyFeedback, setCopyKeyFeedback] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedCodesChecked, setSavedCodesChecked] = useState(false);

  const [, setPendingLoginResp] = useState<LoginResponse | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Method 1: Password-only authentication.
   * Creates an authenticated session directly upon valid password verification (NO TOTP prompt afterwards).
   */
  const onPasswordSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.login(data);
      setPendingLoginResp(response);

      if (response.authenticationState === 'MFA_SETUP_REQUIRED') {
        setMfaChallenge(response.mfaChallenge || null);
        setAuthState('MFA_SETUP_REQUIRED');
      } else if (response.accessToken) {
        setAuth(response.accessToken, response.user, response.roles, response.permissions);
        navigate('/');
      }
    } catch (e: any) {
      if (e.response?.data?.message) {
        setErrorMessage(e.response.data.message);
      } else {
        setErrorMessage('Invalid email or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Method 2: Direct Authenticator Code authentication.
   * Validates 6-digit TOTP code and logs user directly into Command Portal (NO password prompt required).
   */
  const handleDirectTotpAutoSubmit = async (code: string) => {
    if (!totpEmail || !totpEmail.includes('@')) {
      setErrorMessage('Please enter your authorized admin email address first.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.loginWithTotpDirect(totpEmail, code);
      if (response.accessToken) {
        setAuth(response.accessToken, response.user, response.roles, response.permissions);
        navigate('/');
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Incorrect or expired authenticator code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startTotpSetupFlow = async () => {
    setErrorMessage(null);
    try {
      const res = await authApi.startTotpSetup(mfaChallenge || undefined);
      setSetupSecret(res.manualSetupKey || res.secret);
      setProvisioningUri(res.provisioningUri);
      setSetupStep(1);
      setSetupOpen(true);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Failed to start Two-Step Verification setup.');
    }
  };

  const handleConfirmTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await authApi.confirmTotpSetup(confirmCode, mfaChallenge || undefined);
      setRecoveryCodes(res.recoveryCodes || []);
      setSetupStep(2);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Invalid 6-digit TOTP code. Please check your authenticator app.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishMfaSetup = () => {
    setSetupSecret('');
    setProvisioningUri('');
    setConfirmCode('');
    setSetupOpen(false);
    setAuthState('LOGIN');
  };

  const handleCopySetupKey = () => {
    if (setupSecret) {
      navigator.clipboard.writeText(setupSecret);
      setCopyKeyFeedback(true);
      setTimeout(() => setCopyKeyFeedback(false), 2000);
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    alert('Recovery codes copied to clipboard.');
  };

  const handleDownloadRecoveryCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'GEC_Admin_Recovery_Codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A2540 0%, #030E1E 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Card sx={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderRadius: 4, border: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/brand/gec-logo-transparent.png"
                alt="Ghana Emergency Connect"
                sx={{
                  maxHeight: 75,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  mb: 1.5,
                }}
              />
              <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                {authState === 'MFA_SETUP_REQUIRED' ? 'Secure Your Account' : 'Ghana Emergency Connect'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {authState === 'MFA_SETUP_REQUIRED'
                  ? 'Administrator Two-Step Verification Setup'
                  : 'National Emergency Operations Portal Sign In'}
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage}
              </Alert>
            )}

            {authState === 'LOGIN' && (
              <Box>
                {/* Method Tabs: Password OR Authenticator Code */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs
                    value={loginMethodTab}
                    onChange={(_, val) => {
                      setLoginMethodTab(val);
                      setErrorMessage(null);
                    }}
                    variant="fullWidth"
                  >
                    <Tab label="Password" icon={<LockOutlinedIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Authenticator" icon={<VpnKeyIcon fontSize="small" />} iconPosition="start" />
                  </Tabs>
                </Box>

                {loginMethodTab === 0 ? (
                  <form onSubmit={handleSubmit(onPasswordSubmit)}>
                    <TextField
                      fullWidth
                      label="Authorized Admin Email"
                      type="email"
                      margin="normal"
                      {...register('email')}
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      disabled={isSubmitting}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      margin="normal"
                      {...register('password')}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                      disabled={isSubmitting}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      startIcon={<LockOutlinedIcon />}
                      sx={{ mt: 3, mb: 1, py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      {isSubmitting ? 'Signing In...' : 'Sign In with Password'}
                    </Button>
                  </form>
                ) : (
                  <Box>
                    <TextField
                      fullWidth
                      label="Authorized Admin Email"
                      type="email"
                      margin="normal"
                      value={totpEmail}
                      onChange={(e) => setTotpEmail(e.target.value)}
                      disabled={isSubmitting}
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                      Enter 6-digit code from your authenticator app:
                    </Typography>

                    <TotpCodeInput disabled={isSubmitting || !totpEmail.includes('@')} onComplete={handleDirectTotpAutoSubmit} />
                  </Box>
                )}
              </Box>
            )}

            {authState === 'MFA_SETUP_REQUIRED' && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <QrCodeIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  MFA Setup Required
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Your administrator account must be protected with an authenticator app before accessing the operations portal.
                </Typography>
                <Button variant="contained" fullWidth onClick={startTotpSetupFlow}>
                  Set Up Authenticator App
                </Button>
              </Box>
            )}

            <Box sx={{ mt: 3, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <ShieldIcon color="primary" sx={{ fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary">
                Restricted Government Emergency Platform
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Two-Step Verification Enrollment Modal */}
      <Dialog open={setupOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Set Up Two-Step Verification</DialogTitle>
        <DialogContent>
          {setupStep === 1 ? (
            <form onSubmit={handleConfirmTotpSetup}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan the QR code below using Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
              </Typography>

              {/* Rendered SVG QR Code */}
              <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', mb: 2.5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {provisioningUri ? (
                  <QRCodeSVG value={provisioningUri} size={200} includeMargin />
                ) : (
                  <Typography variant="body2" color="error">
                    Unable to display QR code. Use the setup key below.
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
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopySetupKey}>
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
                <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting || confirmCode.length !== 6}>
                  {isSubmitting ? 'Confirming...' : 'Confirm & Enable MFA'}
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
                If you lose your authenticator app, these single-use recovery codes can be used to sign in. Save them in a secure place. They will not be shown again.
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

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyRecoveryCodes}>
                  Copy Codes
                </Button>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadRecoveryCodes}>
                  Download as Text
                </Button>
              </Box>

              <FormControlLabel
                control={<Checkbox checked={savedCodesChecked} onChange={(e) => setSavedCodesChecked(e.target.checked)} />}
                label="I have saved my recovery codes in a safe place."
              />

              <DialogActions sx={{ px: 0, pt: 2 }}>
                <Button variant="contained" disabled={!savedCodesChecked} onClick={handleFinishMfaSetup}>
                  Continue to Sign In
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
