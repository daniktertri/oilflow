import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  ensureAccountBalanceRow,
  getActiveLockForApi,
  getSolWallet,
  getUsdcAvailable,
  listRecentLedger,
} from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  await ensureAccountBalanceRow(sql, userId);
  const wallet = await getSolWallet(sql, userId);
  const balanceStr = await getUsdcAvailable(sql, userId);
  const ledger = await listRecentLedger(sql, userId, 100);
  const activeLock = await getActiveLockForApi(sql, userId);

  return NextResponse.json({
    depositPubkey: wallet?.pubkey ?? null,
    usdcAvailable: Number(balanceStr),
    activeLock,
    ledger: ledger.map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: Number(row.amount),
      balanceAfter: Number(row.balance_after),
      refSignature: row.ref_signature,
      createdAt: row.created_at,
    })),
  });
}
