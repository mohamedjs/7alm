/**
 * Name of the httpOnly cookie carrying the admin's access token (set by the
 * NestJS `POST /api/auth/login`). The middleware reads it; localStorage is
 * invisible to the server.
 */
export const ADMIN_TOKEN_COOKIE = "7alm_admin_token";
