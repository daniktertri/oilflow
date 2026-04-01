-- OilFlow Terminal — Oil Market Intelligence
-- Run: npm run db:init

-- ─── Users (Telegram auth) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  username text,
  first_name text NOT NULL,
  last_name text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users (telegram_id);

-- ─── Oil benchmarks (reference data) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS oil_benchmarks (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'USD',
  unit text NOT NULL DEFAULT 'barrel',
  color text NOT NULL DEFAULT '#ffc107',
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO oil_benchmarks (key, name, description, color, sort_order) VALUES
  ('WTI',   'WTI Crude',        'West Texas Intermediate (Cushing, OK)',          '#ffc107', 1),
  ('BRENT', 'Brent Crude',      'North Sea Brent (ICE)',                          '#00e5ff', 2),
  ('OPEC',  'OPEC Basket',      'OPEC Reference Basket',                         '#ff9800', 3),
  ('DUBAI', 'Dubai/Oman',       'Dubai Mercantile Exchange',                      '#e040fb', 4),
  ('URALS', 'Urals',            'Russian export blend (NW Europe)',               '#ff5252', 5),
  ('WCS',   'Western Canadian', 'Western Canadian Select (Hardisty)',             '#66bb6a', 6),
  ('LLS',   'Louisiana Light',  'Light Louisiana Sweet',                          '#42a5f5', 7)
ON CONFLICT (key) DO NOTHING;

-- ─── Oil prices (historical OHLCV) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS oil_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  benchmark text NOT NULL REFERENCES oil_benchmarks (key),
  price_date date NOT NULL,
  open numeric(12,4),
  high numeric(12,4),
  low numeric(12,4),
  close numeric(12,4) NOT NULL,
  volume numeric(18,2),
  source text NOT NULL DEFAULT 'eia',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benchmark, price_date, source)
);

CREATE INDEX IF NOT EXISTS oil_prices_benchmark_date_idx
  ON oil_prices (benchmark, price_date DESC);

-- ─── EIA inventory reports ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eia_inventories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_date date NOT NULL,
  product text NOT NULL,
  region text NOT NULL DEFAULT 'US',
  value_mbbls numeric(14,3) NOT NULL,
  change_mbbls numeric(14,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_date, product, region)
);

CREATE INDEX IF NOT EXISTS eia_inventories_date_idx
  ON eia_inventories (report_date DESC);

-- ─── News channels (configurable — Telegram sources) ──────────────────

CREATE TABLE IF NOT EXISTS news_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO news_channels (username, display_name, category) VALUES
  ('BRICSNews', 'BRICS News', 'geopolitics')
ON CONFLICT (username) DO NOTHING;

-- ─── Telegram channel posts (enhanced with AI fields) ───────────────────

CREATE TABLE IF NOT EXISTS telegram_channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_chat_id text NOT NULL,
  channel_username text,
  message_id bigint NOT NULL,
  text_plain text NOT NULL,
  posted_at timestamptz NOT NULL,
  ai_summary text,
  sentiment_score numeric(4,3),
  category text,
  direction text,
  impact_level text,
  price_impact text,
  confidence text,
  affected_benchmarks text,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_chat_id, message_id)
);

-- Migrate existing: add new columns if missing
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS sentiment_score numeric(4,3);
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS impact_level text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS price_impact text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS confidence text;
ALTER TABLE telegram_channel_posts ADD COLUMN IF NOT EXISTS affected_benchmarks text;

CREATE INDEX IF NOT EXISTS telegram_channel_posts_posted_at_idx
  ON telegram_channel_posts (posted_at DESC);

CREATE INDEX IF NOT EXISTS telegram_channel_posts_category_idx
  ON telegram_channel_posts (category)
  WHERE category IS NOT NULL;

-- ─── News articles (RSS / external sources) ──────────────────────────────

CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_name text NOT NULL,
  title text NOT NULL,
  body text,
  url text NOT NULL UNIQUE,
  published_at timestamptz NOT NULL,
  ai_summary text,
  direction text,
  impact_level text,
  price_impact text,
  confidence text,
  affected_benchmarks text,
  category text,
  sentiment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_idx
  ON news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_source_idx
  ON news_articles (source);

-- ─── AI market briefs (daily) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_market_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date date NOT NULL UNIQUE,
  summary text NOT NULL,
  outlook text,
  key_drivers text,
  sentiment text CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  direction text,
  conviction text,
  risks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate existing briefs table
ALTER TABLE ai_market_briefs ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE ai_market_briefs ADD COLUMN IF NOT EXISTS conviction text;
ALTER TABLE ai_market_briefs ADD COLUMN IF NOT EXISTS risks text;

CREATE INDEX IF NOT EXISTS ai_market_briefs_date_idx
  ON ai_market_briefs (brief_date DESC);

-- ─── User preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  watchlist text[] NOT NULL DEFAULT ARRAY['WTI', 'BRENT'],
  default_chart_range text NOT NULL DEFAULT '1M',
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Sync state ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_state (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Drop deprecated tables ─────────────────────────────────────────────

DROP TABLE IF EXISTS user_alerts CASCADE;
DROP TABLE IF EXISTS lock_synthetic_trades CASCADE;
DROP TABLE IF EXISTS daily_returns CASCADE;
DROP TABLE IF EXISTS liquidity_locks CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS processed_deposit_signatures CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS account_balances CASCADE;
DROP TABLE IF EXISTS user_sol_wallets CASCADE;
DROP TABLE IF EXISTS custody_state CASCADE;
