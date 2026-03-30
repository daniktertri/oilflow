import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type LedgerKind =
  | "deposit"
  | "withdraw"
  | "withdraw_refund"
  | "lock_in"
  | "lock_settle"
  | "lock_yield";

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

export async function appendLedger(
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

export type LiquidityLockRow = {
  id: string;
  principal_usd: string;
  accumulated_yield_usd: string;
  started_at: string;
  ends_at: string;
  status: string;
};

/**
 * Debit available USDC, lock_in ledger, insert active liquidity_locks row.
 * Multiple concurrent locks per user are allowed (different amounts/durations).
 */
export async function lockInWithSession(
  sql: Sql,
  userId: string,
  amountUsd: number,
  durationMs: number
): Promise<
  | {
      ok: true;
      balanceAfter: number;
      lock: {
        id: string;
        principalUsd: number;
        accumulatedYieldUsd: number;
        startedAt: string;
        endsAt: string;
      };
    }
  | { ok: false; error: string }
> {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return { ok: false, error: "Invalid lock duration." };
  }
  const rows = (await sql`
    WITH u AS (
      UPDATE account_balances ab
      SET usdc_available = ab.usdc_available - ${amountUsd}
      WHERE ab.user_id = ${userId}::uuid
        AND ab.usdc_available >= ${amountUsd}
      RETURNING ab.usdc_available::float8 AS b
    ),
    ins_ledger AS (
      INSERT INTO ledger_entries (
        user_id,
        kind,
        amount,
        balance_after,
        ref_signature
      )
      SELECT
        ${userId}::uuid,
        'lock_in',
        ${amountUsd},
        u.b,
        NULL
      FROM u
      RETURNING 1
    ),
    ins_lock AS (
      INSERT INTO liquidity_locks (
        user_id,
        principal_usd,
        started_at,
        ends_at,
        status
      )
      SELECT
        ${userId}::uuid,
        ${amountUsd},
        now(),
        now() + (${durationMs}::bigint * interval '1 millisecond'),
        'active'
      FROM u
      RETURNING
        id::text AS id,
        principal_usd::float8 AS principal_usd,
        accumulated_yield_usd::float8 AS accumulated_yield_usd,
        started_at::text AS started_at,
        ends_at::text AS ends_at
    )
    SELECT
      u.b AS balance_after,
      ins_lock.id,
      ins_lock.principal_usd,
      ins_lock.accumulated_yield_usd,
      ins_lock.started_at,
      ins_lock.ends_at
    FROM u
    CROSS JOIN ins_lock
  `) as {
    balance_after: number | null;
    id: string | null;
    principal_usd: number | null;
    accumulated_yield_usd: number | null;
    started_at: string | null;
    ends_at: string | null;
  }[];

  const row = rows[0];
  if (!row?.balance_after || row.id == null) {
    return {
      ok: false,
      error: "Insufficient USDC balance.",
    };
  }
  return {
    ok: true,
    balanceAfter: row.balance_after,
    lock: {
      id: row.id,
      principalUsd: row.principal_usd!,
      accumulatedYieldUsd: row.accumulated_yield_usd ?? 0,
      startedAt: row.started_at!,
      endsAt: row.ends_at!,
    },
  };
}

export async function getActiveLiquidityLocks(
  sql: Sql,
  userId: string
): Promise<LiquidityLockRow[]> {
  return (await sql`
    SELECT
      id::text AS id,
      principal_usd::text AS principal_usd,
      accumulated_yield_usd::text AS accumulated_yield_usd,
      started_at::text AS started_at,
      ends_at::text AS ends_at,
      status
    FROM liquidity_locks
    WHERE user_id = ${userId}::uuid AND status = 'active'
    ORDER BY ends_at ASC
  `) as LiquidityLockRow[];
}

/**
 * Return principal to available balance; hourly yield was already credited to
 * `usdc_available` via lock_yield (withdrawable immediately).
 * Only when this lock is active and ends_at <= now().
 */
export async function settleLockById(
  sql: Sql,
  userId: string,
  lockId: string
): Promise<
  { ok: true; balanceAfter: number; principalUsd: number } | { ok: false; error: string }
