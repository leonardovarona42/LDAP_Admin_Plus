import { useEffect, useState } from 'react';
import { auditService } from '../services/api';
import DynamicTable from '../components/DynamicTable';

const actionLabels = {
  CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación',
  LOGIN: 'Inicio sesión', LOGOUT: 'Cierre sesión',
  CONNECT: 'Conexión', DISCONNECT: 'Desconexión',
  PASSWORD_CHANGE: 'Cambio password', USER_ENABLE: 'Habilitar usuario',
  USER_DISABLE: 'Deshabilitar usuario', TEST_CONNECTION: 'Prueba conexión',
  EXPORT: 'Exportación',
};
const actionColors = {
  CREATE: 'bg-emerald-100 text-emerald-700', UPDATE: 'bg-indigo-100 text-indigo-700',
  DELETE: 'bg-red-100 text-red-700', LOGIN: 'bg-cyan-100 text-cyan-700',
  LOGOUT: 'bg-slate-100 text-slate-600', CONNECT: 'bg-emerald-100 text-emerald-700',
  DISCONNECT: 'bg-red-100 text-red-700', PASSWORD_CHANGE: 'bg-amber-100 text-amber-700',
  USER_ENABLE: 'bg-emerald-100 text-emerald-700', USER_DISABLE: 'bg-red-100 text-red-700',
  TEST_CONNECTION: 'bg-cyan-100 text-cyan-700', EXPORT: 'bg-violet-100 text-violet-700',
};

const columns = [
  { key: 'timestamp', label: 'Fecha', defaultWidth: 180, render: (log) => new Date(log.timestamp).toLocaleString() },
  { key: 'username', label: 'Usuario', defaultWidth: 150, render: (log) => log.username || '-' },
  { key: 'action', label: 'Acción', defaultWidth: 150, render: (log) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
      {actionLabels[log.action] || log.action}
    </span>
  )},
  { key: 'detail', label: 'Detalle', defaultWidth: 350, render: (log) => log.detail || '-' },
  { key: 'ip', label: 'IP', defaultWidth: 150, render: (log) => <span className="font-mono">{log.ip_address || '-'}</span> },
];

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', username: '' });
  const pageSize = 30;

  const load = () => {
    setLoading(true);
    auditService.list({ page, page_size: pageSize, ...filters })
      .then(r => { setLogs(r.data.results || r.data); setTotal(r.data.count || r.data.length || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Auditoría / Eventos</h1>
        <p className="text-slate-500 text-sm m-0">Registro detallado de todas las acciones del sistema</p>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filters.action} onChange={e => { setFilters({...filters, action: e.target.value}); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
          <option value="">Todas las acciones</option>
          {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="Filtrar por usuario" value={filters.username}
          onChange={e => { setFilters({...filters, username: e.target.value}); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 w-60" />
      </div>

      <DynamicTable columns={columns} data={logs} loading={loading} storageKey="audit-table" emptyMessage="Sin resultados" />

      <div className="flex justify-center items-center gap-3 mt-5">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}
          className={`px-4 py-2 rounded-lg text-sm border transition-all duration-200 ${page <= 1 ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100'}`}>
          ← Anterior
        </button>
        <span className="text-sm text-slate-500">Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span>
        <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}
          className={`px-4 py-2 rounded-lg text-sm border transition-all duration-200 ${page >= Math.ceil(total / pageSize) ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100'}`}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}
