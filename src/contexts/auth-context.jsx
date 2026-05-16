"use client";

import { createContext, useCallback, useContext } from "react";
import { useQuery, useConvexAuth } from "convex/react";
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
  // Two distinct phases must both settle before we can claim "not signed in":
  //   1. The Convex auth TOKEN is still loading/refreshing
  //      (useConvexAuth().isLoading). During this window api.users.me runs
  //      UNauthenticated and returns null — a false negative.
  //   2. The me profile query itself is in flight (me === undefined).
  //
  // Old code only modelled (2), so during (1) it briefly reported
  // isAuthenticated=false. Route guards then bounced /dashboard → / and
  // back once the token arrived (the flicker, in dev AND prod). Gating on
  // BOTH phases removes the false negative.
  const { isLoading: authLoading, isAuthenticated: hasSession } =
    useConvexAuth();
  const me = useQuery(api.users.me);
  const { signIn, signOut } = useAuthActions();

  // Still loading if the token phase is unsettled, OR we have a session but
  // the profile query hasn't resolved yet.
  const isLoading = authLoading || (hasSession && me === undefined);
  // Only authenticated once the session exists AND the profile resolved.
  const isAuthenticated = hasSession && Boolean(me);

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
