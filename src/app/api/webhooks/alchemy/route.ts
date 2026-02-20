import { NextResponse } from "next/server";
import { notifyWatchAddress } from "@/lib/notify";

export const runtime = "nodejs";

function parseAlchemy(payload: any) {
  const events = Array.isArray(payload?.event?.activity)
    ? payload.event.activity
    : Array.isArray(payload?.activity)
      ? payload.activity
      : Array.isArray(payload?.events)
        ? payload.events
        : [];
  return events.map((e: any) => ({
    from: e?.fromAddress ?? e?.from ?? e?.source,
    to: e?.toAddress ?? e?.to ?? e?.destination,
    amount: String(e?.value ?? e?.amount ?? "0"),
    token: e?.asset ?? e?.tokenSymbol ?? "TOKEN",
    tokenAddress: e?.contractAddress ?? e?.tokenAddress ?? e?.contract ?? "-",
    txHash: e?.hash ?? e?.transactionHash ?? ""
  }));
}

export async function POST(request: Request) {
  const payload = await request.json();
  const transfers = parseAlchemy(payload);
  const time = new Date().toISOString();

  const results = [];
  for (const t of transfers) {
    if (!t.from && !t.to) continue;
    if (t.from) {
      results.push(
        await notifyWatchAddress({
          address: t.from,
          chain: "base",
          action: "卖出",
          amount: t.amount ?? "0",
          token: t.token ?? "TOKEN",
          tokenAddress: t.tokenAddress ?? "-",
          txHash: t.txHash ?? "",
          time
        })
      );
    }
    if (t.to) {
      results.push(
        await notifyWatchAddress({
          address: t.to,
          chain: "base",
          action: "买入",
          amount: t.amount ?? "0",
          token: t.token ?? "TOKEN",
          tokenAddress: t.tokenAddress ?? "-",
          txHash: t.txHash ?? "",
          time
        })
      );
    }
  }

  return NextResponse.json({ ok: true, count: results.length });
}

