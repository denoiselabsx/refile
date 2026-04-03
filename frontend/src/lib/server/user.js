import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function createUser(googleId, email, name, picture) {
    const { data: rows, error } = await supabase
        .from('users')
        .insert({
            google_id: googleId,
            email: email,
            name: name,
            picture: picture
        })
        .select('user_id')
        .single();

	if (error || !rows) {
		throw new Error("Unexpected error");
	}
	const user = {
		id: rows.user_id,
		googleId,
		email,
		name,
		picture,
        role: 'U'
	};
	return user;
}

export async function getUserFromGoogleId(googleId) {
    const { data: rows, error } = await supabase
        .from('users')
        .select('user_id, google_id, email, name, picture')
        .eq('google_id', googleId);

    if (error || !rows || rows.length === 0) {
        return null;
    }

    const userRow = rows[0];

    // Fetch role from user_roles table
    // const { data: roleRows } = await supabase
    //     .from('user_roles')
    //     .select('role')
    //     .eq('email', userRow.email);

    // const role = roleRows && roleRows.length > 0 ? roleRows[0].role : 'U';

    const user = {
        id: userRow.user_id,
        googleId: userRow.google_id,
        email: userRow.email,
        name: userRow.name,
        picture: userRow.picture,
        role: 'U'
    };

    return user;
}

