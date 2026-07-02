# CLAUDE.md — Claude-Specific Project Instructions

> This file supplements `AGENTS.md`. Read `AGENTS.md` first for full architecture and conventions.

@AGENTS.md

---

## Quick Context for Claude

### What is this project?
**7alm** is an Arabic E-commerce platform with:
- A **public checkout funnel** (RTL landing pages at `/` and `/[slug]`)
- A **protected admin dashboard** (LTR, at `/admin/*`)
- **Server-side business logic** via Next.js API routes + Supabase
- **Client-side state** via Redux Toolkit Query (RTK Query)

### Architecture in 30 Seconds
```
Client Components → RTK Query (*.api.ts) → API Routes → Services → Repositories → Supabase
```
- **Never** import `supabase.ts`, `*.repository.ts`, or `*.service.ts` in client code.
- **Always** create API routes as the bridge between client and server.
- **Always** use hooks (`*.hooks.ts`) for UI logic — components should be declarative.

### Design Patterns You Must Follow
1. **Repository Pattern** — Data access is isolated in `*.repository.ts` files
2. **Service Pattern** — Business orchestration in `*.service.ts` files
3. **Factory Pattern** — Shipping providers via `shipping.factory.ts`
4. **State Machine** — Order status transitions via `orderStateMachine.ts`
5. **RTK Query** — Client data fetching with automatic cache invalidation

### File Naming Convention
| Suffix | Layer | Runs On | Purpose |
|---|---|---|---|
| `*.repository.ts` | Data | Server | Raw Supabase queries |
| `*.service.ts` | Domain | Server | Business logic orchestration |
| `*.api.ts` | Client State | Client | RTK Query API definitions |
| `*.hooks.ts` | UI Logic | Client | React hooks for components |
| `*.slice.ts` | Client State | Client | Redux state slices |

### Critical Don'ts
- ❌ Don't put business logic in components or pages
- ❌ Don't import Supabase in client components
- ❌ Don't create monolithic components — split into List + Form
- ❌ Don't hardcode product data — fetch from the database
- ❌ Don't skip TypeScript checks before committing
- ❌ Don't break RTL layout on landing pages

### Adding a New Feature (Template)
1. Define types in `src/features/shared/types.ts`
2. Create `src/features/<domain>/<domain>.repository.ts` (Supabase queries)
3. Create `src/features/<domain>/<domain>.service.ts` (business logic)
4. Create `src/app/api/<domain>/route.ts` (API routes)
5. Create `src/features/<domain>/<domain>.api.ts` (RTK Query)
6. Create `src/features/<domain>/<domain>.hooks.ts` (UI hooks)
7. Register the API in `src/lib/redux/store.ts`
8. Create components in `src/components/<context>/`
9. Create pages in `src/app/(<group>)/<route>/page.tsx`

### Type Checking
```bash
npx tsc --noEmit   # Must pass before any commit
npm run build       # Must pass for deployment readiness
```
