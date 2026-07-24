# Spec: Social Platform Connections — OAuth "Connect Accounts" Foundation

> Status: Approved for implementation · Author: CTO (Opus) · Date: 2026-07-24
> Feature branch context: this is additive; no existing behavior changes.

## 1. Goal & Scope (locked with product owner)

Add an admin dashboard page where an admin **connects the business's social accounts** —
**Facebook, Instagram, TikTok, WhatsApp** — via an OAuth "connect" flow, and sees
**"Connected as @handle"** status per platform.

Locked decisions:
- **Purpose = link + show status only.** Store the token, show connection status. This is a
  *foundation*; posting/inbox/analytics are explicitly out of scope (future features build on this).
- **No developer apps registered yet.** Build the full flow against **env-var placeholders** plus a
  **mock connector** so the entire UX works end-to-end with zero real credentials
  (`SOCIAL_MOCK_MODE=1`). Real endpoints are coded but only used once creds are present.
- **WhatsApp here = the official WhatsApp Cloud API (Meta) OAuth**, a *separate* connection from the
  existing Evolution/n8n WhatsApp integration. Do not touch the existing n8n WhatsApp code.

Non-goals: publishing content, reading DMs/comments, analytics, ads, multi-account per platform.

## 2. Architecture (follows repo conventions)

Reuse the existing patterns:
- 4-layer: `*.repository.ts` → `*.service.ts` → API route → `*.api.ts` (RTK Query) → `*.hooks.ts`.
- **Factory Pattern** for providers, mirroring `src/features/shipping/shipping.factory.ts` +
  `shipping.interface.ts`.
- Admin auth via `verifyAdmin` / `extractToken` from `src/lib/auth.ts` (cleaner than the inline
  auth in `categories/route.ts`; use the helper).
- API envelope: `{ success: boolean, data?, error? }` (same as categories).

## 3. Data model — new table `social_connections`

```sql
CREATE TABLE IF NOT EXISTS social_connections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','whatsapp')),
  account_id     text,                 -- provider's account/user id (null until connected)
  account_name   text,                 -- handle/display name → shown as "Connected as @handle"
  avatar_url     text,
  access_token   text,                 -- ENCRYPTED at rest (never returned to client)
  refresh_token  text,                 -- ENCRYPTED at rest, nullable
  token_expires_at timestamptz,
  scopes         text[] NOT NULL DEFAULT '{}',
  status         text NOT NULL DEFAULT 'disconnected'
                 CHECK (status IN ('disconnected','connected','expired','revoked','error')),
  error_message  text,
  metadata       jsonb NOT NULL DEFAULT '{}',
  connected_by   uuid,                 -- admins.id
  connected_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform)                    -- one connection per platform for now
);
```

- Backend accesses this table with the **service role** (like other tables). No client/RLS access.
- CSRF state for OAuth: use a **signed, httpOnly, short-lived cookie** `social_oauth_state`
  (HMAC-SHA256 over `{platform, adminId, nonce, exp}` keyed by `SOCIAL_TOKEN_ENCRYPTION_KEY`).
  No extra table needed. (Backend may instead use a `social_oauth_states` table if cleaner — its call.)

## 4. Token encryption — `src/lib/crypto.ts`

- AES-256-GCM via Node `crypto`. Key from env `SOCIAL_TOKEN_ENCRYPTION_KEY` (32 bytes, hex or base64).
- `encrypt(plaintext: string): string` → stores `iv:authTag:ciphertext` (base64 parts).
- `decrypt(payload: string): string`.
- Tokens are **never** returned to the client. The list endpoint returns only the public DTO
  (§6 `SocialConnectionPublic`).
- **Read env lazily** — inside functions / a lazy singleton (mirror `getN8nWhatsappService()`),
  **never at module import**. Mock mode still encrypts the fake token, so this key is required even
  for the demo; a top-level `throw` on a missing env would break `npm run build` (Next evaluates
  modules at build time). Same rule for every provider that reads app-id/secret env.

## 5. Provider abstraction — mirror shipping factory

