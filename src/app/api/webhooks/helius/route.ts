import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { notifyWatchAddress } from "@/lib/notify";

export const runtime = "nodejs";

function parseTransfers(payload: any) {
  const items = Array.isArray(payload) ? payload : [payload];
  const transfers: Array<{
    from?: string;
    to?: string;
    amount?: string;
    mint?: string;
    tokenSymbol?: string;
    signature?: string;
    timestamp?: number;
  }> = [];

  for (const item of items) {
    const sig = item?.signature ?? item?.transaction?.signatures?.[0];
    const ts = item?.timestamp ?? item?.blockTime ?? item?.block_time ?? undefined;
    const tokenTransfers = Array.isArray(item?.tokenTransfers)
      ? item.tokenTransfers
      : Array.isArray(item?.events?.tokenTransfers)
        ? item.events.tokenTransfers
        : [];
    for (const t of tokenTransfers) {
      transfers.push({
        from: t?.fromUserAccount ?? t?.from ?? t?.source,
        to: t?.toUserAccount ?? t?.to ?? t?.destination,
        amount: String(t?.tokenAmount ?? t?.amount ?? t?.value ?? "0"),
        mint: t?.mint ?? t?.tokenMint ?? t?.asset,
        tokenSymbol: t?.tokenSymbol ?? t?.symbol ?? "TOKEN",
        signature: sig,
        timestamp: ts
      });
    }
  }
  return transfers;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (env.heliusApiKey && env.heliusApiKey.length > 0) {
    const expected = process.env.HELIUS_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
    }
  }

  const payload = await request.json();
  const transfers = parseTransfers(payload);
  const results = [];

  for (const t of transfers) {
    if (!t.from && !t.to) continue;
    const time = t.timestamp ? new Date(t.timestamp * 1000).toISOString() : new Date().toISOString();
    if (t.from) {
      results.push(
        await notifyWatchAddress({
          address: t.from,
          chain: "solana",
          action: "卖出",
          amount: t.amount ?? "0",
          token: t.tokenSymbol ?? "TOKEN",
          tokenAddress: t.mint ?? "-",
          txHash: t.signature ?? "",
          time
        })
      );
    }
    if (t.to) {
      results.push(
        await notifyWatchAddress({
          address: t.to,
          chain: "solana",
          action: "买入",
          amount: t.amount ?? "0",
          token: t.tokenSymbol ?? "TOKEN",
          tokenAddress: t.mint ?? "-",
          txHash: t.signature ?? "",
          time
        })
      );
    }
  }

  return NextResponse.json({ ok: true, count: results.length });
}

