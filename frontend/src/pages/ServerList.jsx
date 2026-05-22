import { useEffect, useState, useMemo } from 'react';
import { serverService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import DynamicTable from '../components/DynamicTable';

export default function ServerList() {
  const [servers, setServers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: 389, protocol: 'ldap', base_dn: '', bind_dn: '', bind_password: '' });
  const navigate = useNavigate();

  const load = () => serverService.list().then(r => setServers(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await serverService.create(form);
      setShowForm(false);
      setForm({ name: '', host: '', port: 389, protocol: 'ldap', base_dn: '', bind_dn: '', bind_password: '' });
      load();
    } catch (err) { alert('Error creating server'); }
  };

  const remove = async (id) => {
    if (!confirm('Remove server?')) return;
    await serverService.remove(id);
    load();
  };

  const columns = useMemo(() => [
    { key: 'name', label: 'Nombre', defaultWidth: 200, render: (s) => <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/servers/${s.id}`); }} className="text-indigo-600 hover:text-indigo-800 no-underline">{s.name}</a> },
    { key: 'host', label: 'Host', defaultWidth: 200, render: (s) => s.host },
    { key: 'port', label: 'Puerto', defaultWidth: 100, render: (s) => s.port },
    { key: 'protocol', label: 'Protocolo', defaultWidth: 120, render: (s) => s.protocol },
    { key: 'status', label: 'Estado', defaultWidth: 120, render: (s) => (
      <span style={{
        padding: '2px 10px', borderRadius: 10, fontSize: 13,
        background: s.status === 'online' ? '#d4edda' : '#f8d7da',
        color: s.status === 'online' ? '#155724' : '#721c24',
      }}>{s.status}</span>
    )},
    { key: 'acciones', label: 'Acciones', defaultWidth: 120, render: (s) => (
      <button onClick={() => remove(s.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Eliminar</button>
    )},
  ], [navigate, remove]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Servidores LDAP</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: '#fff', padding: 20, borderRadius: 10, margin: '20px 0', display: 'grid', gap: 12, maxWidth: 500 }}>
          <input placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <input placeholder="Host" value={form.host} onChange={e => setForm({...form, host: e.target.value})} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <input placeholder="Puerto" type="number" value={form.port} onChange={e => setForm({...form, port: +e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <select value={form.protocol} onChange={e => setForm({...form, protocol: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }}>
            <option value="ldap">LDAP</option>
            <option value="ldaps">LDAPS</option>
          </select>
          <input placeholder="Base DN" value={form.base_dn} onChange={e => setForm({...form, base_dn: e.target.value})} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <input placeholder="Bind DN" value={form.bind_dn} onChange={e => setForm({...form, bind_dn: e.target.value})} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <input placeholder="Bind Password" type="password" value={form.bind_password} onChange={e => setForm({...form, bind_password: e.target.value})} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ced4da', fontSize: 14 }} />
          <button type="submit" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Guardar</button>
        </form>
      )}

      <DynamicTable columns={columns} data={servers} storageKey="servers-table" emptyMessage="No hay servidores" />
    </div>
  );
}