`src/features/social/social.interface.ts`:
```ts
export interface ISocialProvider {
  readonly platform: SocialPlatform;
  readonly isConfigured: boolean;                 // true when real env creds are present
  getAuthUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<SocialTokenResult>;
  getAccountInfo(accessToken: string): Promise<SocialAccountInfo>;
  refreshToken?(refreshToken: string): Promise<SocialTokenResult>;
  revoke?(accessToken: string): Promise<void>;
}
```

`src/features/social/providers/`:
- `facebook.provider.ts`, `instagram.provider.ts`, `tiktok.provider.ts`, `whatsapp.provider.ts` —
  real OAuth endpoints coded (authorize URL, token exchange, `/me`-style account info) but gated on
  `isConfigured`.
- `mock.provider.ts` — bound per platform. `getAuthUrl` returns the **internal callback URL**
  (`{redirectBase}/api/connections/{platform}/callback?code=mock&state=...`) so it loops back with
  no external provider. `exchangeCode` returns a fake token; `getAccountInfo` returns a demo handle
  like `@7alm_demo_{platform}` + a placeholder avatar.

`src/features/social/social.factory.ts`: `getProvider(platform)` returns the real provider when
`isConfigured` (and `SOCIAL_MOCK_MODE !== '1'`), otherwise the mock provider for that platform.

## 6. Types — add to `src/features/shared/types.ts`

```ts
export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp";
export type SocialConnectionStatus = "disconnected" | "connected" | "expired" | "revoked" | "error";

export interface SocialTokenResult {
  accessToken: string; refreshToken?: string; expiresIn?: number; scopes?: string[];
}
export interface SocialAccountInfo {
  accountId: string; accountName: string; avatarUrl?: string; metadata?: Record<string, unknown>;
}
// Full row (server only — includes tokens). Public DTO below is what the API returns.
export interface SocialConnection {
  id: string; platform: SocialPlatform; account_id: string | null; account_name: string | null;
  avatar_url: string | null; scopes: string[]; status: SocialConnectionStatus;
  error_message: string | null; metadata: Record<string, unknown>;
  connected_by: string | null; connected_at: string | null;
  token_expires_at: string | null; created_at: string; updated_at: string;
}
// Safe shape returned to the client — NO tokens.
export interface SocialConnectionPublic {
  platform: SocialPlatform; status: SocialConnectionStatus;
  account_name: string | null; avatar_url: string | null;
  scopes: string[]; connected_at: string | null; is_configured: boolean;
}
```

## 7. API routes

All admin routes: `verifyAdmin(extractToken(req.headers.get("authorization")))`. Envelope responses.

1. `GET  /api/admin/connections` → `SocialConnectionPublic[]` for **all 4 platforms** (merge configured
   platform list with existing rows; platforms without a row report `status: "disconnected"`).
   `is_configured` reflects whether real creds exist (else the card shows a "demo mode" hint).
2. `POST /api/admin/connections/[platform]/authorize` → generates state, sets the signed
   `social_oauth_state` cookie, returns `{ authUrl }`. Frontend opens `authUrl`.
3. `GET  /api/connections/[platform]/callback?code=&state=` — **PUBLIC** (OAuth redirect target).
   Verify state cookie → `provider.exchangeCode` → `provider.getAccountInfo` → encrypt tokens →
   upsert row (`status='connected'`, `connected_at=now()`, `connected_by` from state) →
   **302 redirect** to `/admin/connections?connected={platform}` (or `?error=...`).
4. `DELETE /api/admin/connections/[platform]` → `provider.revoke?.()` best-effort → set
   `status='revoked'` and null out tokens (or delete row). Returns `{ success: true }`.

(Token refresh endpoint is optional / future.)

## 8. Frontend

- `src/features/social/social.api.ts` — RTK Query `socialApi` (`getConnections` query;
  `initiateConnect` mutation → `{ authUrl }`; `disconnect` mutation). `providesTags`/`invalidatesTags`
  on `Connection`. Register in `src/lib/redux/store.ts`.
