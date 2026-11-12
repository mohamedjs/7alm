# Spec 017 — v2: NestJS modular monolith, Meta inbox, launch

**Created**: 2026-11-12 · **Status**: Built (branch `feature/v2-nestjs-backend`) · **Planning hub**: Notion → 7alm (tasks in "7alm Tasks")

## Goal

Move 7alm off Supabase + Next API routes onto a production backend the owner controls, add a single inbox for Meta channels, and ship a public product site + video.

## Decisions (from the owner, 2026-11-12)

| Question | Answer |
| --- | --- |
| Backend | NestJS, modular monolith, DDD layers (domain / application / infrastructure / presentation) |
| Data | PostgreSQL + a good ORM (Prisma 7). **No Supabase.** |
| Messaging / cache | Kafka and Redis |
| Runtime | Docker; own VPS + domain (Caddy for TLS) |
| Existing Supabase data | **Start fresh** — no migration script |
| Meta app | Not created yet → build against documented payloads; owner creates the app + App Review later |
| Product site | GitHub Pages via GitHub Actions |
| Frontend | Next.js stays, becomes presentation-only |

## Scope delivered

1. `backend/` with 15 modules + shared kernel; v1 `/api/*` contract preserved (46 routes) plus new inbox/auth endpoints.
2. Prisma schema for every table the app uses, constraints, `customer_stats` view, transactional outbox.
3. Kafka topics + worker consumers (notifications, Meta ingest, Meta sender, realtime) with retries and DLQs.
4. Meta inbox: webhook verify + HMAC, Messenger / IG DM / WhatsApp receive + send, FB/IG comments public + private reply + hide, 24 h / 7 d window rules, idempotency.
5. Social connect upgraded: long-lived Page token, linked IG account, webhook subscription; WhatsApp WABA + phone id discovery.
6. Frontend: Supabase removed; Server Components read through the api; socket.io realtime; Admin → Inbox (bilingual).
7. Docker: dev compose, prod compose (Caddy, migrate job, backups), multi-stage images.
8. CI (typecheck, tests, migrations, builds, images), Pages deploy, GHCR release.
9. `site/` product landing page (AR/EN, dark/light) and a 47-second video from real screens.

## Done means (verified 2026-11-12)

- Backend: `npm run typecheck` clean, unit + architecture tests green, `nest build` OK.
- Web: `tsc --noEmit` clean, `next build` OK (inside the Docker image build).
- `docker compose -f docker-compose.prod.yml up` → every service healthy behind Caddy/HTTPS; `test/smoke.mjs` (14 checks) and `test/meta-smoke.mjs` (14 checks) pass through Caddy.

## Not done / needs the owner

- Real Meta sends: needs the Meta app, a Page/IG/WhatsApp number with a role on it, and App Review for public use.
- First production deploy on the VPS (DNS + `.env.production`).
- Enable GitHub Pages (Settings → Pages → Source: GitHub Actions).
- n8n workflows still point at the old base URL until re-imported with the new domain.
- Pre-existing v1 lint findings (React compiler rules) — CI reports them without blocking.
