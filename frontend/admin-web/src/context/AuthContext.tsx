import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api/client';
import { AuthData, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const saved = localStorage.getItem('adminUser');
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const auth: AuthData = data.data;
    const isAdmin = auth.user.roles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN');
    if (!isAdmin) throw new Error('Not an admin');
    localStorage.setItem('adminToken', auth.accessToken);
    localStorage.setItem('adminUser', JSON.stringify(auth.user));
    setUser(auth.user);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  const isAdmin = user?.roles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN') ?? false;

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
