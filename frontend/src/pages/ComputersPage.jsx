import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { computerService } from '../services/api';
import DynamicTable from '../components/DynamicTable';

const columns = [
  { key: 'cn', label: 'Nombre', defaultWidth: 200, render: (c) => <span className="font-medium text-slate-700">{c.cn}</span> },
  { key: 'os', label: 'Sistema Operativo', defaultWidth: 200, render: (c) => c.operatingSystem || '-' },
  { key: 'dns', label: 'DNS HostName', defaultWidth: 250, render: (c) => <span className="font-mono">{c.dNSHostName || '-'}</span> },
  { key: 'description', label: 'Descripción', defaultWidth: 250, render: (c) => c.description || '-' },
  { key: 'dn', label: 'DN', defaultWidth: 400, cellClass: 'font-mono text-slate-500' },
];

export default function ComputersPage() {
  const { serverId } = useParams();
  const [computers, setComputers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    computerService.list(serverId, params).then(r => setComputers(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Computadoras</h1>
        <p className="text-slate-500 text-sm m-0">Equipos registrados en el directorio LDAP</p>
      </div>

      <input placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)}
        className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 min-w-[350px] mb-5" />

      <DynamicTable columns={columns} data={computers} loading={loading} storageKey="computers-table" emptyMessage="No se encontraron computadoras" />
    </div>
  );
}
