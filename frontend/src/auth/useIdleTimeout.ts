import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from './useAuthStore';
import { useNavigate } from 'react-router-dom';

const SESSION_IDLE_TIMEOUT_MS = 3600000; // 60 minutes
const SESSION_WARNING_TIMEOUT_MS = 3300000; // 55 minutes
const LAST_ACTIVITY_KEY = 'gec_last_activity_at';

/**
 * Tracks genuine user interaction across tabs and expires the authenticated
 * session only after the configured inactivity period.
 */
export const useIdleTimeout = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const lastUpdateRef = useRef<number>(Date.now());

  const updateActivity = useCallback(() => {
    const now = Date.now();
    // Throttle writes to localStorage to at most once every 5 seconds
    if (now - lastUpdateRef.current > 5000) {
      lastUpdateRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch (_: any) {}
    }
  }, []);

  const handleStaySignedIn = useCallback(() => {
    const now = Date.now();
    lastUpdateRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch (_: any) {}
    setShowWarning(false);
  }, []);

  const handleSignOut = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate('/login?reason=idle', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize activity timestamp
    try {
      if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    } catch (_: any) {}

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      try {
        const storedStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        const lastActivity = storedStr ? parseInt(storedStr, 10) : Date.now();
        const elapsed = Date.now() - lastActivity;

        if (elapsed >= SESSION_IDLE_TIMEOUT_MS) {
          handleSignOut();
        } else if (elapsed >= SESSION_WARNING_TIMEOUT_MS) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      } catch (_: any) {}
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, updateActivity, handleSignOut]);

  return { showWarning, handleStaySignedIn, handleSignOut };
};
