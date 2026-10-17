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
 * Route guard component restricting UI access based on required fine-grained permissions.
 * Displays a 403 Access Denied view if the authenticated principal lacks the specified permission.
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({ permission, children }) => {
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();

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
