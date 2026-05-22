import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-2xl font-bold text-white mb-4">
            L
          </div>
          <h1 className="text-2xl font-bold text-slate-900">LDAP Admin+</h1>
          <p className="text-slate-500 text-sm mt-1">Inicia sesión para administrar tus directorios</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-5 bg-red-50 text-red-700 text-sm border border-red-200">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuario</label>
          <input
            placeholder="tu_usuario" value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            autoFocus required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
          <input
            type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            required
          />
        </div>

        <button type="submit" className="w-full py-3 rounded-xl border-none bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-base font-semibold cursor-pointer transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700">
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
