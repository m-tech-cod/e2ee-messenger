import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { generateRSAKeyPair } from '../lib/crypto';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState(null);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      const storedRefresh = localStorage.getItem('refresh_token');
      const storedPrivateKey = localStorage.getItem('private_key');
      const storedPublicKey = localStorage.getItem('public_key');
      if (!storedRefresh) {
        setLoading(false);
        return;
      }
      try {
        const { access_token } = await api.refreshToken(storedRefresh);
        setToken(access_token);
        const me = await api.getMe(access_token);
        setUser(me);
        if (storedPrivateKey) setPrivateKey(storedPrivateKey);
        if (storedPublicKey) setPublicKey(storedPublicKey);
      } catch {
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('private_key');
        localStorage.removeItem('public_key');
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('refresh_token', data.refresh_token);
    if (data.user.wrapped_private_key) {
      setPrivateKey(data.user.wrapped_private_key);
      localStorage.setItem('private_key', data.user.wrapped_private_key);
    }
    if (data.user.public_key) {
      setPublicKey(data.user.public_key);
      localStorage.setItem('public_key', data.user.public_key);
    }
  };

  const register = async (username, displayName, password) => {
    const { publicKey, privateKey } = await generateRSAKeyPair();
    await api.register({
      username,
      display_name: displayName,
      password,
      public_key: publicKey,
      wrapped_private_key: privateKey,
      pbkdf2_salt: btoa('fake-salt'),
    });
    setPrivateKey(privateKey);
    setPublicKey(publicKey);
    localStorage.setItem('private_key', privateKey);
    localStorage.setItem('public_key', publicKey);
    await login(username, password);
  };

  const logout = async () => {
    if (token) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await api.logout(token, refresh);
    }
    setToken(null);
    setUser(null);
    setPrivateKey(null);
    setPublicKey(null);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('private_key');
    localStorage.removeItem('public_key');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, privateKey, publicKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};