import { getCurrentSession } from "@/lib/server/session";

export async function GET() {
	const { session, user } = await getCurrentSession();
	
	if (!session) {
		return Response.json({ session: null, user: null }, { status: 401 });
	}

	return Response.json({ 
		session: {
			id: session.id,
			userId: session.userId,
			expiresAt: session.expiresAt
		}, 
		user 
	});
}