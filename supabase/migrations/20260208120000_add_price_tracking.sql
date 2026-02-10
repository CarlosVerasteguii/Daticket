-- ============================================================
-- Migration: Price Tracking for Smart Shopping
-- Tables: tracked_products, price_snapshots, price_alerts
-- Trigger: auto-track receipt_items → tracked_products
-- ============================================================

-- 1. tracked_products - Unique products to monitor per user
CREATE TABLE IF NOT EXISTS tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avg_purchase_price NUMERIC NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  heb_product_id TEXT,
  heb_product_name TEXT,
  heb_ean TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'matched', 'not_found', 'ambiguous')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);

CREATE INDEX idx_tracked_products_user_active ON tracked_products(user_id, is_active);
CREATE INDEX idx_tracked_products_scrape_queue ON tracked_products(is_active, match_status, last_scraped_at NULLS FIRST);

-- 2. price_snapshots - Daily price captures from HEB
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  heb_price NUMERIC NOT NULL,
  heb_list_price NUMERIC,
  is_promotion BOOLEAN NOT NULL DEFAULT false,
  promotion_text TEXT,
  scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracked_product_id, scrape_date)
);

CREATE INDEX idx_price_snapshots_product_date ON price_snapshots(tracked_product_id, scrape_date DESC);
CREATE INDEX idx_price_snapshots_user ON price_snapshots(user_id);

-- 3. price_alerts - Savings opportunities
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES price_snapshots(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL
    CHECK (alert_type IN ('price_drop', 'promotion', 'new_low')),
  heb_price NUMERIC NOT NULL,
  user_avg_price NUMERIC NOT NULL,
  savings_percent NUMERIC NOT NULL,
  savings_amount NUMERIC NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_alerts_user_unread ON price_alerts(user_id, is_read, is_dismissed);
CREATE INDEX idx_price_alerts_product ON price_alerts(tracked_product_id);

-- ============================================================
-- 4. Trigger: Auto-track receipt_items → tracked_products
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auto_track_receipt_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_receipt_date TIMESTAMPTZ;
BEGIN
  -- Normalize name: lowercase, trim, collapse spaces
  v_normalized := lower(trim(regexp_replace(NEW.name, '\s+', ' ', 'g')));

  -- Skip empty names
  IF v_normalized = '' OR v_normalized IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get purchase date from the parent receipt
  SELECT purchase_date INTO v_receipt_date
  FROM receipts
  WHERE id = NEW.receipt_id;

  -- Upsert into tracked_products with running average calculation
  INSERT INTO tracked_products (
    user_id,
    normalized_name,
    display_name,
    avg_purchase_price,
    purchase_count,
    last_purchase_date
  )
  VALUES (
    NEW.user_id,
    v_normalized,
    NEW.name,
    NEW.unit_price,
    1,
    COALESCE(v_receipt_date, now())
  )
  ON CONFLICT (user_id, normalized_name) DO UPDATE SET
    -- Running average: ((old_avg * old_count) + new_price) / (old_count + 1)
    avg_purchase_price = (
      (tracked_products.avg_purchase_price * tracked_products.purchase_count) + EXCLUDED.avg_purchase_price
    ) / (tracked_products.purchase_count + 1),
    purchase_count = tracked_products.purchase_count + 1,
    last_purchase_date = GREATEST(tracked_products.last_purchase_date, EXCLUDED.last_purchase_date),
    display_name = EXCLUDED.display_name,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_track_receipt_items
  AFTER INSERT ON receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_track_receipt_item();

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE tracked_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- tracked_products
CREATE POLICY "Users can view own tracked_products"
  ON tracked_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked_products"
  ON tracked_products FOR UPDATE
  USING (auth.uid() = user_id);

-- price_snapshots (read-only for users; Edge Function writes with service role)
CREATE POLICY "Users can view own price_snapshots"
  ON price_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- price_alerts
CREATE POLICY "Users can view own price_alerts"
  ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own price_alerts"
  ON price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. Backfill: Populate tracked_products from existing receipt_items
-- ============================================================

INSERT INTO tracked_products (user_id, normalized_name, display_name, avg_purchase_price, purchase_count, last_purchase_date)
SELECT
  ri.user_id,
  lower(trim(regexp_replace(ri.name, '\s+', ' ', 'g'))),
  ri.name,
  AVG(ri.unit_price),
  COUNT(*)::INTEGER,
  MAX(COALESCE(r.purchase_date, ri.created_at))
FROM receipt_items ri
JOIN receipts r ON r.id = ri.receipt_id
WHERE ri.name IS NOT NULL AND trim(ri.name) <> ''
GROUP BY ri.user_id, lower(trim(regexp_replace(ri.name, '\s+', ' ', 'g'))), ri.name
ON CONFLICT (user_id, normalized_name) DO NOTHING;
