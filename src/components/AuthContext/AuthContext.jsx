import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI, usersAPI } from "../../services/api";

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
