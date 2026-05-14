import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
