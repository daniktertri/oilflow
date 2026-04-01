import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth-session";
import { getUserAlerts, createAlert, deleteAlert, toggleAlert } from "@/lib/db/alerts";

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySession(token);
  return session?.userId ?? null;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const alerts = await getUserAlerts(sql, userId);
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const body = (await req.json()) as { benchmark?: string; condition?: string; threshold?: number };
  if (!body.benchmark || !body.condition || body.threshold == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const id = await createAlert(sql, userId, {
    benchmark: body.benchmark,
    condition: body.condition,
    threshold: body.threshold,
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

  await deleteAlert(sql, userId, id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const { id, active } = (await req.json()) as { id?: string; active?: boolean };
  if (!id || active === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await toggleAlert(sql, userId, id, active);
  return NextResponse.json({ ok: true });
}
