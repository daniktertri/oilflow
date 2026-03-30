import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyLockSettle } from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  let body: { principalUsd?: unknown; sessionPnlUsd?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const principalUsd =
    typeof body.principalUsd === "number"
      ? body.principalUsd
      : typeof body.principalUsd === "string"
        ? Number(body.principalUsd)
        : NaN;
  const sessionPnlUsd =
    typeof body.sessionPnlUsd === "number"
      ? body.sessionPnlUsd
      : typeof body.sessionPnlUsd === "string"
        ? Number(body.sessionPnlUsd)
        : NaN;

  if (!Number.isFinite(principalUsd) || !Number.isFinite(sessionPnlUsd)) {
    return NextResponse.json(
      { error: "Invalid principal or session PnL." },
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

  const result = await applyLockSettle(
    sql,
    userId,
    principalUsd,
    sessionPnlUsd
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, balanceAfter: result.balanceAfter });
}
