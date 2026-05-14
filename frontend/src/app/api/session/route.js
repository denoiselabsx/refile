import { getCurrentSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const { session, user } = await getCurrentSession();

		if (!session) {
			return Response.json({ session: null, user: null }, { status: 401 });
		}

		return Response.json({
			session: {
				id: session.id,
				userId: session.userId,
				expiresAt: session.expiresAt,
			},
			user,
		});
	} catch {
		// Most often: Supabase env vars missing in local dev.
		// Treat as logged-out instead of crashing the dashboard.
		return Response.json({ session: null, user: null }, { status: 401 });
	}
}
