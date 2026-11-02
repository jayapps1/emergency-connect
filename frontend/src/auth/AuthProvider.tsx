import React, { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';
import { authApi } from '@/api/authApi';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Restores the complete staff authorization context before protected routes
 * evaluate role permissions after a browser refresh.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitializing, setAuth, setInitializing, logout } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const data = await authApi.refresh();
        if (data.accessToken) {
          setAuth(data.accessToken, data.user, data.roles, data.permissions);
          setInitializing(false);
          return;
        }
      } catch (_: any) {}

      // Fallback: If refresh cookie was absent, verify stored access token with getMe()
      const storedToken = localStorage.getItem('gec_access_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          // authApi.getMe() returns LoginResponse with accessToken, user, roles, and permissions
          const loginResp = res as any;
          if (loginResp.user) {
            setAuth(storedToken, loginResp.user, loginResp.roles, loginResp.permissions);
          } else {
            setAuth(storedToken, res as any, (res as any).roles, []);
          }
          setInitializing(false);
          return;
        } catch (getMeErr: any) {
          if (getMeErr.response?.status === 401) {
            logout();
          }
        }
      } else {
        logout();
      }

      setInitializing(false);
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
