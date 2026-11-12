# 7alm backend (NestJS modular monolith)

Architecture: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) · Ops: [`../docs/INFRASTRUCTURE.md`](../docs/INFRASTRUCTURE.md) · Meta: [`../docs/META_INTEGRATION.md`](../docs/META_INTEGRATION.md)

```bash
docker compose -f ../docker-compose.yml up -d   # postgres, redis, kafka
cp .env.example .env
npm ci && npx prisma migrate deploy && npm run seed:dev
npm run start:dev          # api on :4000
npm run start:worker:dev   # worker (outbox relay + consumers)
```

| Command | What |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit tests (domain rules, Meta parser, signatures) + architecture rules |
| `node --env-file=.env test/smoke.mjs` | e2e: login, checkout, coupon, approve, courier webhooks → delivered |
| `node --env-file=.env test/meta-smoke.mjs` | e2e: signed Meta webhooks → Kafka → inbox → replies |
| `node --env-file=.env test/demo-activity.mjs` | fills a dev stack with demo orders, chats and comments |
| `npx prisma migrate dev --name <x>` | new migration after editing `prisma/schema.prisma` |

Layout: `src/shared` (kernel), `src/modules/<module>/{domain,application,infrastructure,presentation}`, `src/main.ts` (api), `src/worker.ts` (worker).
