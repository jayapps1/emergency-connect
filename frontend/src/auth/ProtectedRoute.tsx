import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';

/**
 * Route guard component ensuring the visitor holds an active authenticated session.
 * Holds protected routes in an initializing state while the persisted session
 * is restored, preventing valid users from being redirected during refresh.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    return null; // AuthProvider renders the application splash screen
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force administrators on temporary passwords to change password before accessing dashboard routes
  if (user?.mustChangePassword && location.pathname !== '/change-password-required') {
    return <Navigate to="/change-password-required" replace />;
  }

  return <Outlet />;
};
