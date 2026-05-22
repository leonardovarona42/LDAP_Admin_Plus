import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ServerDetail = lazy(() => import('./pages/ServerDetail'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const OUsPage = lazy(() => import('./pages/OUsPage'));
const ComputersPage = lazy(() => import('./pages/ComputersPage'));
const DirectoriosConfig = lazy(() => import('./pages/DirectoriosConfig'));
const SMTPConfigPage = lazy(() => import('./pages/SMTPConfigPage'));
const AuthConfigPage = lazy(() => import('./pages/AuthConfigPage'));
const SystemUsersPage = lazy(() => import('./pages/SystemUsersPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const SolicitudesPage = lazy(() => import('./pages/SolicitudesPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/config/directorios" element={<DirectoriosConfig />} />
                <Route path="/config/smtp" element={<SMTPConfigPage />} />
                <Route path="/config/auth" element={<AuthConfigPage />} />
                <Route path="/config/usuarios-sistema" element={<SystemUsersPage />} />
                <Route path="/solicitudes" element={<SolicitudesPage />} />
                <Route path="/auditoria" element={<AuditPage />} />
                <Route path="/servers/:serverId" element={<ServerDetail />} />
                <Route path="/servers/:serverId/users" element={<UsersPage />} />
                <Route path="/servers/:serverId/groups" element={<GroupsPage />} />
                <Route path="/servers/:serverId/ous" element={<OUsPage />} />
                <Route path="/servers/:serverId/computers" element={<ComputersPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
