import { NextResponse } from "next/server";
import { assertEnv, env } from "@/lib/env";
import { AlchemyProvider, BirdeyeProvider, DuneSimProvider, HeliusProvider } from "@/providers";
import {
  computeChipDistribution,
  computeCostBins,
  computeTopHoldersProfit,
  estimateProfitFromBins,
  mapTransfersToTrades,
  estimateAverageCost
} from "@/engines";
import type { TokenAnalysisResult } from "@/types";
import { evaluateSignals } from "@/strategies/default";
import { getDb } from "@/lib/db";
import { loadFirstSeen, loadSnapshotBefore, saveSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";

type NormalizedTrade = {
  price: number;
  volume: number;
  timestamp: number;
  signature?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const missing = assertEnv();
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Missing API keys", missing },
        { status: 500 }
      );
    }

    const chain = body?.chain;
    const address = body?.address;
    if (chain !== "base" && chain !== "solana") {
      return NextResponse.json({ ok: false, error: "Unsupported chain." }, { status: 400 });
    }
    if (typeof address !== "string" || address.length < 10) {
      return NextResponse.json({ ok: false, error: "Invalid token address." }, { status: 400 });
    }

  const birdeye = new BirdeyeProvider({
    apiKey: env.birdeyeApiKey,
    baseUrl: env.birdeyeBaseUrl
  });
  const duneSim = new DuneSimProvider({
    apiKey: env.duneSimApiKey
  });
  const alchemy = new AlchemyProvider({
    apiKey: env.alchemyApiKey,
    baseUrl: env.alchemyBaseUrl
  });
  const helius = new HeliusProvider({
    apiKey: env.heliusApiKey,
    baseUrl: env.heliusBaseUrl
  });

  const alchemyOnly = env.alchemyOnly;
  const isBase = chain === "base";
  const notes: string[] = [];
  let duneHoldersRaw: any = null;
  let duneInfoRaw: any = null;
  if (isBase) {
    try {
      duneHoldersRaw = await duneSim.getTokenHolders({ chainId: 8453, address, limit: 100 });
    } catch (err: any) {
      notes.push(`Dune Sim holders unavailable; fallback to Birdeye if allowed. (${err?.message ?? "error"})`);
    }
    try {
      duneInfoRaw = await duneSim.getTokenInfo({ chainId: 8453, address });
    } catch (err: any) {
      notes.push(`Dune Sim token info unavailable; fallback to Birdeye price. (${err?.message ?? "error"})`);
    }
  }

  const priceRaw = isBase
    ? duneInfoRaw ?? (await birdeye.getPrice({ chain, address }).catch(() => ({ data: { value: 0 } })))
    : await birdeye.getPrice({ chain, address }).catch(() => ({ data: { value: 0 } }));

  const allowBirdeyeHolders = !alchemyOnly;
  const [holdersRaw, txsRaw, overviewRaw, liquidityRaw] =
    !isBase || (isBase && allowBirdeyeHolders && !duneHoldersRaw)
      ? await Promise.all([
          birdeye.getTokenHolders({ chain, address, limit: 100, offset: 0 }),
          birdeye.getTokenTxs({ chain, address, limit: 40, offset: 0 }),
          birdeye.getTokenOverview({ chain, address }),
          birdeye.getTokenLiquidity({ chain, address })
        ])
      : [null, null, null, null];

  const price = Number(
    priceRaw?.data?.value ??
      priceRaw?.data?.price ??
      duneInfoRaw?.tokens?.[0]?.price_usd ??
      duneInfoRaw?.tokens?.[0]?.price ??
      0
  );
  const holders = Array.isArray(holdersRaw?.data?.items)
    ? holdersRaw.data.items
    : Array.isArray(holdersRaw?.data?.list)
      ? holdersRaw.data.list
      : [];
  const duneHolders = Array.isArray(duneHoldersRaw?.holders)
    ? duneHoldersRaw.holders
    : Array.isArray(duneHoldersRaw?.data)
      ? duneHoldersRaw.data
      : [];
  const trades = Array.isArray(txsRaw?.data?.items)
    ? txsRaw.data.items
    : Array.isArray(txsRaw?.data?.list)
      ? txsRaw.data.list
      : [];

  const totalSupplyRaw =
    duneInfoRaw?.tokens?.[0]?.total_supply ??
    duneInfoRaw?.tokens?.[0]?.totalSupply ??
    duneInfoRaw?.data?.total_supply ??
    null;
  const totalSupply = totalSupplyRaw ? BigInt(totalSupplyRaw) : null;
  const duneNormalized = duneHolders.map((h: any) => {
    const balanceRaw = h?.balance ?? h?.token_balance ?? "0";
    const balance = BigInt(balanceRaw.toString());
    let pct = 0;
    if (totalSupply && totalSupply > 0n) {
      const scaled = (balance * 10000n) / totalSupply;
      pct = Number(scaled) / 100;
    }
    return {
      address: h?.wallet_address ?? h?.address ?? "unknown",
      pct,
      avgEntryPrice: 0
    };
  });

  const normalizedHolders = duneNormalized.length
    ? duneNormalized
    : holders.map((h: any) => ({
        pct: Number(h?.pct ?? h?.percentage ?? 0),
        avgEntryPrice: Number(h?.avg_buy_price ?? h?.avgEntryPrice ?? h?.avg_cost ?? 0)
      }));

  const normalizedTrades: NormalizedTrade[] = trades
    .map((t: any) => ({
      price: Number(t?.price ?? t?.p ?? 0),
      volume: Number(t?.amount ?? t?.volume ?? 0),
      timestamp: Number(t?.block_time ?? t?.time ?? t?.timestamp ?? 0),
      signature: String(t?.tx_hash ?? t?.signature ?? t?.txid ?? "")
    }))
    .filter((t: NormalizedTrade) => t.price > 0 && t.volume > 0);

  const distribution = normalizedHolders.length
    ? computeChipDistribution(normalizedHolders)
    : { top10Pct: 0, top50Pct: 0, top100Pct: 0, othersPct: 100 };
  let costBins = normalizedTrades.length
    ? computeCostBins({ trades: normalizedTrades, binPct: 8 })
    : [];

  const top100Profit = normalizedHolders.length
    ? computeTopHoldersProfit({
        holders: normalizedHolders.filter((h: any) => h.avgEntryPrice > 0),
        currentPrice: price
      })
    : { profitAddresses: 0, totalAddresses: 0, profitPct: 0, estimated: true, method: "bins" };

  if (top100Profit.totalAddresses === 0) {
    notes.push("Top100 profit ratio unavailable from holders; using bin estimate if possible.");
  }
  if (alchemyOnly) {
    notes.push("Alchemy-only mode: holders/txs disabled due to Birdeye rate limits.");
  }
  if (isBase) {
    notes.push("Base holders sourced from Dune Sim API.");
    if (!totalSupply) {
      notes.push("Dune token total_supply unavailable; holder pct estimated as 0.");
    }
  }

  if (chain === "base") {
    try {
      const transfersRaw: any = await alchemy.getAssetTransfers({
        contractAddress: address,
        maxCount: "0xc8"
      });
      const transfers = Array.isArray(transfersRaw?.transfers)
        ? transfersRaw.transfers
        : [];
      const normalizedTransfers = transfers.map((t: any) => {
        const amount = Number(t?.value ?? t?.rawContract?.value ?? 0);
        const timestamp = t?.metadata?.blockTimestamp
          ? Date.parse(t.metadata.blockTimestamp) / 1000
          : Number(t?.blockTimestamp ?? 0);
        return { amount, timestamp };
      });
      const pricePoints = normalizedTrades
        .map((t) => ({ price: t.price, timestamp: t.timestamp }))
        .filter((t) => t.timestamp > 0);
      const mappedTrades = mapTransfersToTrades({
        transfers: normalizedTransfers,
        pricePoints
      });
      const alchemyBins = computeCostBins({ trades: mappedTrades, binPct: 8 });
      if (alchemyBins.length > 0) {
        costBins = alchemyBins;
      } else {
        notes.push("Alchemy backfill produced no bins; fallback to Birdeye trade distribution.");
      }
    } catch (err) {
      notes.push("Alchemy backfill failed; fallback to Birdeye trade distribution.");
      void err;
    }
  }

  if (top100Profit.totalAddresses === 0 && costBins.length > 0) {
    const estimated = estimateProfitFromBins({ currentPrice: price, bins: costBins });
    top100Profit.profitAddresses = 0;
    top100Profit.totalAddresses = 0;
    top100Profit.profitPct = estimated.profitPct;
    top100Profit.estimated = true;
    top100Profit.method = "bins";
  }

  const avgCostEstimate = estimateAverageCost(costBins);
  const topHolders = normalizedHolders
    .filter((h: any) => h.pct >= 0.01)
    .map((h: any, idx: number) => {
      const avgCost = h.avgEntryPrice > 0 ? h.avgEntryPrice : avgCostEstimate || undefined;
      const pnlPct = avgCost && price > 0 ? ((price - avgCost) / avgCost) * 100 : undefined;
      return {
        address: String(holders[idx]?.owner ?? holders[idx]?.address ?? holders[idx]?.wallet ?? "unknown"),
        label: holders[idx]?.label ?? holders[idx]?.type ?? undefined,
        pct: h.pct,
        avgCost,
        pnlPct: pnlPct ? Number(pnlPct.toFixed(2)) : undefined,
        flow3d: undefined,
        flow7d: undefined,
        firstSeen: undefined
      };
    })
    .slice(0, 100);

  if (topHolders.length === 0) {
    notes.push("Top100 holders unavailable or data fields missing.");
  }

  const db = await getDb();
  if (!db) {
    notes.push("SQLite not available; flow/firstSeen disabled until dependencies installed.");
  } else {
    const nowTs = Math.floor(Date.now() / 1000);
    saveSnapshot(db, {
      chain,
      address,
      ts: nowTs,
      price,
      distribution,
      holders: topHolders
    });

    const snap3d = loadSnapshotBefore(db, {
      chain,
      address,
      ts: nowTs - 3 * 24 * 3600
    });
    const snap7d = loadSnapshotBefore(db, {
      chain,
      address,
      ts: nowTs - 7 * 24 * 3600
    });

    const mapToPct = (snap: any) => {
      if (!snap) return new Map<string, number>();
      const map = new Map<string, number>();
      snap.holders.forEach((h: any) => map.set(h.address, Number(h.pct ?? 0)));
      return map;
    };

    const map3d = mapToPct(snap3d);
    const map7d = mapToPct(snap7d);

    topHolders.forEach((h: any) => {
      if (map3d.size) h.flow3d = Number((h.pct - (map3d.get(h.address) ?? 0)).toFixed(4));
      if (map7d.size) h.flow7d = Number((h.pct - (map7d.get(h.address) ?? 0)).toFixed(4));
      const first = loadFirstSeen(db, { chain, address, holder: h.address });
      if (first) {
        const dt = new Date(first * 1000);
        h.firstSeen = dt.toISOString().slice(0, 10);
      }
    });
  }

  if (chain === "solana") {
    try {
      const sigs = normalizedTrades
        .map((t) => t.signature ?? "")
        .filter((s) => s.length > 0)
        .slice(0, 20);
      if (sigs.length === 0) {
        notes.push("Helius skipped: no signatures from Birdeye.");
      } else {
        const enhanced: any[] = await helius.getEnhancedTransactions({ signatures: sigs });
        const tokenTransfers = enhanced
          .flatMap((tx: any) => (Array.isArray(tx?.tokenTransfers) ? tx.tokenTransfers : []))
          .filter((tr: any) => tr?.mint === address);
        if (tokenTransfers.length > 0) {
          const maxTransfer = tokenTransfers
            .map((tr: any) => Number(tr?.tokenAmount ?? tr?.amount ?? 0))
            .filter((v: number) => v > 0)
            .sort((a: number, b: number) => b - a)[0];
          if (maxTransfer) {
            notes.push(`Helius detected large transfer: ~${maxTransfer.toFixed(4)} tokens.`);
          }
        }
      }
    } catch (err) {
      notes.push("Helius enrichment failed; Solana depth data unavailable.");
      void err;
    }
  }

  const liquidityUsd = Number(
    overviewRaw?.data?.liquidity ??
      overviewRaw?.data?.liquidityUsd ??
      priceRaw?.data?.liquidity ??
      priceRaw?.data?.liquidityUsd ??
      liquidityRaw?.data?.liquidity ??
      liquidityRaw?.data?.usd ??
      duneInfoRaw?.tokens?.[0]?.liquidity_usd ??
      0
  );
  const marketCapUsd = Number(
    overviewRaw?.data?.mc ??
      overviewRaw?.data?.marketCap ??
      overviewRaw?.data?.fdv ??
      duneInfoRaw?.tokens?.[0]?.market_cap_usd ??
      0
  );
  const top10HoldingsUsd =
    marketCapUsd > 0 ? (distribution.top10Pct / 100) * marketCapUsd : undefined;

  const result: TokenAnalysisResult = {
    chain,
    address,
    distribution,
    costBins,
    top100Profit,
    topHolders,
    signals: [],
    price,
    liquidityUsd: liquidityUsd > 0 ? liquidityUsd : undefined,
    marketCapUsd: marketCapUsd > 0 ? marketCapUsd : undefined,
    top10HoldingsUsd,
    updatedAt: new Date().toISOString(),
    notes: notes.length > 0 ? notes : undefined
  };

  result.signals = evaluateSignals(result);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Analyze failed" },
      { status: 500 }
    );
  }
}
