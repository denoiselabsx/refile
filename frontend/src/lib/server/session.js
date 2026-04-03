"use server";

import { createClient } from '@supabase/supabase-js';
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { cookies } from "next/headers";
import { cache } from "react";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function validateSessionToken(token) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	
	const { data: rows, error } = await supabase
		.from('sessions')
		.select(`
			session_id,
			user_id,
			expires_at,
			users!inner(
				user_id,
				google_id,
				email,
				name,
				picture
			)
		`)
		.eq('session_id', sessionId)
		.limit(1);

	if (error || !rows || rows.length === 0) return { session: null, user: null };

	const row = rows[0];

	// Fetch role based on user email
	const { data: roleRows } = await supabase
		.from('user_roles')
		.select('role')
		.eq('email', row.users.email);

	const role = roleRows && roleRows.length > 0 ? roleRows[0].role : 'U';

	const session = {
		id: row.session_id,
		userId: row.user_id,
		expiresAt: new Date(row.expires_at)
	};

	const user = {
		id: row.users.user_id,
		googleId: row.users.google_id,
		email: row.users.email,
		name: row.users.name,
		picture: row.users.picture,
		role
	};

	const now = Date.now();

	if (now >= session.expiresAt.getTime()) {
		await supabase
			.from('sessions')
			.delete()
			.eq('session_id', session.id);
		return { session: null, user: null };
	}

	// Renew session if it's expiring in the next 15 days
	if (now >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(now + 1000 * 60 * 60 * 24 * 30); // +30 days
		await supabase
			.from('sessions')
			.update({ expires_at: session.expiresAt.toISOString() })
			.eq('session_id', session.id);
	}

	return { session, user };
}

export const getCurrentSession = cache(async () => {
	const token = (await cookies()).get("session")?.value ?? null;
	if (!token) return { session: null, user: null };
	return validateSessionToken(token);
});

export async function invalidateSession(sessionId) {
	await supabase
		.from('sessions')
		.delete()
		.eq('session_id', sessionId);
}

export async function invalidateUserSessions(userId) {
	await supabase
		.from('sessions')
		.delete()
		.eq('user_id', userId);
}

export async function setSessionTokenCookie(token, expiresAt) {
	(await cookies()).set("session", token, {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		expires: expiresAt
	});
}

export async function deleteSessionTokenCookie() {
	(await cookies()).set("session", "", {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 0
	});
}

export async function generateSessionToken() {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	return encodeBase32(tokenBytes).toLowerCase();
}

export async function createSession(token, userId) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // +30 days

	await supabase
		.from('sessions')
		.insert({
			session_id: sessionId,
			user_id: userId,
			expires_at: expiresAt.toISOString()
		});

	return {
		id: sessionId,
		userId,
		expiresAt
	};
}
