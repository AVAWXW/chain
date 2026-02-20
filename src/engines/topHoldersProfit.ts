import { ProfitRatio } from "../types";

export function computeTopHoldersProfit(params: {
  holders: Array<{ avgEntryPrice: number }>;
  currentPrice: number;
}): ProfitRatio {
  const total = params.holders.length;
  const profitAddresses = params.holders.filter(
    (h) => params.currentPrice > h.avgEntryPrice
  ).length;
  const profitPct = total === 0 ? 0 : (profitAddresses / total) * 100;
  return { profitAddresses, totalAddresses: total, profitPct, estimated: false, method: "holders" };
}
