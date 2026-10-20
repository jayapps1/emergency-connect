import React, { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';
import { authApi } from '@/api/authApi';
import { Box, CircularProgress, Typography } from '@mui/material';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitializing, setAuth, setInitializing, logout } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const data = await authApi.refresh();
        if (data.accessToken) {
          setAuth(data.accessToken, data.user, data.roles, data.permissions);
        }
      } catch (e) {
        logout();
      } finally {
        setInitializing(false);
      }
    };

    initializeAuth();
  }, [setAuth, setInitializing, logout]);

  if (isInitializing) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Initializing Ghana Emergency Connect Admin Portal...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
