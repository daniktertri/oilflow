import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createWithdrawalRequest } from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

function isValidSolanaAddress(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  let body: { amount?: unknown; destinationPubkey?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string"
        ? Number(body.amount)
        : NaN;
  const destinationPubkey =
    typeof body.destinationPubkey === "string"
      ? body.destinationPubkey.trim()
      : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Enter a positive USDC amount." },
      { status: 400 }
    );
  }
  if (amount > 1_000_000) {
    return NextResponse.json(
      { error: "Amount exceeds maximum." },
      { status: 400 }
    );
  }
  if (!destinationPubkey || !isValidSolanaAddress(destinationPubkey)) {
    return NextResponse.json(
      { error: "Invalid Solana destination address." },
      { status: 400 }
    );
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  const result = await createWithdrawalRequest(
    sql,
    userId,
    amount,
    destinationPubkey
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    requestId: result.requestId,
    balanceAfter: result.balanceAfter,
  });
}
