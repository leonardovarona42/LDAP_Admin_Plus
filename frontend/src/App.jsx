import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ServerDetail from './pages/ServerDetail';
import UsersPage from './pages/UsersPage';
import GroupsPage from './pages/GroupsPage';
import OUsPage from './pages/OUsPage';
import ComputersPage from './pages/ComputersPage';
import DirectoriosConfig from './pages/DirectoriosConfig';
import SMTPConfigPage from './pages/SMTPConfigPage';
import AuthConfigPage from './pages/AuthConfigPage';
import SystemUsersPage from './pages/SystemUsersPage';
import AuditPage from './pages/AuditPage';
import SolicitudesPage from './pages/SolicitudesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
