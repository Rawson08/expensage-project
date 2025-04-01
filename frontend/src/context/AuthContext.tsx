import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getCurrentUser, getAuthToken, logoutUser as serviceLogout } from '../services/authService';

export interface AuthUser { // Added export
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: { id: number; name: string; email: string }, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = getCurrentUser();

    if (storedToken && storedUser) {
      setUser(storedUser);
      setToken(storedToken);
      // TODO: Optionally verify token validity with backend here
    }
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser, token: string) => {
    setUser(userData);
    setToken(token);
  };

  const logout = () => {
    serviceLogout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};