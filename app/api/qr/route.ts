import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** SVG QR (server-side) — avoids client bundles that break Webpack HMR (`originalFactory.call`). */
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data") ?? "";
  if (!data.trim()) {
    return new NextResponse("Missing data", { status: 400 });
  }
  try {
    const svg = await QRCode.toString(data, {
      type: "svg",
      width: 160,
      margin: 1,
      color: { dark: "#0c0e12", light: "#ffffff" },
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Invalid data", { status: 400 });
  }
}
