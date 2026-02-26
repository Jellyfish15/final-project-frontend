import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authAPI, usersAPI } from "../../services/api";

// Session management constants
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_REFRESH_BUFFER = 60 * 1000; // Refresh 1 minute before expiry
const MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Token validation utility
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Secure storage wrapper with encryption placeholder
const secureStorage = {
  set: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  remove: (key) => localStorage.removeItem(key),
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const saveUserToStorage = (userData) => {
    localStorage.setItem("nudlUser", JSON.stringify(userData));
  };

  const setAuthenticatedUser = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    saveUserToStorage(userData);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem("nudlUser");
      const token = localStorage.getItem("authToken");

      if (savedUser && token) {
        try {
          // Verify token with backend
          const response = await authAPI.getCurrentUser();
          if (response.success) {
            setAuthenticatedUser(response.user);
          } else {
            // Invalid token, clear storage
            localStorage.removeItem("nudlUser");
            localStorage.removeItem("authToken");
          }
        } catch (error) {
          console.error("Error verifying saved user:", error);
          localStorage.removeItem("nudlUser");
          localStorage.removeItem("authToken");
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      console.log("[AuthContext] Login response:", response);
      console.log(
        "[AuthContext] Token after login:",
        localStorage.getItem("authToken"),
      );
      if (response.success) {
        setAuthenticatedUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      console.log("[AuthContext] Register response:", response);
      console.log(
        "[AuthContext] Token after register:",
        localStorage.getItem("authToken"),
      );
      if (response.success) {
        setAuthenticatedUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates) => {
    try {
      const response = await usersAPI.updateProfile(updates);
      if (response.success) {
        const updatedUser = { ...user, ...response.user };
        setAuthenticatedUser(updatedUser);
        return { success: true, user: updatedUser };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error("Update user error:", error);
      return { success: false, message: error.message };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
