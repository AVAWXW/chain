import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { evaluateAlerts, loadRecentAlert, saveAlert, sendTelegram } from "@/lib/alerts";
import { BirdeyeProvider } from "@/providers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const chain = body?.chain;
  const address = body?.address;
  if (chain !== "base" && chain !== "solana") {
    return NextResponse.json({ ok: false, error: "Unsupported chain." }, { status: 400 });
  }
  if (typeof address !== "string" || address.length < 10) {
    return NextResponse.json({ ok: false, error: "Invalid token address." }, { status: 400 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "SQLite not available." }, { status: 500 });
  }

  const nowTs = Math.floor(Date.now() / 1000);
  let recentTransfers: Array<{ from?: string; to?: string; ts?: number; amount?: number }> = [];
  if (Array.isArray(body?.recentTransfers)) {
    recentTransfers = body.recentTransfers;
  }

  const alerts = evaluateAlerts({
    db,
    chain,
    address,
    nowTs,
    top10Pct: Number(body?.top10Pct ?? 0),
    holders: Array.isArray(body?.holders) ? body.holders : [],
    liquidityUsd: Number(body?.liquidityUsd ?? 0) || undefined,
    top10HoldingsUsd: Number(body?.top10HoldingsUsd ?? 0) || undefined,
    recentTransfers
  });

  const freshAlerts = [];
  for (const alert of alerts) {
    const recent = loadRecentAlert(db, {
      chain,
      address,
      type: alert.type,
      since: nowTs - env.alertPollSeconds
    });
    if (!recent) {
      saveAlert(db, { chain, address, type: alert.type, ts: alert.ts, message: alert.message });
      await sendTelegram(`[${chain.toUpperCase()}] ${alert.title}\n${address}\n${alert.message}`);
      freshAlerts.push(alert);
    }
  }

  return NextResponse.json({ ok: true, alerts: freshAlerts });
}
