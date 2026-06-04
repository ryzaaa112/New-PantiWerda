// src/services/api.js
import axios from 'axios';

let API_BASE_URL;

// Check if running in Electron
if (typeof window !== 'undefined' && window.electronAPI) {
  // Running in Electron - use localhost
  API_BASE_URL = 'http://localhost:5000/api';
} else if (process.env.NODE_ENV === 'production') {
  // Production web build
  API_BASE_URL = '/api';
} else {
  // Development
  API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
}
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData - let browser set it
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error.response?.data || { error: 'Network Error' });
  }
);

// Authentication
export const authAPI = {
  login: (username, password) => api.post('/login', { username, password }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Residents
export const residentsAPI = {
  getAll: (filters = {}) => api.get('/residents', { params: filters }),
  getById: (id) => api.get(`/residents/${id}`),
  create: (data) => api.post('/residents', data),
  update: (id, data) => api.put(`/residents/${id}`, data),
  delete: (id) => api.delete(`/residents/${id}`),
};

// Employees
export const employeesAPI = {
  getAll: (filters = {}) => api.get('/employees', { params: filters }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Daily Records
export const recordsAPI = {
  getAll: (filters = {}) => api.get('/records', { params: filters }),
  create: (data) => api.post('/records', data),
  delete: (id) => api.delete(`/records/${id}`),
};

// Transactions (Donations)
export const transactionsAPI = {
  getAll: (filters = {}) => api.get('/transactions', { params: filters }),
  create: (data) => {
    // Don't set Content-Type for FormData - let browser set it
    return api.post('/transactions', data, {
      headers: {
        'Content-Type': undefined  // Let the browser set the correct boundary
      }
    });
  },
  getFinancialSummary: (year) => api.get('/financial-summary', { params: { year } }),
  delete: (id) => api.delete(`/transactions/${id}`),
};

// Users Management
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  delete: (id) => api.delete(`/users/${id}`),
  changePassword: (userId, passwordData) => api.put(`/users/${userId}/password`, passwordData),
};

// Activity Types
export const activityTypesAPI = {
  getAll: () => api.get('/activity-types'),
};

// Donation Categories
export const donationCategoriesAPI = {
  getAll: () => api.get('/donation-categories'),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard-stats'),
};

// Rooms Management
export const roomsAPI = {
  getAll: () => api.get('/rooms'),
  getAvailable: () => api.get('/rooms/available'),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
  assignRoom: (residentId, data) => api.put(`/residents/${residentId}/assign-room`, data),
  getOccupancyReport: () => api.get('/rooms/occupancy-report')
};

export default api;