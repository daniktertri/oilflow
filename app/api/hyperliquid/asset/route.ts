import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HL_INFO = new URL("https://api.hyperliquid.xyz/info");

type UniverseEntry = { name: string };

export async function GET(req: NextRequest) {
  try {
    const coin = req.nextUrl.searchParams.get("coin")?.trim() || "xyz:CL"; // WTIOIL-USDC
    const dex = req.nextUrl.searchParams.get("dex")?.trim() || "";

    const res = await fetch(HL_INFO, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "OilFlow/1.0",
      },
      body: JSON.stringify({ type: "metaAndAssetCtxs", dex }),
      cache: "no-store",
      redirect: "manual",
    });
    const text = await res.text();
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json(
        {
          error: `Unexpected redirect ${res.status}`,
          detail: (res.headers.get("location") ?? "").slice(0, 200),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Hyperliquid ${res.status}`, detail: text.slice(0, 200) },
        { status: res.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data) || data.length < 2) {
      return NextResponse.json(
        { error: "Unexpected meta response" },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    const universe = (data[0] as { universe: UniverseEntry[] }).universe;
    const ctxs = data[1] as Record<string, unknown>[];
    const idx = universe.findIndex((u) => u.name === coin);
    if (idx < 0 || !ctxs[idx]) {
      return NextResponse.json(
        { error: `Asset not found in dex "${dex || "main"}": ${coin}` },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(ctxs[idx], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
