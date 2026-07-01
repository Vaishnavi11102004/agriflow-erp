import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('agro_user')); } catch { return null; }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (phone, password, role) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { phone, password, role });
      sessionStorage.setItem('agro_token', data.token);
      sessionStorage.setItem('agro_user', JSON.stringify(data.user));
      setUser(data.user);
      setProfile(data.profile);
      return data;
    } finally { setLoading(false); }
  };

  const logout = () => {
    sessionStorage.removeItem('agro_token');
    sessionStorage.removeItem('agro_user');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.role === 'farmer') {
      const { data } = await api.get('/farmer/profile');
      setProfile(data.profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile, setUser, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
