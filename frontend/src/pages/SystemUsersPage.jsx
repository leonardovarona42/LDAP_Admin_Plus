import { useEffect, useState } from 'react';
import { systemService } from '../services/api';
import DynamicTable from '../components/DynamicTable';

export default function SystemUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [tab, setTab] = useState('users');
  const [userForm, setUserForm] = useState({ username: '', password: '', role_id: '' });
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] });
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  const load = () => {
    systemService.listUsers().then(r => setUsers(r.data)).catch(() => {});
    systemService.listRoles().then(r => setRoles(r.data)).catch(() => {});
    systemService.listPermissions().then(r => setAllPermissions(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) { await systemService.updateUser(editingUser.id, userForm); setEditingUser(null); }
      else { await systemService.createUser(userForm); }
      setUserForm({ username: '', password: '', role_id: '' }); load();
    } catch (err) { alert('Error al guardar usuario'); }
  };

  const deleteUser = async (id) => { if (!confirm('Eliminar usuario del sistema?')) return; await systemService.deleteUser(id); load(); };
  const editUser = (u) => { setEditingUser(u); setUserForm({ username: u.username, password: '', role_id: u.role_id || '' }); };

  const saveRole = async (e) => {
    e.preventDefault();
    try {
      const data = { name: roleForm.name, permissions: roleForm.permissions };
      if (editingRole && editingRole !== 'new') { await systemService.updateRole(editingRole.id, data); }
      else { await systemService.createRole(data); }
      setEditingRole(null); setRoleForm({ name: '', permissions: [] }); load();
    } catch (err) { alert('Error al guardar rol'); }
  };

  const deleteRole = async (id) => { if (!confirm('Eliminar rol?')) return; await systemService.deleteRole(id); load(); };
  const parsePerms = (p) => {
    if (Array.isArray(p)) return p;
    if (typeof p === 'string') {
      try { const parsed = JSON.parse(p); return Array.isArray(parsed) ? parsed : []; }
      catch { return p ? [p] : []; }
    }
    return [];
  };

  const editRole = (r) => {
    setEditingRole(r);
    setRoleForm({ name: r.name, permissions: parsePerms(r.permissions) });
  };

  const openNewRole = () => {
    setEditingRole('new');
    setRoleForm({ name: '', permissions: [] });
  };

  const uf = (k) => (e) => setUserForm({ ...userForm, [k]: e.target.value });

  const togglePermission = (key) => {
    setRoleForm(prev => {
      let perms = prev.permissions.filter(p => p !== '*');
      if (prev.permissions.includes('*')) {
        perms = allPermissions.map(p => p.key).filter(k => k !== key);
      } else if (perms.includes(key)) {
        perms = perms.filter(p => p !== key);
      } else {
        perms = [...perms, key];
      }
      return { ...prev, permissions: perms };
    });
  };

  const groups = allPermissions.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const hasAllPerms = roleForm.permissions.includes('*');
  const isPermChecked = (key) => hasAllPerms || roleForm.permissions.includes(key);
  const btn = (active) =>
    `px-6 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 border border-slate-200 ${active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 hover:bg-slate-50'}`;

  const actionBtn = 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700';
  const dangerBtn = 'bg-gradient-to-r from-red-500 to-red-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-red-600 hover:to-red-700';
  const editBtn = 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-800 border-none px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-amber-500 hover:to-amber-600';

  const permLabel = (key) => {
    const found = allPermissions.find(p => p.key === key);
    return found ? found.label : key;
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Gestión de usuarios del sistema</h1>
        <p className="text-slate-500 text-sm m-0">Administra usuarios locales y roles del sistema</p>
      </div>

      <div className="flex gap-0 mb-6">
        <button onClick={() => setTab('users')} className={btn(tab === 'users') + ' rounded-l-lg'}>Usuarios</button>
        <button onClick={() => setTab('roles')} className={btn(tab === 'roles') + ' rounded-r-lg -ml-px'}>Roles</button>
      </div>

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 m-0">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <form onSubmit={saveUser} className="grid gap-3.5 mt-4">
              <input placeholder="Nombre de usuario" value={userForm.username} onChange={uf('username')} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              <input placeholder={editingUser ? 'Nueva contraseña (dejar vacío)' : 'Contraseña'} type="password" value={userForm.password} onChange={uf('password')} required={!editingUser}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
              <select value={userForm.role_id} onChange={uf('role_id')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
                <option value="">Sin rol</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className={actionBtn}>{editingUser ? 'Actualizar' : 'Crear usuario'}</button>
                {editingUser && <button type="button" onClick={() => { setEditingUser(null); setUserForm({ username: '', password: '', role_id: '' }); }}
                  className="bg-slate-400 text-white border-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Cancelar</button>}
              </div>
            </form>
          </div>
          <DynamicTable columns={[
            { key: 'username', label: 'Usuario', defaultWidth: 200, render: (u) => <span className="font-medium text-slate-700">{u.username}</span> },
            { key: 'role', label: 'Rol', defaultWidth: 200, render: (u) => u.role_name || '-' },
            { key: 'last_login', label: 'Último acceso', defaultWidth: 200, render: (u) => u.last_login ? new Date(u.last_login).toLocaleString() : 'Nunca' },
            { key: 'acciones', label: 'Acciones', defaultWidth: 150, render: (u) => (
              <div className="flex gap-1">
                <button onClick={() => editUser(u)} className={editBtn}>Editar</button>
                <button onClick={() => deleteUser(u.id)} className={dangerBtn}>Eliminar</button>
              </div>
            )},
          ]} data={users} storageKey="system-users-table" emptyMessage="No hay usuarios del sistema" />
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openNewRole}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
              + Crear nuevo rol
            </button>
          </div>

          {editingRole !== null && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10" onClick={() => { setEditingRole(null); setRoleForm({ name: '', permissions: [] }); }}>
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 m-0">{editingRole === 'new' ? 'Nuevo rol' : 'Editar rol'}</h3>
                  <button onClick={() => { setEditingRole(null); setRoleForm({ name: '', permissions: [] }); }}
                    className="bg-transparent border-none text-slate-400 text-xl cursor-pointer hover:text-slate-600 p-1">&times;</button>
                </div>
                <form onSubmit={saveRole} className="grid gap-4">
                  <input placeholder="Nombre del rol" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
                  {hasAllPerms && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
                      Este rol tiene un permiso global (*) desde una versión anterior. Selecciona permisos específicos abajo para reemplazarlo.
                    </div>
                  )}
                  {allPermissions.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500 text-center">
                      No se pudieron cargar los permisos. Verifica la conexión con el servidor.
                    </div>
                  )}
                  {Object.entries(groups).map(([group, perms]) => (
                    <div key={group}>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{group}</label>
                      <div className="grid gap-1.5">
                        {perms.map(p => (
                          <label key={p.key} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 hover:text-slate-900">
                            <input type="checkbox" checked={isPermChecked(p.key)} onChange={() => togglePermission(p.key)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className={actionBtn}>{editingRole === 'new' ? 'Crear rol' : 'Actualizar rol'}</button>
                    <button type="button" onClick={() => { setEditingRole(null); setRoleForm({ name: '', permissions: [] }); }}
                      className="bg-slate-400 text-white border-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <DynamicTable columns={[
            { key: 'name', label: 'Nombre', defaultWidth: 200, render: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
            { key: 'permisos', label: 'Permisos', defaultWidth: 350, render: (r) => {
              const perms = parsePerms(r.permissions);
              return perms.includes('*')
                ? <span className="text-indigo-600 font-medium">Todos los permisos</span>
                : <div className="flex flex-wrap gap-1">{perms.map(k => (
                    <span key={k} className="inline-block bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap" title={k}>{permLabel(k)}</span>
                  ))}</div>;
            }},
            { key: 'acciones', label: 'Acciones', defaultWidth: 150, render: (r) => (
              <div className="flex gap-1">
                <button onClick={() => editRole(r)} className={editBtn}>Editar</button>
                <button onClick={() => deleteRole(r.id)} className={dangerBtn}>Eliminar</button>
              </div>
            )},
          ]} data={roles} storageKey="system-roles-table" emptyMessage="No hay roles" />
        </div>
      )}
    </div>
  );
}
