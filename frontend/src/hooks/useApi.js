// React Hook for API Integration
import { useState, useEffect } from 'react';
import { api, auth } from '../apiClient';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status on mount
    const currentUser = auth.getCurrentUser();
    const isAuthenticated = auth.isAuthenticated();
    
    setUser(currentUser);
    
    if (!isAuthenticated) {
      console.log('🔐 User not authenticated');
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await auth.login(credentials);
      setUser(response.user);
      return { success: true, data: response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    auth.logout();
    setUser(null);
    setError(null);
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await auth.register(userData);
      return { success: true, data: response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Generic API call wrapper
  const apiCall = async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      switch (method) {
        case 'GET':
          response = await api.get(endpoint);
          break;
        case 'POST':
          response = await api.post(endpoint, data);
          break;
        case 'PUT':
          response = await api.put(endpoint, data);
          break;
        case 'DELETE':
          response = await api.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      return { success: true, data: response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    apiCall,
    // Convenience methods
    getItems: () => apiCall('GET', '/api/items'),
    getItem: (id) => apiCall('GET', `/api/items/${id}`),
    createItem: (data) => apiCall('POST', '/api/items', data),
    updateItem: (id, data) => apiCall('PUT', `/api/items/${id}`, data),
    deleteItem: (id) => apiCall('DELETE', `/api/items/${id}`),
    getStockStatus: () => apiCall('GET', '/api/stock/status'),
    getStockMovements: () => apiCall('GET', '/api/stock/movements'),
    getReorderRules: () => apiCall('GET', '/api/reorder/rules'),
    createReorderRule: (data) => apiCall('POST', '/api/reorder/rules', data),
  };
};
