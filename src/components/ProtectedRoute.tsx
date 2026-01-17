import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'creator';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading, isAdmin, isCreator } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for admin access
  if (requiredRole === 'admin' && !isAdmin) {
    // Non-admins get redirected to their appropriate dashboard
    if (isCreator) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/account" replace />;
  }

  // Check for creator access
  if (requiredRole === 'creator' && !isCreator && !isAdmin) {
    // Non-creators go to account where they can request creator status
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
