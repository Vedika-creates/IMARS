const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log("API URL:", API_BASE_URL);

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

export const api = {
  // Generic fetch wrapper with auth
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // PATCH request
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Auth specific methods
export const auth = {
  async register(userData) {
    return api.post('/api/auth/register', userData);
  },

  async login(credentials) {
    const response = await api.post('/api/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!getToken();
  },
};
