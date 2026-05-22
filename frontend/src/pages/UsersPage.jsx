import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DynamicTable from '../components/DynamicTable';

function can(permissions, action, isSuperuser) {
  if (isSuperuser) return true;
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(action);
}

export default function UsersPage() {
  const { serverId } = useParams();
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canWrite = can(permissions, 'users.write', user?.is_superuser);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ dn: '', cn: '', uid: '', given_name: '', sn: '', mail: '', ci: '', cargo: '', password: '' });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const doLoad = (p) => {
    setLoading(true);
    const params = { page: p, page_size: pageSize };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    userService.list(serverId, params)
      .then(r => { setUsers(r.data.users || r.data); setTotal(r.data.total || 0); })
      .catch(() => { setUsers([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); doLoad(1); }, [search, statusFilter]);
  useEffect(() => { if (page !== 1) doLoad(page); }, [page]);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await userService.create(serverId, createForm);
      setShowCreate(false);
      setCreateForm({ dn: '', cn: '', uid: '', given_name: '', sn: '', mail: '', ci: '', cargo: '', password: '' });
      doLoad(1);
    } catch (err) { alert('Error al crear usuario'); }
  };

  const deleteUser = async (dn) => { if (!confirm('Eliminar usuario ' + dn + '?')) return; try { await userService.delete(serverId, dn); doLoad(page); } catch { alert('Error al eliminar'); } };
  const changePassword = async (dn) => { const pw = prompt('Nueva password para:\n' + dn); if (!pw) return; try { await userService.changePassword(serverId, dn, pw); alert('Password cambiada'); } catch { alert('Error al cambiar password'); } };
  const toggleStatus = async (dn, enabled) => { try { await userService.toggleStatus(serverId, dn, !enabled); doLoad(page); } catch { alert('Error al cambiar estado'); } };

  const cf = (k) => (e) => setCreateForm({ ...createForm, [k]: e.target.value });

  const userColumns = [
    { key: 'cn', label: 'CN', defaultWidth: 150, render: (u) => u.cn },
    { key: 'uid', label: 'UID', defaultWidth: 150, render: (u) => u.uid },
    { key: 'nombre', label: 'Nombre', defaultWidth: 200, render: (u) => u.displayName || u.givenName },
    { key: 'ci', label: 'CI', defaultWidth: 150, render: (u) => <span className="font-mono text-slate-600">{u.ci || '-'}</span> },
    { key: 'cargo', label: 'Cargo', defaultWidth: 180, render: (u) => u.cargo || '-' },
    { key: 'mail', label: 'Email', defaultWidth: 220, render: (u) => u.mail || '-' },
    { key: 'estado', label: 'Estado', defaultWidth: 110, render: (u) => (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${u.enabled !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {u.enabled !== false ? 'Activo' : 'Inactivo'}
      </span>
    )},
    { key: 'dn', label: 'DN', defaultWidth: 400, cellClass: 'font-mono text-slate-500' },
  ];

  if (canWrite) {
    userColumns.push({
      key: 'acciones', label: 'Acciones', defaultWidth: 220,
      render: (u) => (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => changePassword(u.dn)}
            className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-800 border-none px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-amber-500 hover:to-amber-600">PW</button>
          <button onClick={() => toggleStatus(u.dn, u.enabled !== false)}
            className={`border-none px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 text-white ${u.enabled !== false ? 'bg-slate-500 hover:bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            {u.enabled !== false ? 'Desactivar' : 'Activar'}
          </button>
          <button onClick={() => deleteUser(u.dn)}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:from-red-600 hover:to-red-700">Eliminar</button>
        </div>
      ),
    });
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Usuarios LDAP</h1>
          <p className="text-slate-500 text-sm m-0">Gestión de usuarios del directorio activo</p>
        </div>
          {canWrite && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
            {showCreate ? '✕ Cancelar' : '+ Nuevo usuario'}
          </button>
          )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <input placeholder="Buscar por nombre, UID o email..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 min-w-[250px]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 bg-white">
          <option value="">Todos</option>
          <option value="enabled">Activos</option>
          <option value="disabled">Inactivos</option>
        </select>
      </div>

      {showCreate && canWrite && (
        <form onSubmit={createUser} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 max-w-xl">
          <h3 className="text-base font-semibold text-slate-800 m-0 mb-4">Nuevo usuario LDAP</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="DN (ej: cn=usuario,ou=Users,dc=..." value={createForm.dn} onChange={cf('dn')} required
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 col-span-2" />
            <input placeholder="CN" value={createForm.cn} onChange={cf('cn')} required
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="UID" value={createForm.uid} onChange={cf('uid')} required
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="Nombre" value={createForm.given_name} onChange={cf('given_name')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="Apellido" value={createForm.sn} onChange={cf('sn')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="Email" value={createForm.mail} onChange={cf('mail')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="CI (carné de identidad)" value={createForm.ci} onChange={cf('ci')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="Cargo" value={createForm.cargo} onChange={cf('cargo')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            <input placeholder="Password" type="password" value={createForm.password} onChange={cf('password')} required
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
          </div>
          <button type="submit" className="mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700">
            Crear usuario
          </button>
        </form>
      )}

      <DynamicTable columns={userColumns} data={users} loading={loading} storageKey="users-table" emptyMessage="No se encontraron usuarios" />

      {total > pageSize && (
        <div className="flex justify-between items-center mt-5 text-sm text-slate-600">
          <span>Total: <strong>{total}</strong> usuarios — Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => { if (page > 1) setPage(page - 1); }}
              disabled={page <= 1}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">
              Anterior
            </button>
            <button onClick={() => { if (page < totalPages) setPage(page + 1); }}
              disabled={page >= totalPages}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
