// src/app/api/cron/expire-reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

/**
 * Vercel Cron Job: runs every minute (configured in vercel.json).
 * Releases all expired PENDING reservations.
 *
 * Protected by CRON_SECRET env var to prevent unauthorized calls.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseExpiredReservations();
    return NextResponse.json({
      ok: true,
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/expire-reservations]", err);
    return NextResponse.json(
      { error: "Expiry job failed" },
      { status: 500 }
    );
  }
}
