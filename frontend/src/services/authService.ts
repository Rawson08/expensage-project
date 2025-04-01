import apiClient from './api';
import { LoginRequest, RegisterRequest } from '../types/auth';
import { UserResponse, JwtResponse } from '../types/api';

export const registerUser = async (userData: RegisterRequest): Promise<UserResponse> => {
  try {
    const response = await apiClient.post<UserResponse>('/auth/register', userData);
    return response.data;
  } catch (error: any) {
    // Rethrow or handle specific errors (e.g., email exists)
    throw error.response?.data || new Error('Registration failed');
  }
};

export const loginUser = async (credentials: LoginRequest): Promise<JwtResponse> => {
  try {
    const response = await apiClient.post<JwtResponse>('/auth/login', credentials);
    // Store token upon successful login
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      // Store user info
      const userInfo = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }
    return response.data;
  } catch (error: any) {
    // Rethrow or handle specific errors (e.g., bad credentials)
    throw error.response?.data || new Error('Login failed');
  }
};

export const logoutUser = (): void => {
  // Clear stored token and user info
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
  // Optionally: make an API call to invalidate token on backend if implemented
};

export const getCurrentUser = (): { id: number; name: string; email: string } | null => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            return JSON.parse(userInfo);
        } catch (e) {
            console.error("Failed to parse user info from local storage", e); // Keep this error log
            return null;
        }
    }
    return null;
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

// Function to call the email verification endpoint
export const verifyUser = async (token: string): Promise<string> => {
    try {
        // The backend returns a simple string message on success
        const response = await apiClient.get<string>(`/auth/verify?token=${token}`);
        return response.data;
    } catch (error: any) {
        // Rethrow the error message from the backend response if available
        const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.response?.data || 'Verification failed';
        throw new Error(errorMessage);
    }
};