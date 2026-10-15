import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/auth/useAuthStore';

export const ForceChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword: oldPassword, newPassword });
      try {
        await authApi.logout();
      } catch (ignored) {}

      logout();
      queryClient.clear();

      alert('Password Changed Successfully! Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to change password. Please check your temporary password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xs">
        <Card sx={{ boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LockResetIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Password Change Required
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hello {user?.firstName}, you must set a new permanent password before accessing the system.
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Current Temporary Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />

              <TextField
                fullWidth
                label="New Permanent Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Minimum 8 characters with numbers and symbols"
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
                sx={{ mt: 3, mb: 1, py: 1.5 }}
              >
                {isSubmitting ? 'Updating Password...' : 'Save & Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
