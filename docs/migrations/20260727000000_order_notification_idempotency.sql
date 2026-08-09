-- Order notification idempotency guard.
-- `notifyN8n` (orders.service.ts) fires on every `changeOrderStatus` call;
-- two concurrent requests reaching the same transition (e.g. a shipping
-- webhook retry racing an admin action) could each pass the state-machine
-- guard and notify twice. This records the last status actually notified
-- so `notifyN8n` can skip a repeat notification for the same status.
-- Applied via Supabase MCP on 2026-07-27.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_notified_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;
