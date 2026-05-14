"use client";

import { useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LoginGooglePage() {
  const { signIn } = useAuthActions();

  useEffect(() => {
    void signIn("google", { redirectTo: "/dashboard" });
  }, [signIn]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Google…</p>
    </div>
  );
}
