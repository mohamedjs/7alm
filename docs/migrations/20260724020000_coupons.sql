-- Workstream 3: Coupons / Discount Codes
-- Idempotent — safe to re-run. Apply via Supabase MCP after review; not applied by this commit.

CREATE TABLE IF NOT EXISTS coupons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,               -- store uppercased; match case-insensitively
  type               text NOT NULL CHECK (type IN ('percentage','fixed','free_shipping')),
  value              numeric NOT NULL DEFAULT 0,          -- percent (0-100) or EGP amount; 0 for free_shipping
  min_order_total    numeric NOT NULL DEFAULT 0,          -- minimum subtotal to qualify
  max_discount       numeric,                             -- optional cap for percentage
  first_order_only   boolean NOT NULL DEFAULT false,
  per_customer_limit integer,                             -- max uses per customer (null = unlimited)
  usage_limit        integer,                             -- global max uses (null = unlimited)
  used_count         integer NOT NULL DEFAULT 0,
  starts_at          timestamptz,
  expires_at         timestamptz,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;  -- service-role only

-- Track redemptions for per-customer/first-order enforcement.
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_customer
  ON coupon_redemptions (coupon_id, customer_id);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;  -- service-role only

-- Order-column additions for coupon integration.
-- total_price stays the final charged amount; subtotal = items pre-discount;
-- shipping unchanged unless the coupon is free_shipping.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal        numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code     text;
