import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ecobuild-token');
      if (token) {
        try {
          // Set default authorization header first
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token and get user info
          const response = await api.get('/auth/me');
          if (response.data) {
            setUser(response.data);
            console.log('Auth restored successfully:', response.data.email);
          }
        } catch (err) {
          console.error('Auth initialization failed:', err);
          // Clear invalid token
          localStorage.removeItem('ecobuild-token');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      // Always set loading to false after checking
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('ecobuild-token', access_token);
      
      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Update state
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      const { access_token, user: newUser } = response.data;
      
      // Store token
      localStorage.setItem('ecobuild-token', access_token);
      
      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Update state
      setUser(newUser);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('ecobuild-token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
