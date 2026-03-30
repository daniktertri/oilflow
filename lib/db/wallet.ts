import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type LedgerKind =
  | "deposit"
  | "withdraw"
  | "withdraw_refund"
  | "lock_in"
  | "lock_settle";

export type LedgerRow = {
  id: string;
  kind: LedgerKind;
  amount: string;
  balance_after: string;
  ref_signature: string | null;
  created_at: string;
};

export type UserSolWalletRow = {
  pubkey: string;
  derivation_index: number;
};

/**
 * Ensure a zero balance row exists (idempotent).
 */
export async function ensureAccountBalanceRow(sql: Sql, userId: string) {
  await sql`
    INSERT INTO account_balances (user_id, usdc_available)
    VALUES (${userId}::uuid, 0)
    ON CONFLICT (user_id) DO NOTHING
  `;
}

export async function getSolWallet(
  sql: Sql,
  userId: string
): Promise<UserSolWalletRow | null> {
  const rows = (await sql`
    SELECT pubkey, derivation_index
    FROM user_sol_wallets
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `) as UserSolWalletRow[];
  return rows[0] ?? null;
}

export async function getUsdcAvailable(
  sql: Sql,
  userId: string
): Promise<string> {
  const rows = (await sql`
    SELECT usdc_available::text AS b
    FROM account_balances
    WHERE user_id = ${userId}::uuid
  `) as { b: string }[];
  if (!rows[0]) return "0";
  return rows[0].b;
}

export async function listRecentLedger(
  sql: Sql,
  userId: string,
  limit = 100
): Promise<LedgerRow[]> {
  return (await sql`
    SELECT
      id::text,
      kind,
      amount::text,
      balance_after::text,
      ref_signature,
      created_at::text
    FROM ledger_entries
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as LedgerRow[];
}

async function appendLedger(
  sql: Sql,
  userId: string,
  kind: LedgerKind,
  amount: number,
  balanceAfter: number,
  refSignature: string | null
) {
  await sql`
    INSERT INTO ledger_entries (
      user_id,
      kind,
      amount,
      balance_after,
      ref_signature
    )
    VALUES (
      ${userId}::uuid,
      ${kind},
      ${amount},
      ${balanceAfter},
      ${refSignature}
    )
  `;
}

export async function applyLockIn(
  sql: Sql,
  userId: string,
  amountUsd: number
): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: string }> {
  const rows = (await sql`
    UPDATE account_balances
    SET usdc_available = usdc_available - ${amountUsd}
    WHERE user_id = ${userId}::uuid AND usdc_available >= ${amountUsd}
    RETURNING usdc_available::float8 AS b
  `) as { b: number }[];
  const row = rows[0];
  if (!row) {
    return { ok: false, error: "Insufficient USDC balance." };
  }
  await appendLedger(
    sql,
    userId,
    "lock_in",
    amountUsd,
    row.b,
    null
  );
  return { ok: true, balanceAfter: row.b };
}

export async function applyLockSettle(
  sql: Sql,
  userId: string,
  principalUsd: number,
  sessionPnlUsd: number
): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: string }> {
  const total = principalUsd + sessionPnlUsd;
  const rows = (await sql`
    UPDATE account_balances
    SET usdc_available = usdc_available + ${total}
    WHERE user_id = ${userId}::uuid
    RETURNING usdc_available::float8 AS b
  `) as { b: number }[];
  const row = rows[0];
  if (!row) {
    return { ok: false, error: "No balance account." };
  }
  await appendLedger(
    sql,
    userId,
    "lock_settle",
    total,
    row.b,
    null
  );
  return { ok: true, balanceAfter: row.b };
}

/**
 * Reserve balance and create a pending withdrawal row. Returns request id or null if insufficient funds.
 */
export async function createWithdrawalRequest(
  sql: Sql,
  userId: string,
  amount: number,
  destinationPubkey: string
): Promise<
  | { ok: true; requestId: string; balanceAfter: number }
  | { ok: false; error: string }
> {
  const rows = (await sql`
    WITH u AS (
      UPDATE account_balances
      SET usdc_available = usdc_available - ${amount}
      WHERE user_id = ${userId}::uuid AND usdc_available >= ${amount}
      RETURNING usdc_available::float8 AS b
    ),
    ins AS (
      INSERT INTO withdrawal_requests (
        user_id,
        amount,
        destination_pubkey,
        status
      )
      SELECT
        ${userId}::uuid,
        ${amount},
        ${destinationPubkey},
        'pending'
      FROM u
      RETURNING id
    )
    SELECT ins.id::text, u.b AS bal FROM ins CROSS JOIN u
  `) as { id: string; bal: number }[];

  const row = rows[0];
  if (!row) {
    return { ok: false, error: "Insufficient USDC balance." };
  }

  await appendLedger(
    sql,
    userId,
    "withdraw",
    amount,
    row.bal,
    null
  );

  return {
    ok: true,
    requestId: row.id,
    balanceAfter: row.bal,
  };
}

export async function refundWithdrawal(
  sql: Sql,
  userId: string,
  amount: number,
  requestId: string
) {
  await sql`
    UPDATE account_balances
    SET usdc_available = usdc_available + ${amount}
    WHERE user_id = ${userId}::uuid
  `;
  const after = (await sql`
    SELECT usdc_available::float8 AS b FROM account_balances WHERE user_id = ${userId}::uuid
  `) as { b: number }[];
  const bal = after[0]?.b ?? amount;
  await appendLedger(
    sql,
    userId,
    "withdraw_refund",
    amount,
    bal,
    null
  );
  await sql`
    UPDATE withdrawal_requests
    SET
      status = 'failed',
      updated_at = now(),
      error = COALESCE(error, 'send_failed')
    WHERE id = ${requestId}::uuid AND user_id = ${userId}::uuid
  `;
}
