import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Bootstrap admin allowlist. These emails are permitted to self-promote
 * to admin via `claimAdmin` — solving the chicken-and-egg of having no
 * admin to grant the first admin. ADMIN_EMAILS env var (comma-separated)
 * on the Convex deployment is merged in if set, so the list can be
 * extended without a code change.
 */
const BOOTSTRAP_ADMIN_EMAILS = ["founders@denoiselabs.com"];

function adminAllowlist(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...fromEnv])];
}

/**
 * Returns the currently signed-in user (or null if signed out).
 * Used by useQuery(api.users.me) for the auth context.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Optional role lookup
    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: role?.role ?? "user",
    };
  },
});

/**
 * Self-promote the signed-in user to admin, but ONLY if their account
 * email is in the bootstrap allowlist (or ADMIN_EMAILS env var). Safe to
 * call repeatedly — idempotent. Anyone not on the allowlist is rejected,
 * so this can't be used for privilege escalation.
 *
 * Usage: sign in as founders@denoiselabs.com, then call
 * useMutation(api.users.claimAdmin) once (e.g. a button on the admin page,
 * or from the Convex dashboard while authenticated).
 */
export const claimAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    const email = (user.email ?? "").toLowerCase();
    if (!email || !adminAllowlist().includes(email)) {
      throw new Error(
        `${user.email ?? "this account"} is not on the admin allowlist.`
      );
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      if (existing.role !== "admin") {
        await ctx.db.patch(existing._id, { role: "admin" });
      }
      return { role: "admin" as const, changed: existing.role !== "admin" };
    }

    await ctx.db.insert("userRoles", { userId, role: "admin" });
    return { role: "admin" as const, changed: true };
  },
});
