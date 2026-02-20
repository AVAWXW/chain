import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { BirdeyeProvider, AlchemyProvider, HeliusProvider } from "@/providers";

export const runtime = "nodejs";

export async function GET() {
  const birdeye = new BirdeyeProvider({
    apiKey: env.birdeyeApiKey,
    baseUrl: env.birdeyeBaseUrl
  });
  const alchemy = new AlchemyProvider({
    apiKey: env.alchemyApiKey,
    baseUrl: env.alchemyBaseUrl
  });
  const helius = new HeliusProvider({
    apiKey: env.heliusApiKey,
    baseUrl: env.heliusBaseUrl
  });

  const results: Record<string, any> = {};

  try {
    const res = await birdeye.getPrice({
      chain: "base",
      address: "0x0000000000000000000000000000000000000000"
    });
    results.birdeye = { ok: true, note: res?.success ?? true };
  } catch (err: any) {
    results.birdeye = { ok: false, error: err?.message ?? "failed" };
  }

  try {
    const res: any = await alchemy.getAssetTransfers({
      contractAddress: "0x0000000000000000000000000000000000000000",
      maxCount: "0x1"
    });
    results.alchemy = { ok: true, note: res?.transfers?.length ?? 0 };
  } catch (err: any) {
    results.alchemy = { ok: false, error: err?.message ?? "failed" };
  }

  try {
    const res: any = await helius.getEnhancedTransactions({ signatures: [] });
    results.helius = { ok: true, note: Array.isArray(res) ? res.length : 0 };
  } catch (err: any) {
    results.helius = { ok: false, error: err?.message ?? "failed" };
  }

  return NextResponse.json({ ok: true, results });
}

