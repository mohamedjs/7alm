import type { Admin } from "./admin";

export const ADMIN_REPOSITORY = Symbol("ADMIN_REPOSITORY");
export interface AdminRepository {
  findByEmail(email: string): Promise<Admin | null>;
  findById(id: string): Promise<Admin | null>;
  create(input: { email: string; passwordHash: string; fullName: string | null }): Promise<Admin>;
  touchLogin(id: string): Promise<void>;
  count(): Promise<number>;
}

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface TokenClaims {
  sub: string;
  email: string;
  typ: "access" | "refresh";
}

export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");
export interface TokenService {
  issue(claims: Omit<TokenClaims, "typ">): Promise<{ access: string; refresh: string; accessTtlSeconds: number }>;
  verify(token: string, typ: TokenClaims["typ"]): Promise<TokenClaims | null>;
}
