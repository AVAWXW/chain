import type { Signal, TokenAnalysisResult } from "@/types";

export interface StrategyConfig {
  entry: {
    top10IncreasePct1h: number;
    top100ProfitPctMax: number;
    priceWallPct: number;
  };
  exit: {
    top10SingleSellPct: number;
    top100ProfitPctMin: number;
    liquidityImpactPct: number;
  };
}

export const defaultStrategy: StrategyConfig = {
  entry: {
    top10IncreasePct1h: 2,
    top100ProfitPctMax: 30,
    priceWallPct: 3
  },
  exit: {
    top10SingleSellPct: 10,
    top100ProfitPctMin: 85,
    liquidityImpactPct: 15
  }
};

export function evaluateSignals(result: TokenAnalysisResult): Signal[] {
  const signals: Signal[] = [];

  signals.push({
    id: "entry-top10-trend",
    title: "Top10 控盘提升",
    status: "insufficient_data",
    reason: "需要 1 小时历史快照对比。"
  });

  if (result.top100Profit.estimated) {
    signals.push({
      id: "entry-profit-health",
      title: "盈利健康度",
      status: result.top100Profit.profitPct < defaultStrategy.entry.top100ProfitPctMax
        ? "bullish"
        : "neutral",
      reason: `盈利占比 ${result.top100Profit.profitPct.toFixed(2)}%（估算）`
    });
  } else {
    signals.push({
      id: "entry-profit-health",
      title: "盈利健康度",
      status: result.top100Profit.profitPct < defaultStrategy.entry.top100ProfitPctMax
        ? "bullish"
        : "neutral",
      reason: `盈利占比 ${result.top100Profit.profitPct.toFixed(2)}%`
    });
  }

  signals.push({
    id: "entry-price-wall",
    title: "成本墙支撑",
    status: "insufficient_data",
    reason: "需要成本密集区 + 当前价格偏离度计算。"
  });

  signals.push({
    id: "exit-top10-sell",
    title: "Top10 单笔减持",
    status: "insufficient_data",
    reason: "需要链上交易与持仓快照。"
  });

  signals.push({
    id: "exit-profit-overheat",
    title: "盈利过载",
    status: result.top100Profit.profitPct > defaultStrategy.exit.top100ProfitPctMin
      ? "bearish"
      : "neutral",
    reason: `盈利占比 ${result.top100Profit.profitPct.toFixed(2)}%`
  });

  signals.push({
    id: "exit-liquidity",
    title: "流动性枯竭",
    status: "insufficient_data",
    reason: "需要池子流动性与深度数据。"
  });

  return signals;
}

