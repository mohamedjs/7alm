-- Workstream 1: Product Reviews (verified buyers, admin-moderated)
-- Idempotent — safe to re-run. Apply via Supabase MCP after review; not applied by this commit.

CREATE TABLE IF NOT EXISTS product_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,   -- the delivered order that authorized it
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        text,
  body         text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)   -- one review per customer per product
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status
  ON product_reviews (product_id, status);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;  -- service-role only
