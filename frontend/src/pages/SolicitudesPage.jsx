import { useEffect, useState, useRef, useCallback } from 'react';
import { solicitudService, serverService, ouService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DynamicTable from '../components/DynamicTable';

function can(permissions, action, isSuperuser) {
  if (isSuperuser) return true;
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(action);
}

export default function SolicitudesPage() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canWrite = can(permissions, 'users.write', user?.is_superuser);
  const [solicitudes, setSolicitudes] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, altas: 0, bajas: 0, pendientes: 0, ejecutadas: 0 });
  const [tab, setTab] = useState('pendientes');
  const [showForm, setShowForm] = useState(false);
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState({
    tipo: 'ALTA', nombre: '', apellidos: '', username: '', email: '',
    telefono: '', cargo: '', password: '', dominios: [], ou: '',
  });

  useEffect(() => {
    serverService.list().then(r => setServers(r.data || [])).catch(() => {});
  }, []);

  const load = () => {
    const params = {};
    if (tab === 'pendientes') params.estado = 'PENDIENTE';
    else if (tab === 'altas') { params.tipo = 'ALTA'; params.estado = 'EJECUTADA'; }
    else if (tab === 'bajas') { params.tipo = 'BAJA'; params.estado = 'EJECUTADA'; }
    else if (tab === 'todas') { /* no filter */ }
    solicitudService.list(params).then(r => {
      setSolicitudes(r.data.solicitudes || []);
      setMetrics(r.data.metrics || { total: 0, altas: 0, bajas: 0, pendientes: 0, ejecutadas: 0 });
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [tab]);

  const toggleDominio = (id) => {
    setForm(f => ({
      ...f,
      dominios: f.dominios.includes(id)
        ? f.dominios.filter(d => d !== id)
        : [...f.dominios, id],
      ou: '',
    }));
    setOuFilter('');
    setOuOpen(false);
  };

  const resetForm = () => {
    setForm({ tipo: 'ALTA', nombre: '', apellidos: '', username: '', email: '', telefono: '', cargo: '', password: '', dominios: [], ou: '' });
    setOuFilter('');
    setOuOpen(false);
    setShowForm(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await solicitudService.create(form);
      resetForm();
      load();
    } catch (err) { alert('Error al crear solicitud'); }
  };

  const execute = async (id, accion) => {
    try {
      await solicitudService.execute(id, { accion });
      load();
    } catch (err) { alert('Error al ejecutar accion'); }
  };

  const cf = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // OU autocomplete
  const [ous, setOus] = useState([]);
  const [ouFilter, setOuFilter] = useState('');
  const [ouOpen, setOuOpen] = useState(false);
  const ouRef = useRef(null);

  const loadOus = useCallback(async () => {
    const targetId = form.dominios[0];
    if (!targetId) { setOus([]); return; }
    try {
      const r = await ouService.list(targetId, '');
      setOus(r.data || []);
    } catch { setOus([]); }
  }, [form.dominios]);

  useEffect(() => { loadOus(); }, [loadOus]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ouRef.current && !ouRef.current.contains(e.target)) setOuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredOus = ous.filter(o =>
    (o.name || '').toLowerCase().includes(ouFilter.toLowerCase())
  );

  const selectOu = (o) => {
    setForm(f => ({ ...f, ou: o.dn }));
    setOuFilter('');
    setOuOpen(false);
  };

  const tabs = [
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'altas', label: 'Altas ejecutadas' },
    { key: 'bajas', label: 'Bajas ejecutadas' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Solicitudes</h1>
          <p className="text-slate-500 text-sm m-0">Gestión de solicitudes de altas y bajas</p>
        </div>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
            {showForm ? '✕ Cancelar' : '+ Nueva solicitud'}
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: metrics.total, color: 'from-indigo-500 to-indigo-600' },
          { label: 'Altas', value: metrics.altas, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Bajas', value: metrics.bajas, color: 'from-rose-500 to-rose-600' },
          { label: 'Pendientes', value: metrics.pendientes, color: 'from-amber-500 to-amber-600' },
          { label: 'Ejecutadas', value: metrics.ejecutadas, color: 'from-cyan-500 to-cyan-600' },
        ].map(m => (
          <div key={m.label} className={`bg-gradient-to-br ${m.color} rounded-xl shadow-sm p-4 text-white`}>
            <p className="text-[13px] font-medium opacity-80 m-0">{m.label}</p>
            <p className="text-3xl font-bold m-0 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Overlay form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={resetForm} />
          <form onSubmit={submit} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-slate-800 m-0">Nueva solicitud</h3>
              <button type="button" onClick={resetForm}
                className="bg-transparent border-none text-slate-400 hover:text-slate-600 text-xl cursor-pointer leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select value={form.tipo} onChange={cf('tipo')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                  <option value="ALTA">Alta</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input value={form.nombre} onChange={cf('nombre')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Apellidos</label>
                <input value={form.apellidos} onChange={cf('apellidos')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de usuario</label>
                <input value={form.username} onChange={cf('username')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Correo electrónico</label>
                <input value={form.email} onChange={cf('email')} placeholder="opcional"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={cf('telefono')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
                <input value={form.cargo} onChange={cf('cargo')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña</label>
                <input type="password" value={form.password} onChange={cf('password')} required={form.tipo === 'ALTA'}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
                {form.tipo === 'ALTA' && <p className="text-[11px] text-slate-400 mt-0.5">Requerida para altas</p>}
              </div>
              <div ref={ouRef} className="relative">
                <label className="block text-xs font-medium text-slate-500 mb-1">Unidad organizativa (OU)</label>
                <input value={ouOpen ? ouFilter : form.ou} onChange={e => { setOuFilter(e.target.value); setOuOpen(true); }}
                  onFocus={() => { setOuFilter(form.ou || ''); setOuOpen(true); }}
                  placeholder={form.dominios.length === 0 ? 'Seleccione un dominio primero...' : 'Escriba el nombre de la OU...'}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
                {ouOpen && filteredOus.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOus.slice(0, 50).map(o => (
                      <li key={o.dn} onClick={() => selectOu(o)}
                        className="px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer">
                        <span className="font-medium">{o.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{o.dn}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {ouOpen && filteredOus.length === 0 && ous.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-400 text-center">
                    Ninguna OU coincide
                  </div>
                )}
                {form.ou && !ouOpen && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                      {ous.find(o => o.dn === form.ou)?.name || form.ou.split(',').shift()?.split('=').pop() || form.ou}
                      <button type="button" onClick={() => setForm(f => ({ ...f, ou: '' }))}
                        className="bg-transparent border-none text-indigo-400 hover:text-indigo-600 cursor-pointer text-xs">&times;</button>
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">{form.ou}</span>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Dominio(s)</label>
                <div className="flex flex-wrap gap-3">
                  {servers.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.dominios.includes(s.id)}
                        onChange={() => toggleDominio(s.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button type="submit"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">
                Crear solicitud
              </button>
              <button type="button" onClick={resetForm}
                className="bg-transparent border border-slate-300 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-50 transition-all duration-200">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 border-none
              ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {(() => {
        const baseCols = [
          { key: 'tipo', label: 'Tipo', defaultWidth: 100, render: (s) => (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.tipo === 'ALTA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {s.tipo === 'ALTA' ? 'Alta' : 'Baja'}
            </span>
          )},
          { key: 'nombre', label: 'Nombre', defaultWidth: 200, render: (s) => <span className="text-slate-700">{s.nombre} {s.apellidos}</span> },
          { key: 'username', label: 'Usuario', defaultWidth: 150, render: (s) => s.username },
          { key: 'email', label: 'Email', defaultWidth: 200, render: (s) => s.email || '-' },
          { key: 'cargo', label: 'Cargo', defaultWidth: 180, render: (s) => s.cargo || '-' },
          { key: 'estado', label: 'Estado', defaultWidth: 130, render: (s) => (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
              ${s.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : ''}
              ${s.estado === 'EJECUTADA' ? 'bg-emerald-100 text-emerald-700' : ''}
              ${s.estado === 'RECHAZADA' ? 'bg-red-100 text-red-700' : ''}`}>
              {s.estado}
            </span>
          )},
          { key: 'ejecutado_por', label: 'Ejecutado por', defaultWidth: 150, render: (s) => s.ejecutado_por || '-' },
          { key: 'fecha', label: 'Fecha/Hora', defaultWidth: 170, render: (s) => s.ejecutado_at ? new Date(s.ejecutado_at).toLocaleString('es-CU') : '-' },
        ];
        if (canWrite) {
          baseCols.push({
            key: 'acciones', label: 'Acciones', defaultWidth: 160,
            render: (s) => s.estado === 'PENDIENTE' ? (
              <div className="flex gap-1.5">
                <button onClick={() => execute(s.id, 'ejecutar')}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">Ejecutar</button>
                <button onClick={() => execute(s.id, 'rechazar')}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-red-600 hover:to-red-700">Rechazar</button>
              </div>
            ) : null,
          });
        }
        return <DynamicTable columns={baseCols} data={solicitudes} storageKey="solicitudes-table" emptyMessage="No hay solicitudes" />;
      })()}
    </div>
  );
}
