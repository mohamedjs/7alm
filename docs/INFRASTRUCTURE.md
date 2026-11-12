# 7alm v2 — Infrastructure & operations

## Services (`docker-compose.prod.yml`)

| Service | Image | Role | Exposed |
| --- | --- | --- | --- |
| `caddy` | caddy:2.10 | TLS (Let's Encrypt), routes `/api /socket.io /uploads /health` → api, rest → web | 80, 443 |
| `web` | `7alm-web` (Next standalone) | Storefront, landing, admin | internal :3000 |
| `api` | `7alm-backend` `node dist/main.js` | REST, webhooks, socket.io, uploads | internal :4000 |
| `worker` | `7alm-backend` `node dist/worker.js` | Outbox relay + Kafka consumers | — |
| `migrate` | `7alm-backend` `prisma migrate deploy` | Runs once before api/worker | — |
| `postgres` | postgres:17-alpine | Primary database (`pgdata`) | — |
| `redis` | redis:7-alpine, AOF, `noeviction` | Cache, idempotency, throttling, socket adapter | — |
| `kafka` | apache/kafka:3.9.1 (KRaft, no ZooKeeper) | Event bus, 7-day retention | — |
| `backup` | postgres:17-alpine + `deploy/backup.sh` | Daily `pg_dump`, 14-day retention (`backups` volume) | — |

Start order is enforced with healthchecks: postgres → migrate → api/worker (+ redis, kafka) → web → caddy.

## First deploy

```bash
# on the VPS (Docker + compose v2), DNS A record → server IP
git clone https://github.com/mohamedjs/7alm && cd 7alm
cp .env.production.example .env.production && $EDITOR .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# optional demo catalog (zones are needed for checkout):
docker compose -f docker-compose.prod.yml --env-file .env.production exec api node dist/scripts/seed.js
```

The first admin is created from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` when the `admins` table is empty.

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
Migrations run automatically (`migrate`). Or tag `vX.Y.Z` to have `release.yml` push images to GHCR and set `BACKEND_IMAGE` / `WEB_IMAGE`.

## Local development

```bash
docker compose up -d                       # postgres :5433, redis :6380, kafka :9094
cd backend && cp .env.example .env         # then:
npx prisma migrate deploy && npm run seed:dev
npm run start:dev                          # api :4000
npm run start:worker:dev                   # worker
cd .. && BACKEND_URL=http://localhost:4000 NEXT_PUBLIC_API_WS_URL=http://localhost:4000 npx next dev -p 3001
```

## Health & logs

- `GET /health` — liveness; `GET /health/ready` — postgres + redis.
- JSON logs (pino) with a request id; secrets/cookies/signatures are redacted.
- `docker compose -f docker-compose.prod.yml logs -f api worker`

## Backups & restore

```bash
docker compose -f docker-compose.prod.yml exec backup ls -lh /backups
gunzip -c /path/halm-YYYY-MM-DD-HHMM.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```
Copy `/backups` off the server (e.g. `rclone` to object storage) — a backup on the same disk is not a backup.

## Dead letters

A message that fails 3 times lands on `<topic>.dlq` with a `reason` header:
```bash
docker compose -f docker-compose.prod.yml exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic messaging.reply.requested.dlq --from-beginning --property print.headers=true
```

## Security notes

- Only Caddy is public. Postgres, Redis and Kafka have no published ports.
- Webhooks are authenticated: Meta (HMAC), couriers (`SHIPPING_WEBHOOK_SECRET`), n8n (`N8N_WEBHOOK_SECRET`, `x-n8n-access-token`), OpenRouter (`X-OpenRouter-Signature`).
- Rate limits: login 10/min, checkout 8/min, reviews 5/min, global 300/min per IP.
- OAuth tokens are AES-256-GCM encrypted at rest; admin passwords are argon2id.
