# 7alm v2 — Architecture

7alm is one product with two deployables built from this repository:

| Part | Folder | Runs as | Job |
| --- | --- | --- | --- |
| **web** | `/` (`src/`) | Next.js 16 standalone | Storefront, RTL landing pages, admin dashboard. Presentation only. |
| **backend** | `backend/` | NestJS 11 — `api` and `worker` processes from one image | All business logic, persistence, integrations. |

Supabase is gone. PostgreSQL is accessed only by the backend, through Prisma.

```
Browser ──HTTPS──▶ Caddy ──/api, /socket.io, /uploads──▶ api (NestJS) ──▶ PostgreSQL (Prisma)
                     └──────────── everything else ────▶ web (Next.js) ─┐       Redis
                                                     Server Components ─┘ HTTP   │
Meta / Bosta / OpenRouter / n8n ──webhooks──▶ api ── outbox rows ──▶ worker ──▶ Kafka ──▶ worker consumers
                                                                          └──▶ Graph API, Resend, n8n, socket.io (via Redis)
```

## Modular monolith

`backend/src/modules/<module>/` — one folder per bounded context:

| Module | Owns |
| --- | --- |
| `identity` | Admin accounts (argon2id), JWT access/refresh tokens, `AdminGuard`, `N8nGuard`, first-admin seeding |
| `catalog` | Products, categories, quantity price tiers, stock, search, best sellers; Redis-cached reads |
| `geo` | Countries, cities, zones + shipping prices |
| `customers` | Find-or-create by phone, addresses, `customer_stats` view |
| `promotions` | Coupons: rules, preview, atomic redemption |
| `ordering` | Checkout, order items, the order state machine, courier + n8n webhooks |
| `shipping` | Courier strategy + factory (Bosta live; ABS, Mylerz stubs; `test` simulator) |
| `reviews` | Verified-buyer reviews, signed review links, moderation |
| `notifications` | Worker-only: customer WhatsApp via n8n, admin e-mail via Resend |
| `messaging` | **Meta inbox**: Messenger, Instagram DM, WhatsApp Cloud API, FB/IG comments |
| `social` | OAuth "connect accounts" (Facebook Page + IG, WhatsApp WABA, TikTok) with encrypted tokens |
| `ai-studio` | Campaigns, AI images and async AI videos (OpenRouter), Telegram delivery |
| `media` | Admin uploads to the uploads volume |
| `crm` | Composition for the CRM screens + the Evolution-API WhatsApp channel (n8n) |
| `realtime` | socket.io gateway (admins room) with the Redis adapter |
| `shared/` | Kernel: env config, Prisma, unit of work + outbox, Kafka, Redis, storage, HTTP envelope, errors |

### Layers inside a module

| Layer | Folder | Contains | May import |
| --- | --- | --- | --- |
| Domain | `domain/` | Entities/aggregates (e.g. `Order`), value rules (`lineTotal`, `evaluateCoupon`, `decideSendMode`), ports (interfaces) | `shared/domain` only — no Nest, no Prisma |
| Application | `application/` | Use cases (`PlaceOrderUseCase`, `SendMessage`, `ReplyToComment`, …) and module facades | domain, shared/application ports |
| Infrastructure | `infrastructure/` | Prisma repositories, Graph API / Bosta / OpenRouter clients, mappers | everything above |
| Presentation | `presentation/` | Controllers, webhook endpoints, gateways, zod request schemas | application |

### Rules (enforced by `backend/test/architecture.spec.ts`)

1. Another module is imported **only through its `index.ts`**. No deep imports.
2. `domain/` imports no framework, ORM, broker or HTTP code.
3. Only `infrastructure/` touches Prisma.
4. Synchronous cross-module calls go through an exported **facade** (`CatalogFacade.reserveStock`, `CustomersFacade.findOrCreate`, `PromotionsFacade.redeem`) and may share the caller's transaction (`tx`). Side effects in other modules happen **asynchronously through domain events**.
5. Composition modules (`crm`) may depend on several modules; nothing depends on them.

## Events: transactional outbox → Kafka

A use case returns its domain events to the `UnitOfWork`, which writes them to `outbox_events` **in the same transaction** as the state change. The worker's `OutboxRelayService` claims rows with `FOR UPDATE SKIP LOCKED`, publishes them to Kafka, and marks them published. Delivery is at-least-once; every consumer is idempotent.

| Topic | Produced by | Consumed by (worker group) |
| --- | --- | --- |
| `ordering.events` | ordering (`order.placed`, `order.status_changed`) | `halm-notifications`, `halm-realtime` |
| `catalog.events` | catalog admin writes | `halm-realtime` |
| `meta.webhook.received` | Meta webhook controller | `halm-meta-ingest` |
| `messaging.reply.requested` | `SendMessage`, `ReplyToComment` | `halm-meta-sender` |
| `messaging.events` | ingest (`message.received`) | reserved for automations (AI agent, n8n) |
| `<topic>.dlq` | any consumer after 3 failed attempts | operator replay |

The api process needs no Kafka connection: it only writes outbox rows. If Kafka is down, nothing is lost — rows wait.

## Request contract

The NestJS api serves the **same `/api/*` paths and JSON shapes as v1** so the Next frontend, the n8n workflows and the provider webhooks kept working:

- success → `{ "success": true, "data": … }` (`EnvelopeInterceptor`); handlers that return `{ success, … }` pass through
- failure → `{ "success": false, "error": "…" }` with a fitting status (`HttpExceptionFilter`: domain errors, zod, Prisma P2002/P2025)
- money is a JSON number (NUMERIC → number in mappers), dates are ISO strings, fields are snake_case

## Frontend (web)

- Client components → RTK Query (`src/features/*/**.api.ts`) → `/api/*` (same origin; Caddy or the Next rewrite forwards to the api).
- Server Components → `src/features/store/store.server.ts` → `serverGet()` → `BACKEND_URL/api/*`. No database access in the web tier.
- `/admin/*` is guarded by `src/middleware.ts`, which validates the httpOnly `7alm_admin_token` cookie against `GET /api/auth/session`.
- Realtime: `useRealtime(table)` keeps its v1 signature, now backed by socket.io (`orders:changed`, `catalog:changed`, `crm:whatsapp`, `inbox:*`).

## Key decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Modular monolith | One team, one deploy; boundaries without network hops; modules already talk by events so one can be extracted later | Microservices |
| Prisma 7 with snake_case fields | Row shape = public contract → thin mappers; type-safe queries; migrations | TypeORM (decorators leak into domain) |
| Outbox, not "publish in the request" | No lost or phantom events; api works when Kafka is down | Direct Kafka produce |
| Webhook = verify + outbox + 200 | Meta disables webhooks that fail for an hour and expects 200 in 5 s | Graph calls inside the request |
| Redis for idempotency, cache, throttling, socket adapter | Meta and couriers retry; reads are hot; socket fan-out across replicas | DB-only dedupe |
| Atomic SQL for stock and coupon limits | No oversell / over-redeem under concurrency | Read-modify-write |
| Keep the v1 API contract | Frontend + n8n + webhooks unchanged during the move | New API shape |
| Graph API version in env (`META_GRAPH_VERSION`, default v27.0) | Meta ships versions several times a year | Hardcoded |
