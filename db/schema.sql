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

-- Solana custodial USDC (SPL): per-user deposit pubkey, server balance, ledger, worker state.

CREATE TABLE IF NOT EXISTS user_sol_wallets (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  pubkey text NOT NULL UNIQUE,
  derivation_index integer NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_balances (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  usdc_available numeric(20, 6) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (
    kind IN (
      'deposit',
      'withdraw',
      'withdraw_refund',
      'lock_in',
      'lock_settle',
      'lock_yield'
    )
  ),
  amount numeric(20, 6) NOT NULL,
  balance_after numeric(20, 6) NOT NULL,
  ref_signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_user_id_created_at_idx
  ON ledger_entries (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS processed_deposit_signatures (
  signature text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount numeric(20, 6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount numeric(20, 6) NOT NULL,
  destination_pubkey text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  tx_signature text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx
  ON withdrawal_requests (status)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS custody_state (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Liquidity locks (server source of truth), hourly yield credited while active.

CREATE TABLE IF NOT EXISTS liquidity_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  principal_usd numeric(20, 6) NOT NULL,
  accumulated_yield_usd numeric(20, 6) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS liquidity_locks_status_ends_at_idx
  ON liquidity_locks (status, ends_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lock_synthetic_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id uuid NOT NULL REFERENCES liquidity_locks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  liquidity_source text NOT NULL CHECK (
    liquidity_source IN ('user_liquidity', 'platform_liquidity')
  ),
  hour_bucket timestamptz NOT NULL,
  pnl_usd numeric(20, 6) NOT NULL,
  notional_usd numeric(20, 6) NOT NULL,
  side text NOT NULL DEFAULT 'long' CHECK (side IN ('long', 'short')),
  fee_usd numeric(20, 6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_id, hour_bucket, liquidity_source)
);

CREATE INDEX IF NOT EXISTS lock_synthetic_trades_user_created_idx
  ON lock_synthetic_trades (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_returns (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day date NOT NULL,
  pnl_usd numeric(20, 6) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS daily_returns_user_day_idx
  ON daily_returns (user_id, day DESC);

-- Telegram channel posts ingested via Bot API webhook (channel_post / edited_channel_post).
-- Dedup: one row per (channel_chat_id, message_id).

CREATE TABLE IF NOT EXISTS telegram_channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_chat_id text NOT NULL,
  channel_username text,
  message_id bigint NOT NULL,
  text_plain text NOT NULL,
  posted_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_chat_id, message_id)
);

CREATE INDEX IF NOT EXISTS telegram_channel_posts_posted_at_idx
  ON telegram_channel_posts (posted_at DESC);

-- Allow multiple concurrent locks per user (drops legacy one-lock-per-user index if present)
DROP INDEX IF EXISTS liquidity_locks_one_active_per_user;

-- Migrate existing DBs created before lock_yield was added
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_kind_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_kind_check CHECK (
  kind IN (
    'deposit',
    'withdraw',
    'withdraw_refund',
    'lock_in',
    'lock_settle',
    'lock_yield'
  )
);
