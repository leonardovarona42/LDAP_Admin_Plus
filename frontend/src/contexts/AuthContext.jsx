import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      localStorage.removeItem('user');
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (username, password) => {
    const r = await authService.login(username, password);
    setUser(r.data);
    localStorage.setItem('user', JSON.stringify(r.data));
    return r.data;
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/* No se valida con /auth/me/ al montar para evitar
   falsos positivos con la cookie de sesión. La sesión
   se valida con cada llamada real a la API. Si una
   llamada devuelve 401, el interceptor en api.js
   dispara el evento 'auth:logout' que limpia el usuario
   y ProtectedRoute redirige al login. */
