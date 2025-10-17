import React, { createContext, useContext, useState, useEffect } from "react";

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
    const savedUser = localStorage.getItem("nudlUser");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("nudlUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData) => {
    setAuthenticatedUser(userData);
  };

  const register = (userData) => {
    const newUser = {
      ...userData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      followers: 0,
      following: 0,
      videos: 0,
      likes: 0,
    };
    setAuthenticatedUser(newUser);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("nudlUser");
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setAuthenticatedUser(updatedUser);
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
