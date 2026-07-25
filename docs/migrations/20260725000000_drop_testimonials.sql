-- 2026-07-25 — Drop the hand-curated `testimonials` table.
--
-- The home page's testimonials section was invented social proof: rows were authored
-- by hand in the admin dashboard with no link to any real purchase. It is replaced by
-- a carousel of admin-approved 4★/5★ rows from `product_reviews`, which are gated
-- behind a delivered order and a signed review token.
-- See docs/specs/reviews-showcase.md.
--
-- This table was never created by a migration (it was made in the Supabase dashboard),
-- so there is no matching "up" file. The 6 rows it held were demo seed data — they all
-- shared one created_at — and are archived at
--   docs/migrations/backup_testimonials_20260725.json
--
-- Run this ONLY after the testimonials code has been removed; while
-- src/features/testimonials/testimonials.repository.ts still exists, the admin
-- dashboard and store home page both query this table.

DROP TABLE IF EXISTS public.testimonials;
