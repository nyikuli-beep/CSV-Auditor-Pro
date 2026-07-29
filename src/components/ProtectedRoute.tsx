import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../firebase/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isEmailVerified } = useAuth();
  const location = useLocation();
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(true);
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const validateSessionToken = async () => {
      // 1. If auth state is still loading from AuthProvider, wait
      if (loading) return;

      const currentUser = user || auth.currentUser;

      if (!currentUser) {
        if (isMounted) {
          setIsTokenValid(false);
          setIsValidatingToken(false);
        }
        return;
      }

      try {
        // Standard Firebase Auth Token validation for session persistence
        const token = await currentUser.getIdToken(/* forceRefresh */ false);

        if (token) {
          // Persist session verification metadata locally to survive page refreshes
          sessionStorage.setItem('auth_session_active', 'true');
          sessionStorage.setItem('auth_last_verified', Date.now().toString());
          if (currentUser.uid) {
            localStorage.setItem('user_profile_uid', currentUser.uid);
          }

          if (isMounted) {
            setIsTokenValid(true);
            setIsValidatingToken(false);
          }
        } else {
          // Attempt force refresh if initial token returned empty
          const freshToken = await currentUser.getIdToken(true);
          if (isMounted) {
            setIsTokenValid(Boolean(freshToken));
            setIsValidatingToken(false);
          }
        }
      } catch (err) {
        console.warn("Session token validation warning:", err);
        // Fallback token validation retry
        try {
          const retryToken = await currentUser.getIdToken(true);
          if (isMounted) {
            setIsTokenValid(Boolean(retryToken));
            setIsValidatingToken(false);
          }
        } catch (retryErr) {
          console.error("Session token validation failed:", retryErr);
          if (isMounted) {
            setIsTokenValid(false);
            setIsValidatingToken(false);
          }
        }
      }
    };

    validateSessionToken();

    return () => {
      isMounted = false;
    };
  }, [user, loading]);

  const currentUser = user || auth.currentUser;

  // Render loading indicator during initial auth restore or token verification
  if (loading || isValidatingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-blue-600/30 animate-ping" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-200">
          Initializing CSV Auditor Pro Security
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Verifying your encrypted session tokens...
        </p>
      </div>
    );
  }

  // If unauthenticated or token validation explicitly failed, redirect to login
  if (!currentUser || !isTokenValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but email is not verified, redirect to verify-email
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
