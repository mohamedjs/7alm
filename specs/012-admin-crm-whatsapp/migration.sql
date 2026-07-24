-- CRM + WhatsApp Migration
-- Run this in Supabase SQL Editor

-- 1. Add 'notes' column to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 2. Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  admin_id UUID DEFAULT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  media_url TEXT DEFAULT NULL,
  media_type TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  evolution_message_id TEXT DEFAULT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer
  ON whatsapp_messages (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_evolution
  ON whatsapp_messages (evolution_message_id)
  WHERE evolution_message_id IS NOT NULL;

-- 4. Create customer_stats view
CREATE OR REPLACE VIEW customer_stats AS
SELECT
  c.id AS customer_id,
  c.full_name,
  c.phone,
  c.email,
  c.notes,
  c.created_at,
  COALESCE(COUNT(o.id), 0)::int AS total_orders,
  COALESCE(SUM(o.total_price), 0)::numeric AS total_spent,
  COALESCE(
    CASE WHEN COUNT(o.id) > 0
      THEN ROUND(SUM(o.total_price) / COUNT(o.id), 2)
      ELSE 0
    END, 0
  )::numeric AS avg_order_value,
  MIN(o.created_at) AS first_order_date,
  MAX(o.created_at) AS last_order_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name, c.phone, c.email, c.notes, c.created_at;

-- 5. Enable Supabase Realtime on whatsapp_messages
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
