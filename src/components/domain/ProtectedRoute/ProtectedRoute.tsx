// src/components/domain/ProtectedRoute/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[]; // e.g. ['admin'], or ['admin', 'artist']
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Not logged in at all — send to login
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but with the wrong role — send home instead of showing
  // a page that will fail every action anyway
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}