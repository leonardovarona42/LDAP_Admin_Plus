import { useEffect, useState } from 'react';
import { serverService } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DEFAULT_MAPPINGS = {
  cn: 'cn', uid: 'uid', sn: 'sn', given_name: 'givenName',
  mail: 'mail', telephone: 'telephoneNumber', mobile: 'mobile',
  department: 'department', company: 'company', description: 'description',
  member_of: 'memberOf', enabled_attribute: 'userAccountControl',
  computer_cn: 'cn', computer_os: 'operatingSystem',
  computer_dns_hostname: 'dNSHostName', computer_description: 'description',
};

export default function DirectoriosConfig() {
  const [servers, setServers] = useState([]);
  const [serverStats, setServerStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showMappings, setShowMappings] = useState(false);
  const [form, setForm] = useState({
    name: '', host: '', port: 389, protocol: 'ldap',
    base_dn: '', bind_dn: '', bind_password: '',
    timeout: 10, use_tls: false, description: '',
    attribute_mappings: { ...DEFAULT_MAPPINGS },
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const load = () => serverService.list().then(r => { setServers(r.data); return r.data; }).catch(() => []);

  const loadStats = async (serversList) => {
    const stats = {};
    await Promise.all(serversList.map(async (s) => {
      try {
        const r = await serverService.getStats(s.id);
        stats[s.id] = r.data;
      } catch { stats[s.id] = null; }
    }));
    setServerStats(stats);
  };

  useEffect(() => {
    load().then(serversList => {
      loadStats(serversList);
      const editId = searchParams.get('edit');
      if (editId) {
        const s = serversList.find(sv => sv.id === editId);
        if (s) openEdit(s);
      }
    });
  }, []);

  const resetForm = () => {
    setForm({ name: '', host: '', port: 389, protocol: 'ldap', base_dn: '', bind_dn: '', bind_password: '', timeout: 10, use_tls: false, description: '', attribute_mappings: { ...DEFAULT_MAPPINGS } });
    setEditingId(null);
    setShowMappings(false);
    setTestResult(null);
  };

  const openEdit = async (serverData) => {
    const s = serverData;
    setForm({
      name: s.name, host: s.host, port: s.port, protocol: s.protocol,
      base_dn: s.base_dn, bind_dn: s.bind_dn, bind_password: '',
      timeout: s.timeout, use_tls: s.use_tls, description: s.description || '',
      attribute_mappings: s.attribute_mappings || { ...DEFAULT_MAPPINGS },
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.bind_password) delete payload.bind_password;
        await serverService.update(editingId, payload);
      } else {
        await serverService.create(form);
      }
      setShowForm(false);
      resetForm();
      const serversList = await load();
      loadStats(serversList);
    } catch (err) { alert('Error al guardar servidor'); }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este servidor LDAP?')) return;
    await serverService.remove(id);
    const serversList = await load();
    loadStats(serversList);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await serverService.testConnection(form);
      setTestResult(r.data.connected ? { ok: true, msg: 'Conexión exitosa' } : { ok: false, msg: 'Fallo la conexión' });
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.error || err.message });
    }
    setTesting(false);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fm = (k) => (e) => setForm({ ...form, attribute_mappings: { ...form.attribute_mappings, [k]: e.target.value } });

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Directorios LDAP</h1>
          <p className="text-slate-500 text-sm m-0">Configura y administra tus servidores de directorio LDAP</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
          {showForm ? '✕ Cancelar' : '+ Agregar Directorio'}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-slate-800 m-0">{editingId ? 'Editar servidor' : 'Nuevo servidor LDAP'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="bg-transparent border-none text-slate-400 text-xl cursor-pointer hover:text-slate-600 p-1">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Nombre</label>
                <input placeholder="Ej: Directorio Principal" value={form.name} onChange={f('name')} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Host</label>
                <input placeholder="Ej: ldap.example.com" value={form.host} onChange={f('host')} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Puerto</label>
                <input type="number" value={form.port} onChange={f('port')} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Protocolo</label>
                <select value={form.protocol} onChange={f('protocol')} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                  <option value="ldap">LDAP</option><option value="ldaps">LDAPS</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Base DN</label>
                <input placeholder="Ej: dc=empresa,dc=com" value={form.base_dn} onChange={f('base_dn')} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Bind DN</label>
                <input placeholder="Ej: cn=admin,dc=empresa,dc=com" value={form.bind_dn} onChange={f('bind_dn')} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Bind Password</label>
                <input type="password" value={form.bind_password} onChange={f('bind_password')} placeholder={editingId ? '(dejar vacío para mantener)' : ''} required={!editingId} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Timeout (seg)</label>
                <input type="number" value={form.timeout} onChange={f('timeout')} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[13px] text-slate-700 mt-4.5 cursor-pointer">
                  <input type="checkbox" checked={form.use_tls} onChange={e => setForm({...form, use_tls: e.target.checked})} className="rounded border-slate-300" />
                  Usar TLS
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Descripción (opcional)</label>
                <textarea placeholder="Descripción del servidor..." value={form.description} onChange={f('description')} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 min-h-[60px] resize-y" />
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setShowMappings(!showMappings)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-transparent border-none cursor-pointer hover:text-indigo-800 p-0">
                  <span className={`transition-transform duration-200 ${showMappings ? 'rotate-90' : ''}`}>&#9654;</span>
                  Mapeo de atributos LDAP
                </button>
                {showMappings && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {Object.entries(DEFAULT_MAPPINGS).map(([key, defaultVal]) => (
                      <div key={key}>
                        <label className="block text-[11px] font-medium text-slate-500 mb-0.5 uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
                        <input value={form.attribute_mappings?.[key] || ''} onChange={fm(key)}
                          placeholder={defaultVal}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 font-mono" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={save} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">
                {editingId ? 'Actualizar servidor' : 'Guardar servidor'}
              </button>
              <button onClick={testConnection} disabled={testing}
                className={`border-none px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 text-white
                  ${testing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'}`}>
                {testing ? 'Probando...' : 'Probar conexión'}
              </button>
            </div>
            {testResult && (
              <div className={`mt-3.5 p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <span>{testResult.ok ? '✓' : '✕'}</span>
                {testResult.msg}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {servers.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            No hay servidores configurados. ¡Agrega tu primer directorio!
          </div>
        )}
        {servers.map(s => {
          const stats = serverStats[s.id];
          return (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <button onClick={() => navigate(`/servers/${s.id}`)}
                      className="text-[17px] font-semibold text-indigo-600 bg-transparent border-none cursor-pointer p-0 hover:text-indigo-800 text-left">
                      {s.name}
                    </button>
                    <p className="text-[12px] text-slate-500 m-0 mt-0.5">{s.host}:{s.port} · {s.protocol}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {s.status}
                  </span>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-4 gap-px bg-slate-100 mx-5 rounded-lg overflow-hidden mb-3">
                  {[
                    { label: 'Usuarios', value: stats.users, color: 'text-indigo-600' },
                    { label: 'Grupos', value: stats.groups, color: 'text-emerald-600' },
                    { label: 'OU', value: stats.ous, color: 'text-amber-600' },
                    { label: 'Equipos', value: stats.computers, color: 'text-cyan-600' },
                  ].map(m => (
                    <div key={m.label} className="bg-white p-2.5 text-center">
                      <p className={`text-lg font-bold m-0 ${m.value === -1 ? 'text-slate-300' : m.color}`}>{m.value === -1 ? 'N/A' : m.value}</p>
                      <p className="text-[10px] text-slate-500 m-0 mt-0.5 uppercase tracking-wider">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {!stats && (
                <div className="mx-5 mb-3 p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  No disponible
                </div>
              )}

              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => navigate(`/servers/${s.id}/users`)}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
                  Usuarios
                </button>
                <button onClick={() => navigate(`/servers/${s.id}/groups`)}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">
                  Grupos
                </button>
                <button onClick={() => navigate(`/servers/${s.id}/computers`)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-none px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-cyan-600 hover:to-cyan-700">
                  Equipos
                </button>
                <button onClick={() => openEdit(s)}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-800 border-none px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-amber-500 hover:to-amber-600">
                  Editar
                </button>
                <button onClick={() => remove(s.id)}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-red-600 hover:to-red-700">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
