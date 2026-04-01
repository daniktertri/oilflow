import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTriggeredAlerts, markAlertTriggered } from "@/lib/db/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const triggered = await getTriggeredAlerts(sql);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let notified = 0;

  for (const alert of triggered) {
    if (botToken) {
      try {
        const message = `OilFlow Alert: ${alert.benchmark} is ${alert.condition} $${alert.threshold.toFixed(2)}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: alert.telegram_id,
            text: message,
            parse_mode: "HTML",
          }),
        });
        notified++;
      } catch (e) {
        console.error(`[check-alerts] Failed to notify ${alert.telegram_id}:`, e);
      }
    }

    await markAlertTriggered(sql, alert.id);
  }

  return NextResponse.json({ ok: true, triggered: triggered.length, notified });
}