> {
  const rows = (await sql`
    WITH l AS (
      SELECT id, user_id, principal_usd::float8 AS principal
      FROM liquidity_locks
      WHERE
        user_id = ${userId}::uuid
        AND id = ${lockId}::uuid
        AND status = 'active'
        AND ends_at <= now()
      LIMIT 1
    ),
    u AS (
      UPDATE account_balances ab
      SET usdc_available = ab.usdc_available + l.principal
      FROM l
      WHERE ab.user_id = l.user_id
      RETURNING ab.usdc_available::float8 AS b
    ),
    led AS (
      INSERT INTO ledger_entries (
        user_id,
        kind,
        amount,
        balance_after,
        ref_signature
      )
      SELECT
        ${userId}::uuid,
        'lock_settle',
        l.principal,
        u.b,
        l.id::text
      FROM l
      CROSS JOIN u
      RETURNING 1
    ),
    upd AS (
      UPDATE liquidity_locks ll
      SET
        status = 'settled',
        updated_at = now()
      FROM l
      WHERE ll.id = l.id
      RETURNING 1
    )
    SELECT u.b AS balance_after, l.principal AS principal_usd
    FROM l
    CROSS JOIN u
  `) as { balance_after: number; principal_usd: number }[];

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      error: "No matching lock to settle, not expired yet, or already settled.",
    };
  }
  return {
    ok: true,
    balanceAfter: row.balance_after,
    principalUsd: row.principal_usd,
  };
}

/**
 * Settle every expired active lock for this user (principal back to available balance).
 */
export async function settleAllExpiredLocksForUser(
  sql: Sql,
  userId: string
): Promise<
  | {
      ok: true;
      balanceAfter: number;
      settledCount: number;
      totalPrincipalSettled: number;
    }
  | { ok: false; error: string }
> {
  const idRows = (await sql`
    SELECT id::text AS id
    FROM liquidity_locks
    WHERE
      user_id = ${userId}::uuid
      AND status = 'active'
      AND ends_at <= now()
    ORDER BY ends_at ASC
  `) as { id: string }[];

  if (idRows.length === 0) {
    const bal = await getUsdcAvailable(sql, userId);
    return {
      ok: true,
      balanceAfter: Number(bal),
      settledCount: 0,
      totalPrincipalSettled: 0,
    };
  }

  let totalPrincipal = 0;
  let lastBalance = 0;
  for (const { id } of idRows) {
    const r = await settleLockById(sql, userId, id);
    if (!r.ok) {
      return { ok: false, error: r.error };
    }
    totalPrincipal += r.principalUsd;
    lastBalance = r.balanceAfter;
  }

  return {
    ok: true,
    balanceAfter: lastBalance,
    settledCount: idRows.length,
    totalPrincipalSettled: totalPrincipal,
  };
}

export type LockSyntheticTradeRow = {
  id: string;
  liquidity_source: string;
  hour_bucket: string;
  pnl_usd: string;
  notional_usd: string;
  side: string;
  fee_usd: string;
  created_at: string;
};