- `src/features/social/social.hooks.ts` — `useConnectionsManager()`: list; `connect(platform)` calls
  the `initiateConnect` mutation then does a **same-tab redirect** (`window.location.href = authUrl`);
  `disconnect(platform)` with a confirm. On mount, read `?connected=` / `?error=` from the URL →
  toast + refetch + clean the query string. **No popup, no postMessage** (the return to the callback
  is a top-level GET so the `SameSite=Lax` state cookie rides along; works for mock and real alike).
- `src/components/admin/connections/ConnectionsPage.tsx` (client) + `PlatformCard.tsx`.
  Card: platform icon + name, status badge, and either a **Connect** button ("Not connected") or
  avatar + **"Connected as @handle"** + **Disconnect**. Show a subtle "Demo mode" chip when
  `is_configured === false`.
- `src/app/(admin)/admin/connections/page.tsx` — route rendering `ConnectionsPage`.
- Nav: add `{ key: "nav.connections", path: "/admin/connections" }` to the nav array in
  `src/components/admin/dashboard/AdminLayoutClient.tsx`.
- i18n (`src/features/i18n/dictionary.ts`, **both `ar` + `en`**): `nav.connections`, and action/store
  keys: connect, disconnect, connected-as, connecting, not-connected, disconnect-confirm,
  demo-mode, connections-title, connections-subtitle, per-platform display names.

Constraints: RTL default, **logical CSS props only** (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/
`text-start`/`text-end`), theme-aware (dark default), every string via `t(key)`. No Supabase import in
client. Platform brand accents are fine but must work in light + dark.

## 9. Env vars (placeholders — document in AGENTS.md + `.env.example`)

```
SOCIAL_MOCK_MODE=1                      # force mock connector (no real creds needed)
SOCIAL_OAUTH_REDIRECT_BASE=http://localhost:3000
SOCIAL_TOKEN_ENCRYPTION_KEY=<32-byte hex/base64>
FACEBOOK_APP_ID=  FACEBOOK_APP_SECRET=
INSTAGRAM_APP_ID= INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_KEY= TIKTOK_CLIENT_SECRET=
WHATSAPP_APP_ID=  WHATSAPP_APP_SECRET=
```

## 10. UX flow ("users follow steps to connect")

1. Admin opens `/admin/connections` → 4 cards, each "Not connected" + Connect.
2. Click **Connect** → `POST authorize` → **same-tab redirect** to the returned `authUrl`. In mock
   mode `authUrl` is the internal callback itself, so it loops back instantly.
3. Provider redirects to the public **callback** → backend stores encrypted token → 302 to
   `/admin/connections?connected={platform}`.
4. Page loads, reads `?connected=`, toasts + refetches → card shows avatar + **"Connected as @handle"**
   + green badge + Disconnect.
5. **Disconnect** → confirm → revoke + clear → back to "Not connected".

## 11. Acceptance criteria

- `npx tsc --noEmit` and `npm run build` both pass.
- With `SOCIAL_MOCK_MODE=1` (no real creds), an admin connects **all 4** platforms end-to-end,
  sees "Connected as @…", and can disconnect — fully working demo.
- Tokens stored **encrypted**; the `GET /api/admin/connections` payload contains **no** tokens.
- Every admin route enforces `verifyAdmin`; the callback verifies the state cookie (CSRF).
- RTL + i18n (ar/en) + theme correct; no physical CSS props; all strings via `t()`.
- Follows the 4-layer + factory patterns; no Supabase in client code.

## 12. Delegation split

- **@backend**: §3 SQL migration, §4 crypto, §5 interface+factory+providers(real+mock),
  §6 types, §7 routes, `social.repository.ts`, `social.service.ts`, §9 env docs.
- **@frontend**: §8 RTK api + hooks + components + page + nav entry + i18n + store registration,
  §10 UX (same-tab redirect + `?connected=`/`?error=` handling), consuming the §7 API and §6 public DTO.
- Contract between them = §6 types + §7 route shapes (both must match exactly).
