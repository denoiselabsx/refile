"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Moon, 
  Sun, 
  ChevronLeft,
  FilePen,
  LogOut,
  Layers3,
  Workflow
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleMouseEnter = () => {
    // Reset manual collapse when hovering again
    if (isManuallyCollapsed) {
      setIsManuallyCollapsed(false);
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isManuallyCollapsed) {
      setIsExpanded(false);
    }
  };

  const handleToggleCollapse = () => {
    setIsManuallyCollapsed(true);
    setIsExpanded(false);
  };

  return (
    <motion.aside
      className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r transition-colors duration-300"
      style={{
        width: isExpanded ? "260px" : "64px",
        borderColor: 'var(--border)',
        backgroundColor: 'var(--background)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={false}
      animate={{ width: isExpanded ? 260 : 64 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center px-3">
        <div className="flex items-center gap-3">
          <FilePen className="h-6 w-6" style={{ color: 'var(--foreground)' }} />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden text-lg font-bold whitespace-nowrap"
                style={{ color: 'var(--foreground)' }}
              >
                ReFile
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {/* Chat Button */}
        <button 
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
          style={{
            color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent-foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
          onClick={() => window.location.href = '/'}
        >
          <MessageSquare className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Chat
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Presets Button */}
        <button 
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
          style={{
            color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent-foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
          onClick={() => window.location.href = '/presets'}
        >
          <Layers3 className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Community Presets
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Workflow Builder Button */}
        <button 
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
          style={{
            color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent-foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
          onClick={() => window.location.href = '/workflow'}
        >
          <Workflow className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Workflow Builder
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
          style={{
            color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent-foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
        >
          {mounted && (
            <>
              {theme === "dark" ? (
                <Sun className="h-5 w-5 shrink-0" />
              ) : (
                <Moon className="h-5 w-5 shrink-0" />
              )}
            </>
          )}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* Bottom Section - User Profile & Collapse Button */}
      <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          {/* User Profile */}
          <button 
            className="flex items-center gap-3 rounded-lg p-2 transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white">
              A
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap text-sm"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Account
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Logout & Collapse Buttons */}
          <div className="flex gap-1">
            <AnimatePresence>
              {isExpanded && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                  style={{ color: 'var(--foreground)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleToggleCollapse}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent)';
                    e.currentTarget.style.color = 'var(--accent-foreground)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--muted-foreground)';
                  }}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
