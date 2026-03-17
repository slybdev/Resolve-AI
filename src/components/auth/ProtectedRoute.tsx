import React from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/src/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!api.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
