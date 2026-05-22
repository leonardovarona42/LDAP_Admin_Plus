import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardService.metrics().then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Directorio Activo — acceso rápido</p>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Servidores</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.total_servers}</p>
              <p className="text-xs text-slate-400 mt-1">{data.online_servers} en línea · {data.offline_servers} fuera</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estado General</p>
              <p className={`text-2xl font-bold mt-1 ${data.online_servers === data.total_servers ? 'text-emerald-600' : 'text-amber-600'}`}>
                {data.online_servers === data.total_servers ? 'Todo bien' : 'Atención'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{data.online_servers}/{data.total_servers} servidores activos</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usuarios Sistema</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.total_system_users}</p>
              <p className="text-xs text-slate-400 mt-1">locales</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Eventos (24h)</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.events_24h}</p>
              <p className="text-xs text-slate-400 mt-1">últimas 24 horas</p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Directorio Activo</h2>
          {data.servers && data.servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.servers.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">{s.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {s.status === 'online' ? 'En línea' : 'Desconectado'}
                    </span>
                  </div>
                  {s.user_stats && s.status === 'online' ? (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-slate-800">{s.user_stats.total}</p>
                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Total</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-700">{s.user_stats.enabled}</p>
                        <p className="text-[11px] text-emerald-500 font-medium uppercase tracking-wider mt-0.5">Activos</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-red-600">{s.user_stats.disabled}</p>
                        <p className="text-[11px] text-red-400 font-medium uppercase tracking-wider mt-0.5">Inactivos</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4 mb-4 text-center">
                      <p className="text-sm text-slate-400">Servidor desconectado</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/servers/${s.id}/users`)}
                      className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors">
                      Usuarios
                    </button>
                    <button onClick={() => navigate(`/servers/${s.id}/ous`)}
                      className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg bg-amber-50 text-amber-600 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">
                      Equipos
                    </button>
                    <button onClick={() => navigate(`/config/directorios`)}
                      className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg bg-slate-50 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                      Config
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-400 mb-3">No hay servidores configurados</p>
              <button onClick={() => navigate('/config/directorios')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors border-none">
                Configurar directorios
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">Cargando...</p>
        </div>
      )}
    </div>
  );
}
