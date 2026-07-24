import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    return data;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        plan: data.plan,
        quota: data.quota,
        activeTeam: data.activeTeam,
      });
      return data;
    } catch (err) {
      if (!err.response) {
        throw new Error('Cannot reach server. Is the backend running on port 5001?');
      }
      throw err;
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        plan: data.plan,
        quota: data.quota,
      });
      return data;
    } catch (err) {
      if (!err.response) {
        throw new Error('Cannot reach server. Is the backend running on port 5001?');
      }
      throw err;
    }
  };

  const upgrade = async (plan = 'pro') => {
    const { data } = await api.post('/auth/upgrade', { plan });
    setUser((prev) => ({ ...prev, ...data }));
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, upgrade, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