export async function listLockSyntheticTrades(
  sql: Sql,
  userId: string,
  limit = 200
): Promise<LockSyntheticTradeRow[]> {
  return (await sql`
    SELECT
      id::text AS id,
      liquidity_source,
      hour_bucket::text AS hour_bucket,
      pnl_usd::text AS pnl_usd,
      notional_usd::text AS notional_usd,
      side,
      fee_usd::text AS fee_usd,
      created_at::text AS created_at
    FROM lock_synthetic_trades
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as LockSyntheticTradeRow[];
}

export type DailyReturnRow = {
  day: string;
  pnl_usd: string;
};

export async function listDailyReturns(
  sql: Sql,
  userId: string,
  limit = 365
): Promise<DailyReturnRow[]> {
  return (await sql`
    SELECT day::text AS day, pnl_usd::text AS pnl_usd
    FROM daily_returns
    WHERE user_id = ${userId}::uuid
    ORDER BY day ASC
    LIMIT ${limit}
  `) as DailyReturnRow[];
}

export type ActiveLockForApi = {
  id: string;
  principalUsd: number;
  accumulatedYieldUsd: number;
  startedAt: string;
  endsAt: string;
};

export async function getActiveLocksForApi(
  sql: Sql,
  userId: string
): Promise<ActiveLockForApi[]> {
  const rows = await getActiveLiquidityLocks(sql, userId);
  return rows.map((row) => ({
    id: row.id,
    principalUsd: Number(row.principal_usd),
    accumulatedYieldUsd: Number(row.accumulated_yield_usd),
    startedAt: row.started_at,
    endsAt: row.ends_at,
  }));
}

export type LockYieldCandidate = {
  id: string;
  user_id: string;
  principal_usd: number;
};

export async function listActiveLocksForYield(
  sql: Sql
): Promise<LockYieldCandidate[]> {
  return (await sql`
    SELECT
      id::text AS id,
      user_id::text AS user_id,
      principal_usd::float8 AS principal_usd
    FROM liquidity_locks
    WHERE status = 'active' AND ends_at > now()
  `) as LockYieldCandidate[];
}

export type HourlyYieldPacket = {
  lockId: string;
  userId: string;
  yieldUsd: number;
  pnlUser: number;
  pnlPlatform: number;
  notionalUser: number;
  notionalPlatform: number;
  /** UTC hour start, e.g. from date_trunc('hour', now() AT TIME ZONE 'UTC') */
  hourBucket: string;
  /** UTC calendar day YYYY-MM-DD */
  dayUtc: string;
  sideUser: "long" | "short";
  sidePlatform: "long" | "short";
};

/**
 * Idempotent per (lock_id, hour_bucket, liquidity_source): credits yield, ledger, daily_returns, two trades.
 */
export async function applyHourlyYieldPacket(
  sql: Sql,
  p: HourlyYieldPacket
): Promise<{ applied: boolean; balanceAfter?: number }> {
  const rows = (await sql`
    WITH ex AS (
      SELECT 1 AS x
      FROM lock_synthetic_trades
      WHERE
        lock_id = ${p.lockId}::uuid
        AND hour_bucket = ${p.hourBucket}::timestamptz
        AND liquidity_source = 'user_liquidity'
      LIMIT 1
    ),
    bal AS (
      UPDATE account_balances ab
      SET usdc_available = ab.usdc_available + ${p.yieldUsd}
      WHERE ab.user_id = ${p.userId}::uuid
        AND NOT EXISTS (SELECT 1 FROM ex)
      RETURNING ab.usdc_available::float8 AS b
    ),
    led AS (
      INSERT INTO ledger_entries (
        user_id,
        kind,
        amount,
        balance_after,
        ref_signature
      )
      SELECT
        ${p.userId}::uuid,
        'lock_yield',
        ${p.yieldUsd},
        bal.b,
        ${p.lockId}::text
      FROM bal
      RETURNING 1
    ),
    lu AS (
      UPDATE liquidity_locks ll
      SET
        accumulated_yield_usd = ll.accumulated_yield_usd + ${p.yieldUsd},
        updated_at = now()
      WHERE ll.id = ${p.lockId}::uuid
        AND EXISTS (SELECT 1 FROM bal)
      RETURNING 1
    ),
    dr AS (
      INSERT INTO daily_returns (user_id, day, pnl_usd, updated_at)
      SELECT
        ${p.userId}::uuid,
        ${p.dayUtc}::date,
        ${p.yieldUsd},
        now()
      FROM bal
      ON CONFLICT (user_id, day) DO UPDATE SET
        pnl_usd = daily_returns.pnl_usd + EXCLUDED.pnl_usd,
        updated_at = now()
      RETURNING 1
    ),
    t1 AS (
      INSERT INTO lock_synthetic_trades (
        lock_id,
        user_id,
        liquidity_source,
        hour_bucket,
        pnl_usd,
        notional_usd,
        side,
        fee_usd
      )
      SELECT
        ${p.lockId}::uuid,
        ${p.userId}::uuid,
        'user_liquidity',
        ${p.hourBucket}::timestamptz,
        ${p.pnlUser},
        ${p.notionalUser},
        ${p.sideUser},
        0
      FROM bal
      RETURNING id
    ),
    t2 AS (
      INSERT INTO lock_synthetic_trades (
        lock_id,
        user_id,
        liquidity_source,
        hour_bucket,
        pnl_usd,
        notional_usd,
        side,
        fee_usd
      )
      SELECT
        ${p.lockId}::uuid,
        ${p.userId}::uuid,
        'platform_liquidity',
        ${p.hourBucket}::timestamptz,
        ${p.pnlPlatform},
        ${p.notionalPlatform},
        ${p.sidePlatform},
        0
      FROM bal
      RETURNING id
    )
    SELECT bal.b AS balance_after
    FROM bal
  `) as { balance_after: number }[];

  const row = rows[0];
  if (!row) {
    return { applied: false };
  }
  return { applied: true, balanceAfter: row.balance_after };
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
