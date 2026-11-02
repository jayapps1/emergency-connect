import React from 'react';
import { useAuthStore } from './useAuthStore';
import { Box, Button, Container, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

/**
 * Distinguishes authorization loading from a genuine permission denial so
 * valid users do not receive a temporary 403 during session restoration.
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({ permission, children }) => {
  const { hasPermission, isInitializing } = useAuthStore();
  const navigate = useNavigate();

  if (isInitializing) {
    return null; // AuthProvider holds the splash screen while permissions finish bootstrapping
  }

  if (!hasPermission(permission)) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ color: 'error.main', mb: 2 }}>
          <ShieldIcon sx={{ fontSize: 64 }} />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          403 — Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You do not have permission (`{permission}`) to access this feature.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </Container>
    );
  }

  return <>{children}</>;
};
