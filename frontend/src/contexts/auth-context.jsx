"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check session on mount and set up periodic checks
  useEffect(() => {
    checkSession();
    
    // Check session every 30 seconds to stay in sync
    const interval = setInterval(checkSession, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/session');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          localStorage.setItem("isAuthenticated", "true");
        } else {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("isAuthenticated");
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("isAuthenticated");
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Fallback to localStorage for development/testing
      const authStatus = localStorage.getItem("isAuthenticated");
      if (authStatus === "true") {
        setIsAuthenticated(true);
      }
    }
  };

  const login = () => {
    // For real login, redirect to Google OAuth
    window.location.href = '/login/google';
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      
      if (response.ok || response.redirected) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("isAuthenticated");
        // Redirect to home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout on client side
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("isAuthenticated");
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
