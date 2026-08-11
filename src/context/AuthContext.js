// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import ApiService from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      // Timeout de 5 segundos para la petición
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al verificar rol')), 5000)
      );
      
      const response = await Promise.race([
        ApiService.getCurrentUser(),
        timeoutPromise
      ]);
      
      setUser(response.user);
      
      // Guardar también en localStorage para acceso rápido
      localStorage.setItem('psico_user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Si el error es 401 (token inválido/vencido), hacer logout
      if (error.status === 401) {
        logout();
      } else {
        // Para otros errores, intentar recuperar usuario de localStorage como fallback
        const storedUser = localStorage.getItem('psico_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await ApiService.post('/auth/login', { email, password });
      
      const { token, user } = response;
      
      localStorage.setItem('token', token);
      localStorage.setItem('psico_user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      
      // Redirigir según el rol después del login exitoso
      setTimeout(() => {
        if (user.rol) {
          window.location.href = `/${user.rol}/dashboard`;
        } else {
          window.location.href = '/dashboard';
        }
      }, 100);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Error en el inicio de sesión' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('psico_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('psico_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    loading,
    isCoordinador: user?.rol === 'coordinador',
    isTerapeuta: user?.rol === 'terapeuta',
    isCoterapeuta: user?.rol === 'coterapeuta'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};