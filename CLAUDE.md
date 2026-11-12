# CLAUDE.md — Claude-Specific Project Instructions

> This file supplements `AGENTS.md`. Read `AGENTS.md` first for full architecture and conventions.

@AGENTS.md

---

## Quick Context for Claude

### What is this project?
**7alm** is an Arabic e-commerce platform, v2 since 2026-11:
- **backend/** — NestJS 11 modular monolith: PostgreSQL (Prisma 7), Kafka (outbox → consumers), Redis, Docker. Two processes from one image: `api` and `worker`.
- **src/** — Next.js 16 presentation: RTL landing pages (`/` and `/[slug]`), bilingual storefront, bilingual admin (`/admin/*`, incl. the Meta **Inbox**).
- **site/** — product landing site on GitHub Pages; **video/** — launch-video tooling.

### Architecture in 30 Seconds
```
Client Components → RTK Query (*.api.ts) → /api/* → NestJS controller → use case → domain → repository (Prisma) → PostgreSQL
Server Components → store.server.ts (serverGet) → same /api/*
Side effects → domain events → outbox_events → worker → Kafka → consumers (notifications, Meta sends, realtime)
```
- **Never** add Next API routes, services, repositories or database clients to `src/`.
- **Always** put business rules in `backend/src/modules/<module>/domain/` and test them.
- **Always** import another module through its `index.ts`.

### Critical Don'ts
- ❌ Business logic in components, pages or controllers
- ❌ Prisma outside `infrastructure/`; Nest/Prisma inside `domain/`
- ❌ Calling an external API inside a webhook request (write to the outbox, let the worker do it)
- ❌ Changing the `/api/*` response envelope or field names
- ❌ Hardcoded UI strings (use `t(key)` with `en` + `ar`), physical CSS directions, breaking landing-page RTL

### Type checking / tests
```bash
npx tsc --noEmit                                # web
cd backend && npm run typecheck && npm test     # backend + architecture rules
node --env-file=backend/.env backend/test/smoke.mjs        # e2e against a running api
```
