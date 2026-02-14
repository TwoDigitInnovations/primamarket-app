import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password }),
    
  register: (userData) => 
    api.post(API_ENDPOINTS.AUTH.REGISTER, userData),
    
  getProfile: () => 
    api.get(API_ENDPOINTS.AUTH.PROFILE),
    
  logout: () => 
    api.post(API_ENDPOINTS.AUTH.LOGOUT)
};

// Add more API services here as needed
// Example:
// export const userAPI = {
//   getProfile: () => api.get('/user/profile'),
//   updateProfile: (data) => api.put('/user/profile', data),
// };

export default api;
