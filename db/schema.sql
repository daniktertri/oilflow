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
      'lock_settle'
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
