import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'; // Fallback for safety

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to include the JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access - 401. Clearing token.'); // Keep error log for this case
      localStorage.removeItem('authToken');
      // Consider redirecting to login or showing a message
      // window.location.href = '/login';
    }
    // Pass through other errors
    return Promise.reject(error);
  }
);


export default apiClient;