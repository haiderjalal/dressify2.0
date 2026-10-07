-- Geo radius search ("tailors within 5 km") and fast text search.
-- earthdistance + cube are standard Postgres contrib extensions, available on
-- Neon, Supabase, AWS RDS/Aurora, Google Cloud SQL and Azure.
CREATE EXTENSION IF NOT EXISTS cube;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS earthdistance;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- GiST index makes radius queries O(log n) instead of scanning every tailor.
CREATE INDEX IF NOT EXISTS tailor_profiles_earth_idx ON tailor_profiles USING gist (ll_to_earth(lat, lng)) WHERE status = 'approved';--> statement-breakpoint
-- Trigram index for "search by shop name / area" with ILIKE '%term%'.
CREATE INDEX IF NOT EXISTS tailor_profiles_search_trgm_idx ON tailor_profiles USING gin ((shop_name || ' ' || coalesce(area, '') || ' ' || city) gin_trgm_ops);--> statement-breakpoint
-- Unread notification counter is the hottest query in the app.
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;--> statement-breakpoint
-- Guard rails enforced by the database itself.
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE tailor_slot_usage ADD CONSTRAINT slot_usage_non_negative CHECK (used >= 0);--> statement-breakpoint
ALTER TABLE fabrics ADD CONSTRAINT fabrics_stock_non_negative CHECK (stock_meters >= 0);--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0);
