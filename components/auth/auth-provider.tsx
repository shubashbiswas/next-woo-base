"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { AuthUser } from "@/lib/types.d";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// In-memory auth store for demo (replace with proper auth service in production)
const AUTH_STORAGE_KEY = "woo-auth";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // In production, call your auth API
    // For demo, simulate login with localStorage
    const token = `demo-token-${Date.now()}`;
    
    const user: AuthUser = {
      id: "1",
      email: email.toLowerCase(),
      name: email.split("@")[0],
      role: "user",
      avatar: null,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    // In production, call your registration API
    // For demo, simulate registration with localStorage
    const user: AuthUser = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase(),
      name,
      role: "user",
      avatar: null,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: `demo-token-${Date.now()}`, user }));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}