// src/routes/RequireAuth.tsx
import { JSX } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

// Ganti logika autentikasi ini sesuai dengan project kamu
const isAuthenticated = (): boolean => !!localStorage.getItem('accessToken');


const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
