import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { serverService } from '../services/api';

export default function ServerDetail() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);

  useEffect(() => {
    serverService.get(serverId).then(r => {
      setServer(r.data);
    }).catch(() => navigate('/config/directorios'));
  }, [serverId]);

  if (!server) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16">
      <p className="text-slate-500">Cargando...</p>
    </div>
  );

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">{server.name}</h1>
        <p className="text-slate-500 text-sm m-0">{server.host}:{server.port} ({server.protocol}) · Base DN: {server.base_dn}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <NavLink to={`/servers/${serverId}/users`}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 no-underline text-slate-800 transition-all duration-200 hover:shadow-md hover:border-indigo-200">
          <h3 className="text-base font-semibold m-0">Usuarios</h3>
          <p className="text-[13px] text-slate-500 m-0 mt-1">Crear, editar y eliminar usuarios LDAP</p>
        </NavLink>
        <NavLink to={`/servers/${serverId}/groups`}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 no-underline text-slate-800 transition-all duration-200 hover:shadow-md hover:border-indigo-200">
          <h3 className="text-base font-semibold m-0">Grupos</h3>
          <p className="text-[13px] text-slate-500 m-0 mt-1">Gestionar grupos LDAP</p>
        </NavLink>
        <NavLink to={`/servers/${serverId}/ous`}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 no-underline text-slate-800 transition-all duration-200 hover:shadow-md hover:border-indigo-200">
          <h3 className="text-base font-semibold m-0">OU</h3>
          <p className="text-[13px] text-slate-500 m-0 mt-1">Unidades Organizativas</p>
        </NavLink>
        <NavLink to={`/servers/${serverId}/computers`}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 no-underline text-slate-800 transition-all duration-200 hover:shadow-md hover:border-indigo-200">
          <h3 className="text-base font-semibold m-0">Computadoras</h3>
          <p className="text-[13px] text-slate-500 m-0 mt-1">Equipos registrados</p>
        </NavLink>
      </div>
    </div>
  );
}
