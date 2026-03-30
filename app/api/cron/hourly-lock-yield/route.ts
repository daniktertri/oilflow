import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  applyHourlyYieldPacket,
  listActiveLocksForYield,
} from "@/lib/db/wallet";

function random01(): number {
  const b = randomBytes(4).readUInt32BE(0);
  return b / 0xffff_ffff;
}

function utcHourContext(): { hourBucketIso: string; dayUtc: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const h = now.getUTCHours();
  const hourStart = new Date(Date.UTC(y, m, d, h, 0, 0, 0));
  const dayUtc = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { hourBucketIso: hourStart.toISOString(), dayUtc };
}

function verifyCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  const { hourBucketIso, dayUtc } = utcHourContext();
  const locks = await listActiveLocksForYield(sql);
  let applied = 0;
  let skipped = 0;

  for (const lock of locks) {
    const r = random01();
    const minRate = 0.00039;
    const maxRate = 0.0005;
    const rate = minRate + r * (maxRate - minRate);
    const yieldUsd = lock.principal_usd * rate;
    const pnlUser = yieldUsd / 2;
    const pnlPlatform = yieldUsd - pnlUser;
    const notionalUser = lock.principal_usd * 0.05;
    const notionalPlatform = lock.principal_usd * 0.05;
    const sideUser = random01() > 0.5 ? ("long" as const) : ("short" as const);
    const sidePlatform = random01() > 0.5 ? ("long" as const) : ("short" as const);

    const result = await applyHourlyYieldPacket(sql, {
      lockId: lock.id,
      userId: lock.user_id,
      yieldUsd,
      pnlUser,
      pnlPlatform,
      notionalUser,
      notionalPlatform,
      hourBucket: hourBucketIso,
      dayUtc,
      sideUser,
      sidePlatform,
    });
    if (result.applied) applied += 1;
    else skipped += 1;
  }

  return NextResponse.json({
    ok: true,
    hourBucket: hourBucketIso,
    locks: locks.length,
    applied,
    skipped,
  });
}
