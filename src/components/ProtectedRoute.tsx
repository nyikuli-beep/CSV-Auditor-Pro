import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
