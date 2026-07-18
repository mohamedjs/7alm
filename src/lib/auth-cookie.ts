/**
 * Name of the httpOnly cookie carrying the admin's Supabase access token.
 * Shared between the login/logout API routes and the middleware — the cookie
 * is the only auth signal the middleware can see (localStorage is invisible
 * to the server).
 */
export const ADMIN_TOKEN_COOKIE = "7alm_admin_token";
