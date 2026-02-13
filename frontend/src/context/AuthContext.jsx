import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api';


const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('menu.ia_token'));
  const [loading, setLoading] = useState(true);

  const api = useCallback(() => {
    return axios.create({
      baseURL: API,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await api().get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token, api]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, business } = response.data;
    localStorage.setItem('menu.ia_token', access_token);
    setToken(access_token);
    setUser(business);
    return business;
  };

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    const { access_token, business } = response.data;
    localStorage.setItem('menu.ia_token', access_token);
    setToken(access_token);
    setUser(business);
    return business;
  };

  const logout = () => {
    localStorage.removeItem('menu.ia_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};
