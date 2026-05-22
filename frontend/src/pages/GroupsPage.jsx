import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { groupService } from '../services/api';
import DynamicTable from '../components/DynamicTable';

const columns = [
  { key: 'cn', label: 'CN', defaultWidth: 200, render: (g) => <span className="font-medium text-slate-700">{g.cn}</span> },
  { key: 'description', label: 'Descripción', defaultWidth: 300, render: (g) => g.description || '-' },
  { key: 'members', label: 'Miembros', defaultWidth: 120, render: (g) => (
    <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold">{g.members?.length || 0}</span>
  )},
  { key: 'dn', label: 'DN', defaultWidth: 400, cellClass: 'font-mono text-slate-500' },
];

export default function GroupsPage() {
  const { serverId } = useParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    groupService.list(serverId, '').then(r => setGroups(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [serverId]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Grupos</h1>
        <p className="text-slate-500 text-sm m-0">Grupos LDAP del directorio</p>
      </div>
      <DynamicTable columns={columns} data={groups} loading={loading} storageKey="groups-table" emptyMessage="No se encontraron grupos" />
    </div>
  );
}
