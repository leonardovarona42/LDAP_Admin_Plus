import { useEffect, useState } from 'react';
import { authService, serverService, systemService, ldapRoleMappingService } from '../services/api';

export default function AuthConfigPage() {
  const [config, setConfig] = useState({ mode: 'db', ldap_server_id: null, ldap_bind_template: '' });
  const [servers, setServers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mappings, setMappings] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [mappingForm, setMappingForm] = useState({ ldap_server_id: '', group_dn: '', role_id: '', priority: 0 });

  useEffect(() => {
    authService.getConfig().then(r => setConfig(r.data)).catch(() => {});
    serverService.list().then(r => setServers(r.data || [])).catch(() => {});
    ldapRoleMappingService.list().then(r => setMappings(r.data || [])).catch(() => {});
    systemService.listRoles().then(r => setRoles(r.data || [])).catch(() => {});
  }, []);

  const onServerChange = (serverId) => {
    const server = servers.find(s => s.id === serverId);
    let template = '{username}';
    if (server?.bind_dn) {
      if (server.bind_dn.includes('@')) {
        template = '{username}' + server.bind_dn.substring(server.bind_dn.indexOf('@'));
      } else {
        template = server.bind_dn.replace(/^CN=[^,]+/, 'CN={username}');
      }
    }
    setConfig(c => ({ ...c, ldap_server_id: serverId || null, ldap_bind_template: template }));
  };

  const addMapping = async (e) => {
    e.preventDefault();
    try {
      const r = await ldapRoleMappingService.create(mappingForm);
      setMappings(prev => [...prev, r.data]);
      setMappingForm({ ldap_server_id: '', group_dn: '', role_id: '', priority: 0 });
      setShowMappingForm(false);
    } catch { alert('Error al crear mapeo'); }
  };

  const removeMapping = async (id) => {
    if (!confirm('Eliminar este mapeo?')) return;
    try {
      await ldapRoleMappingService.remove(id);
      setMappings(prev => prev.filter(m => m.id !== id));
    } catch { alert('Error al eliminar mapeo'); }
  };

  const mf = (k) => (e) => setMappingForm({ ...mappingForm, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const r = await authService.saveConfig(config);
      setConfig(r.data);
      setMsg('Configuración guardada correctamente');
    } catch {
      setMsg('Error al guardar la configuración');
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Autenticación</h1>
          <p className="text-slate-500 text-sm m-0">Configuración del método de autenticación del sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Método de autenticación</label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'db', label: 'Solo base de datos', desc: 'Usuarios locales de Django (tabla user_profiles)' },
              { value: 'ldap', label: 'Solo LDAP', desc: 'Autenticación contra un directorio LDAP/AD' },
              { value: 'both', label: 'Base de datos + LDAP', desc: 'Intenta base de datos primero, luego LDAP' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${config.mode === opt.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="mode" value={opt.value}
                  checked={config.mode === opt.value}
                  onChange={() => setConfig(c => ({ ...c, mode: opt.value }))}
                  className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800 m-0">{opt.label}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {config.mode !== 'db' && (
          <>
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Servidor LDAP</label>
              <select value={config.ldap_server_id || ''}
                onChange={e => onServerChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                <option value="">Seleccione un servidor...</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Plantilla de bind DN</label>
              <input value={config.ldap_bind_template}
                onChange={e => setConfig(c => ({ ...c, ldap_bind_template: e.target.value }))}
                placeholder="Ej: {username}@dominio.com  o  CN={username},OU=Users,DC=..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 font-mono" />
              <p className="text-xs text-slate-400 mt-1">Use <code className="bg-slate-100 px-1 rounded">{'{username}'}</code> como placeholder para el nombre de usuario</p>
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {msg && (
            <span className={`text-sm ${msg.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>
          )}
        </div>
      </div>

      {/* Mapeo de grupos LDAP a roles */}
      {config.mode !== 'db' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 m-0">Mapeo de grupos LDAP a roles</h3>
              <p className="text-xs text-slate-500 mt-0.5">Asigna automáticamente un rol según el grupo LDAP/AD del usuario</p>
            </div>
            <button onClick={() => setShowMappingForm(!showMappingForm)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
              {showMappingForm ? '✕ Cancelar' : '+ Nuevo mapeo'}
            </button>
          </div>

          {showMappingForm && (
            <form onSubmit={addMapping} className="grid grid-cols-2 gap-3 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Servidor LDAP</label>
                <select value={mappingForm.ldap_server_id} onChange={mf('ldap_server_id')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                  <option value="">Seleccione...</option>
                  {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rol del sistema</label>
                <select value={mappingForm.role_id} onChange={mf('role_id')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                  <option value="">Seleccione...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">DN del grupo LDAP</label>
                <input value={mappingForm.group_dn} onChange={mf('group_dn')} required
                  placeholder="ej: CN=Admins,OU=Groups,DC=etecsa,DC=cu"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad (menor = mayor)</label>
                <input type="number" value={mappingForm.priority} onChange={mf('priority')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              </div>
              <div className="flex items-end">
                <button type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">
                  Crear mapeo
                </button>
              </div>
            </form>
          )}

          {mappings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay mapeos configurados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Servidor</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Grupo LDAP</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Rol</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Prioridad</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-700">{m.ldap_server_name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{m.group_dn}</td>
                      <td className="py-2.5 px-3"><span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">{m.role_name}</span></td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{m.priority}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => removeMapping(m.id)}
                          className="bg-transparent border-none text-red-500 text-xs cursor-pointer hover:text-red-700 font-medium">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
