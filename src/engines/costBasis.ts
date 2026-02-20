import { CostBin } from "../types";

export function computeCostBins(params: {
  trades: Array<{ price: number; volume: number }>;
  binPct: number;
}): CostBin[] {
  if (params.trades.length === 0) return [];
  const prices = params.trades.map((t) => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (!isFinite(min) || !isFinite(max) || min <= 0 || max <= 0) return [];

  const binSize = Math.max((max - min) * (params.binPct / 100), min * (params.binPct / 100));
  const binCount = Math.max(1, Math.ceil((max - min) / binSize));
  const bins = Array.from({ length: binCount }).map((_, i) => ({
    price: min + i * binSize,
    volume: 0
  }));

  for (const trade of params.trades) {
    const idx = Math.min(
      bins.length - 1,
      Math.max(0, Math.floor((trade.price - min) / binSize))
    );
    bins[idx].volume += trade.volume;
  }

  const totalVolume = bins.reduce((s, b) => s + b.volume, 0);
  if (totalVolume === 0) return [];

  return bins.map((b) => ({
    price: Number(b.price.toFixed(8)),
    volumePct: Number(((b.volume / totalVolume) * 100).toFixed(2))
  }));
}

export function mapTransfersToTrades(params: {
  transfers: Array<{ timestamp?: number; amount?: number }>;
  pricePoints: Array<{ timestamp: number; price: number }>;
}) {
  if (params.pricePoints.length === 0) return [];
  const sortedPrices = [...params.pricePoints].sort((a, b) => a.timestamp - b.timestamp);
  return params.transfers
    .map((t) => {
      const ts = t.timestamp ?? 0;
      if (!ts || !t.amount) return null;
      let idx = 0;
      while (idx < sortedPrices.length - 1 && sortedPrices[idx + 1].timestamp <= ts) {
        idx += 1;
      }
      const price = sortedPrices[idx]?.price ?? 0;
      if (!price) return null;
      return { price, volume: t.amount };
    })
    .filter((t): t is { price: number; volume: number } => Boolean(t));
}

export function estimateProfitFromBins(params: {
  currentPrice: number;
  bins: CostBin[];
}) {
  if (params.bins.length === 0 || params.currentPrice <= 0) {
    return { profitPct: 0 };
  }
  const profitPct = params.bins
    .filter((b) => b.price < params.currentPrice)
    .reduce((s, b) => s + b.volumePct, 0);
  return { profitPct: Number(profitPct.toFixed(2)) };
}

export function estimateAverageCost(bins: CostBin[]) {
  if (bins.length === 0) return 0;
  const total = bins.reduce((s, b) => s + b.volumePct, 0);
  if (total === 0) return 0;
  const weighted = bins.reduce((s, b) => s + b.price * b.volumePct, 0);
  return weighted / total;
}
