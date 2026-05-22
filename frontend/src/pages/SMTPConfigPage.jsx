import { useEffect, useState } from 'react';
import { smtpService } from '../services/api';

export default function SMTPConfigPage() {
  const [config, setConfig] = useState({
    host: '', port: 587, username: '', password: '',
    use_tls: true, from_email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    smtpService.get()
      .then(r => { if (r.data) setConfig(prev => ({...prev, ...r.data})); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try { await smtpService.save(config); setMsg({ ok: true, text: 'Configuración guardada correctamente' }); }
    catch { setMsg({ ok: false, text: 'Error al guardar la configuración' }); }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const r = await smtpService.test();
      setMsg({ ok: r.data.success, text: r.data.success ? 'Correo de prueba enviado con éxito' : 'Fallo el envío del correo de prueba' });
    } catch { setMsg({ ok: false, text: 'Error al probar la conexión SMTP' }); }
    setTesting(false);
  };

  const f = (k) => (e) => setConfig({ ...config, [k]: e.target.value });

  if (loading) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16">
      <p className="text-slate-500">Cargando configuración...</p>
    </div>
  );

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-slate-800 m-0 mb-1">Servidor SMTP</h1>
        <p className="text-slate-500 text-sm m-0">Configura el servidor de correo saliente para notificaciones del sistema</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
        <div className="grid gap-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Host del servidor SMTP</label>
            <input value={config.host} onChange={f('host')} required className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" placeholder="smtp.example.com" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1">Puerto</label>
              <input type="number" value={config.port} onChange={f('port')} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1">Seguridad</label>
              <div className="flex items-center h-[42px] gap-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={config.use_tls} onChange={e => setConfig({...config, use_tls: e.target.checked})} className="rounded border-slate-300" />
                  Usar TLS
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Usuario</label>
            <input value={config.username} onChange={f('username')} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" placeholder="tu_usuario" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Contraseña</label>
            <input type="password" value={config.password} onChange={f('password')} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Correo remitente</label>
            <input value={config.from_email} onChange={f('from_email')} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10" placeholder="admin@example.com" />
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button type="submit" disabled={saving}
            className={`bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:from-emerald-600 hover:to-emerald-700'}`}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          <button type="button" onClick={test} disabled={testing}
            className={`border-none px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white ${testing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-amber-600 cursor-pointer hover:from-amber-600 hover:to-amber-700'}`}>
            {testing ? 'Enviando...' : 'Enviar correo de prueba'}
          </button>
        </div>

        {msg && (
          <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <span>{msg.ok ? '✓' : '✕'}</span>
            {msg.text}
          </div>
        )}
      </form>
    </div>
  );
}
