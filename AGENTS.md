# 🏪 7alm — AI Agent Entrypoint

> **7alm** is a production-ready, Arabic-first e-commerce platform. **v2 (2026-11)**: a **NestJS 11 modular monolith** in `backend/` (PostgreSQL via Prisma 7, Kafka, Redis, Docker) owns all business logic and data; the **Next.js 16** app in `src/` is presentation only (storefront, RTL landing pages, admin dashboard). Supabase was removed. It powers a landing-page funnel, a storefront, an admin dashboard, an order lifecycle with shipping, and a **Meta inbox** (Messenger, Instagram DM, WhatsApp Cloud API, FB/IG comments). The landing pages are RTL/Arabic-only and fixed. Both the public storefront (`(store)`) and the admin dashboard (`(admin)`) are bilingual (Arabic default / English available), direction-aware (RTL default / LTR available), and theme-aware (dark default / light available) via runtime toggles with independent `localStorage` keys.

Full docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md) · [`docs/META_INTEGRATION.md`](docs/META_INTEGRATION.md) · [`backend/README.md`](backend/README.md)

---

## ⚠️ Critical Rules — Read Before Writing Any Code

1. **Next.js 16 (Turbopack)**: App Router; APIs may differ from your training data. Check `node_modules/next/dist/docs/` if unsure.
2. **Web tier has no data access**: the Next app never talks to a database and holds no server secrets. Client components → RTK Query (`src/features/*/*.api.ts`) → `/api/*`. Server Components → `src/features/store/store.server.ts` (`serverGet` → `BACKEND_URL/api/*`). There are **no** Next API routes, services or repositories any more — add backend behaviour in `backend/src/modules/<module>/`.
3. **Arabic RTL**: The landing pages are fully RTL (`dir="rtl"`, `lang="ar"`), fixed — no toggle. Both the admin dashboard (`(admin)/admin/*`) and the public storefront (`(store)/*`) are bilingual and direction-aware: they default to Arabic/RTL but support a runtime EN/AR + LTR/RTL toggle (`src/features/i18n/i18n.hooks.tsx`, `useLocale()`), persisted per-browser in `localStorage` under independent keys (`admin-locale` / `store-locale`). Both also support a dark/light theme toggle (`src/features/theme/theme.hooks.ts`, `useTheme()`), persisted independently (`admin-theme` / `store-theme`). Any admin or store UI you add must use logical CSS properties (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`) — never physical `ml-*`/`mr-*`/`pl-*`/`pr-*`/`text-left`/`text-right`/`left-*`/`right-*` — and every first-party string must go through `t(key)` against `src/features/i18n/dictionary.ts` (admin keys under `nav.*`/`action.*`/`inbox.*`/etc., store keys under `store.*`), not a hardcoded literal.
4. **TypeScript strict, both sides**: `npx tsc --noEmit` (root) and `cd backend && npm run typecheck && npm test` must pass before committing.
5. **Backend layering** (enforced by `backend/test/architecture.spec.ts`): inside a module `domain/` (pure rules, ports) → `application/` (use cases, facades) → `infrastructure/` (Prisma, HTTP clients) → `presentation/` (controllers, webhooks). Other modules are imported **only via their `index.ts`**. Only `infrastructure/` touches Prisma. Cross-module side effects go through **domain events → outbox → Kafka**, not direct calls.
6. **Keep the `/api/*` contract**: responses are `{ success: true, data }` / `{ success: false, error }`, snake_case, money as numbers, ISO dates. The frontend, n8n workflows and provider webhooks depend on it.

---

## 🏗️ Architecture

```
Browser → Caddy ─┬─ /api, /socket.io, /uploads → api (NestJS) → PostgreSQL · Redis
                 └─ everything else          → web (Next.js) ─(Server Components)→ api
webhooks (Meta, Bosta, OpenRouter, n8n) → api → outbox_events → worker → Kafka → consumers
worker → Graph API · Resend · n8n · socket.io (via Redis emitter)
```

| Module (`backend/src/modules/`) | Owns |
| --- | --- |
| `identity` | Admin auth (argon2id + JWT), `AdminGuard`, `N8nGuard` |
| `catalog` | Products, categories, price tiers, stock (atomic SQL), cached reads |
| `geo`, `customers` | Zones + shipping prices; customers by phone, `customer_stats` view |
| `promotions` | Coupons: `evaluateCoupon` rules, atomic redemption |
| `ordering` | Checkout, `Order` aggregate + state machine, courier/n8n webhooks |
| `shipping` | Courier Strategy + Factory (Bosta, ABS, Mylerz, `test` simulator) |
| `reviews` | Verified-buyer reviews via signed links |
| `notifications` | Worker: customer WhatsApp via n8n, admin e-mail via Resend |
| `messaging` | Meta inbox: webhook ingest, conversations, comments, replies |
| `social` | OAuth connect (Facebook Page + IG, WhatsApp WABA, TikTok), encrypted tokens |
| `ai-studio`, `media`, `crm`, `realtime` | AI campaigns/images/videos; uploads; CRM composition + Evolution WhatsApp; socket.io gateway |

### Design patterns
1. **State Machine** — `ordering/domain/order-status.ts` (`ORDER_TRANSITIONS`) + `Order` aggregate. The frontend copy `src/lib/orderStateMachine.ts` holds only UI labels/colors/actions.
2. **Strategy + Factory** — couriers (`shipping/`), OAuth providers (`social/`).
3. **Repository + Ports** — repositories implement domain ports (`CATALOG_STORE`, `ORDER_STORE`, `INBOX_STORE`, …).
4. **Unit of Work + Transactional Outbox** — `shared/infrastructure/prisma/unit-of-work.ts`, relay `shared/infrastructure/outbox/outbox-relay.service.ts`.
5. **RTK Query + tag invalidation** on the client; `useRealtime(table)` (socket.io) refetches on `orders:changed`, `catalog:changed`, `crm:whatsapp`, `inbox:*`.

---

## 📁 Where things live

```
backend/
  prisma/schema.prisma, prisma/migrations/    # PostgreSQL schema (snake_case = API contract)
  src/main.ts, src/app.module.ts              # api process
  src/worker.ts, src/worker.module.ts         # worker process (outbox relay + Kafka consumers)
  src/shared/                                 # kernel: config, prisma, uow/outbox, kafka, redis, storage, http
  src/modules/<module>/{domain,application,infrastructure,presentation}, index.ts
  test/ (architecture.spec.ts, smoke.mjs, meta-smoke.mjs, demo-activity.mjs)
src/                                          # Next.js presentation
  app/(landing) (store) (admin)/admin/…       # pages; admin/inbox = Meta inbox UI
  features/*/*.api.ts, *.hooks.ts, *.slice.ts # RTK Query + UI hooks
  features/store/store.server.ts              # Server Component reads
  lib/api/server-fetch.ts, lib/realtime/socket.ts, middleware.ts
site/                                         # product landing site (GitHub Pages)
video/                                        # launch-video tooling (slides → ffmpeg)
deploy/Caddyfile, deploy/backup.sh, docker-compose.yml (dev), docker-compose.prod.yml
automation/                                   # n8n workflows (call the same /api/* endpoints)
```

## Adding a backend feature

1. Model in `backend/prisma/schema.prisma` → `npx prisma migrate dev --name <x>`.
2. `domain/`: types, rules, a port interface. Unit-test the rules.
3. `infrastructure/`: repository implementing the port (map Decimal → number, Date → ISO).
4. `application/`: use case; return domain events to the `UnitOfWork` for side effects.
5. `presentation/`: controller with zod schemas and `AdminGuard` / `N8nGuard`.
6. Export what others need from the module's `index.ts`; register the module in `app.module.ts` (and `worker.module.ts` if it consumes events).
7. Frontend: `src/features/<domain>/<domain>.api.ts` + hooks, register in `src/lib/redux/store.ts`, i18n keys in both `en` and `ar`.

---

## 🔐 Authentication

`POST /api/auth/login` (argon2 check against `admins`) → `{ token, refresh_token, expires_in, user }` + httpOnly cookie `7alm_admin_token`. RTK Query sends `Authorization: Bearer`; `src/middleware.ts` validates the cookie via `GET /api/auth/session`. `POST /api/auth/refresh` renews. The first admin comes from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` when the table is empty. n8n uses `x-n8n-access-token`.

## 🌐 Landing pages

`/{slug}` renders a product (Server Component → `GET /api/products/:slug`). Reserved slugs (`products`, `category`, `cart`, `checkout`, `admin`, `review`, `api`, `uploads`, …) are rejected by `catalog/domain/product.ts`.

---

## 🧑‍💻 Commands

```bash
docker compose up -d                                   # dev infra: postgres :5433, redis :6380, kafka :9094
cd backend && npm run start:dev                        # api :4000   (npm run start:worker:dev for the worker)
BACKEND_URL=http://localhost:4000 NEXT_PUBLIC_API_WS_URL=http://localhost:4000 npx next dev -p 3001
npx tsc --noEmit && (cd backend && npm run typecheck && npm test)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build   # production
```

Environment: backend → `backend/.env.example` (dev) and `.env.production.example` (prod, every variable documented). Web needs only `BACKEND_URL`, `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_IPINFO_TOKEN`.

---

## ✅ Checklist before submitting

- [ ] `npx tsc --noEmit` (web) and `cd backend && npm run typecheck && npm test` pass
- [ ] `npx next build` and `cd backend && npx nest build` succeed
- [ ] New backend code respects the layer rules (architecture test green)
- [ ] No database access, secrets or business rules in `src/`
- [ ] `/api/*` envelope and field names unchanged for existing endpoints
- [ ] New UI strings in both `en` and `ar`; logical CSS only; landing pages stay RTL
