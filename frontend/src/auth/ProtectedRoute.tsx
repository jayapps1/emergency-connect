import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';

/**
 * Route guard component ensuring the visitor holds an active authenticated session.
 * Enforces mandatory password change redirection if {@code mustChangePassword} is true.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force administrators on temporary passwords to change password before accessing dashboard routes
  if (user?.mustChangePassword && location.pathname !== '/change-password-required') {
    return <Navigate to="/change-password-required" replace />;
  }

  return <Outlet />;
};
