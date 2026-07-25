-- Order Lifecycle Redesign (Task 1) — §1
-- Records, per order, whether the WhatsApp confirmation step was required
-- (admin's "Approve & ask" vs "Approve & ship now" choice at approval time).
-- Defaults to true so existing/legacy orders keep behaving exactly as
-- before (double-opt-in via WhatsApp).
--
-- NOT auto-applied — run manually against the target Supabase project.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS requires_confirmation boolean NOT NULL DEFAULT true;
