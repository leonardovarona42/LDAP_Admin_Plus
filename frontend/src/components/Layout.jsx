import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { serverService } from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [configOpen, setConfigOpen] = useState(location.pathname.startsWith('/config'));
  const [dashOpen, setDashOpen] = useState(location.pathname.startsWith('/servers/'));
  const [servers, setServers] = useState([]);

  useEffect(() => {
    serverService.list().then(r => setServers(r.data || [])).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <nav className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col fixed h-screen z-50 border-r border-white/5">
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-300 flex items-center justify-center text-lg font-bold text-white shrink-0">
              L
            </div>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight m-0">LDAP Admin+</h2>
              <p className="text-[11px] text-slate-500 m-0">Directory Manager</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-auto">
          <NavItem to="/solicitudes" icon="📨" active={location.pathname === '/solicitudes'}>
            Solicitudes
          </NavItem>

          <div>
            <button
              onClick={() => setDashOpen(!dashOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                ${dashOpen || location.pathname === '/' ? 'text-white bg-indigo-500/15' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">◉</span>
                Dashboard
              </span>
              <span className={`text-[10px] transition-transform duration-200 ${dashOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {(dashOpen || location.pathname === '/') && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                <SubItem to="/">Resumen general</SubItem>
                {servers.map(s => (
                  <SubItem key={s.id} to={`/servers/${s.id}/users`}>{s.name}</SubItem>
                ))}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                ${location.pathname.startsWith('/config') ? 'text-white bg-indigo-500/15' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">⚙</span>
                Opciones de configuración
              </span>
              <span className={`text-[10px] transition-transform duration-200 ${configOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {configOpen && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                <SubItem to="/config/directorios">Directorios</SubItem>
                <SubItem to="/config/smtp">Servidor SMTP</SubItem>
                <SubItem to="/config/auth">Autenticación</SubItem>
                <SubItem to="/config/usuarios-sistema">Gestión de usuarios del sistema</SubItem>
              </div>
            )}
          </div>

          <NavItem to="/auditoria" icon="📋" active={location.pathname === '/auditoria'}>
            Auditoría / Eventos
          </NavItem>
        </div>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[13px] font-medium text-slate-200 m-0 truncate">{user?.username}</p>
              <p className="text-[11px] text-slate-500 m-0">{user?.role || 'Usuario'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-lg bg-transparent text-red-400 border border-red-400/30 cursor-pointer text-[13px] font-medium transition-all duration-200 hover:bg-red-500/10"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="flex-1 ml-64 p-8 bg-slate-100 overflow-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children, icon, active }) {
  return (
    <NavLink
      to={to}
      end
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm no-underline transition-all duration-150
        ${active ? 'text-white font-semibold bg-indigo-500/20 border-l-[3px] border-indigo-500' : 'text-slate-400 font-medium border-l-[3px] border-transparent hover:text-white'}`}
    >
      <span className="text-base">{icon}</span>
      {children}
    </NavLink>
  );
}

function SubItem({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <NavLink
      to={to}
      className={`block px-3 py-2 ml-9 rounded-md text-[13px] no-underline transition-all duration-150
        ${active ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {children}
    </NavLink>
  );
}
