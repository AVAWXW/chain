export type Chain = "solana" | "base";

export interface TokenAnalysisInput {
  chain: Chain;
  address: string;
}

export interface ChipDistribution {
  top10Pct: number;
  top50Pct: number;
  top100Pct: number;
  othersPct: number;
}

export interface CostBin {
  price: number;
  volumePct: number;
}

export interface TopHolder {
  address: string;
  label?: string;
  pct: number;
  avgCost?: number;
  pnlPct?: number;
  flow3d?: number;
  flow7d?: number;
  firstSeen?: string;
}

export interface ProfitRatio {
  profitAddresses: number;
  totalAddresses: number;
  profitPct: number;
  estimated?: boolean;
  method?: "holders" | "bins";
}

export interface Signal {
  id: string;
  title: string;
  status: "bullish" | "bearish" | "neutral" | "insufficient_data";
  reason: string;
}

export interface TokenAnalysisResult {
  chain: Chain;
  address: string;
  distribution: ChipDistribution;
  costBins: CostBin[];
  top100Profit: ProfitRatio;
  topHolders: TopHolder[];
  signals: Signal[];
  price: number;
  liquidityUsd?: number;
  marketCapUsd?: number;
  top10HoldingsUsd?: number;
  updatedAt: string;
  notes?: string[];
}
