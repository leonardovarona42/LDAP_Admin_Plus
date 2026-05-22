import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ouService } from '../services/api';
import DynamicTable from '../components/DynamicTable';

const columns = [
  { key: 'name', label: 'Nombre', defaultWidth: 250, render: (o) => <span className="font-medium text-slate-700">{o.name}</span> },
  { key: 'description', label: 'Descripción', defaultWidth: 300, render: (o) => o.description || '-' },
  { key: 'dn', label: 'DN', defaultWidth: 450, cellClass: 'font-mono text-slate-500' },
];

export default function OUsPage() {
  const { serverId } = useParams();
  const [ous, setOus] = useState([]);

  useEffect(() => {
    ouService.list(serverId, '').then(r => setOus(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Unidades Organizativas</h1>
        <p className="text-slate-500 text-sm m-0">OU del directorio LDAP</p>
      </div>
      <DynamicTable columns={columns} data={ous} storageKey="ous-table" emptyMessage="No se encontraron OU" />
    </div>
  );
}
