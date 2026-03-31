import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlatformStats } from "@/lib/db/platform-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({
      userCount: 0,
      totalEarningsUsd: 0,
      totalLockedUsd: 0,
      mtdEarningsUsd: 0,
      mtdRoiPct: null,
    });
  }
  try {
    const stats = await getPlatformStats(sql);
    return NextResponse.json(stats);
  } catch (e) {
    console.error("[stats/platform]", e);
    return NextResponse.json(
      { error: "Stats unavailable" },
      { status: 503 }
    );
  }
}
