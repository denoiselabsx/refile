"use client";

import { createContext, useCallback, useContext } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const me = useQuery(api.users.me);
  const { signIn, signOut } = useAuthActions();

  // useQuery returns undefined while loading, null when signed out, object when signed in.
  const isLoading = me === undefined;
  const isAuthenticated = Boolean(me);

  const login = useCallback(() => {
    void signIn("google");
  }, [signIn]);

  const logout = useCallback(async () => {
    await signOut();
    window.location.href = "/";
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user: me ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
