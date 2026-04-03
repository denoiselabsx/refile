import { Google } from "arctic";

export const google = new Google(
	process.env.GOOGLE_CLIENT_ID ?? (() => { throw new Error("GOOGLE_CLIENT_ID is not defined"); })(),
	process.env.GOOGLE_CLIENT_SECRET ?? (() => { throw new Error("GOOGLE_CLIENT_SECRET is not defined"); })(),
	"http://localhost:3000/login/google/callback"
);
