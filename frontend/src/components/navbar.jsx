"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Search, Settings, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();

  // Check session on component mount and set up periodic checks
  useEffect(() => {
    setMounted(true);
    checkSession();
    
    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/session');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/login/google';
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      
      if (response.ok || response.redirected) {
        setUser(null);
        setIsLoggedIn(false);
        // Redirect to home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const FilePenIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-file-pen-icon lucide-file-pen"
    >
      <path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
    </svg>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b backdrop-blur-md" style={{
      borderColor: 'var(--border)',
      backgroundColor: 'var(--background)',
      opacity: 0.95
    }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <FilePenIcon />
          <span className="text-xl font-bold">ReFile</span>
        </div>

        {/* Right: Icons and Buttons */}
        <div className="flex items-center gap-3">
          {/* Search Icon */}
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Search className="h-5 w-5" />
          </Button>

          {/* Settings Icon */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative"
          >
            {!mounted ? (
              <div className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <Sun className="h-5 w-5 transition-transform hover:rotate-12" />
            ) : (
              <Moon className="h-5 w-5 transition-transform hover:-rotate-12" />
            )}
          </Button>

          {/* Conditional Rendering based on login state */}
          {isLoggedIn ? (
            <>
              {/* Profile Picture and Logout Menu */}
              <div className="flex items-center gap-2">
                {user?.picture ? (
                  <Avatar className="h-8 w-8 border-2 border-gray-200 dark:border-gray-700">
                    <AvatarImage 
                      src={user.picture} 
                      alt={user.name || 'Profile'} 
                    />
                    <AvatarFallback>
                      {user.name 
                        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : user.email 
                          ? user.email[0].toUpperCase()
                          : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Logout"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                >
                  {isLoggingOut ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="hidden rounded-full px-5 md:inline-flex"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
                onClick={handleLogin}
              >
                <User className="h-4 w-4" />
                Sign up
              </Button>
              <Button 
                className="rounded-full px-5"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)'
                }}
                onClick={handleLogin}
              >
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
