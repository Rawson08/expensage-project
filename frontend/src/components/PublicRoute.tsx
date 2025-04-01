import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If user is logged in, redirect away from public-only routes
  if (user) {
    return <Navigate to="/app" replace />;
  }

  // If user is not logged in, render the requested public page
  return <Outlet />;
};

export default PublicRoute;