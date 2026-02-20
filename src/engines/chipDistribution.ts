import { ChipDistribution } from "../types";

export function computeChipDistribution(rawHolders: Array<{ pct: number }>): ChipDistribution {
  const top10 = rawHolders.slice(0, 10).reduce((s, h) => s + h.pct, 0);
  const top50 = rawHolders.slice(0, 50).reduce((s, h) => s + h.pct, 0);
  const top100 = rawHolders.slice(0, 100).reduce((s, h) => s + h.pct, 0);
  return {
    top10Pct: top10,
    top50Pct: top50,
    top100Pct: top100,
    othersPct: Math.max(0, 100 - top100),
  };
}
