import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  // Props can be added here if needed in the future
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // User not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is logged in, render the child route component
  return <Outlet />;
};

export default ProtectedRoute;