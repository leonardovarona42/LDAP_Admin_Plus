import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ textAlign: 'center', marginTop: 40 }}>Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
