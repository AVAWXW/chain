export interface BirdeyeConfig {
  apiKey: string;
  baseUrl?: string;
}

import Bottleneck from "bottleneck";

export class BirdeyeProvider {
  private apiKey: string;
  private baseUrl: string;
  private static cache = new Map<string, { ts: number; data: any }>();
  private static limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1100 });

  constructor(config: BirdeyeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://public-api.birdeye.so";
  }

  private async get(
    path: string,
    params: Record<string, string>,
    chain: "solana" | "base"
  ) {
    const url = new URL(this.baseUrl + path);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const cacheKey = `${chain}:${url.toString()}`;
    const cached = BirdeyeProvider.cache.get(cacheKey);
    const ttl = this.getTtl(path);
    if (cached && Date.now() - cached.ts < ttl) {
      return cached.data;
    }
    const data = await BirdeyeProvider.limiter.schedule(() =>
      this.fetchWithRetry(url.toString(), path, chain)
    );
    BirdeyeProvider.cache.set(cacheKey, { ts: Date.now(), data });
    return data;
  }

  private getTtl(path: string) {
    if (path.includes("token/holder")) return 120_000;
    if (path.includes("token/txs")) return 30_000;
    if (path.includes("token_overview")) return 60_000;
    if (path.includes("price")) return 10_000;
    return 20_000;
  }

  private async fetchWithRetry(url: string, path: string, chain: "solana" | "base") {
    const maxAttempts = 4;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(url, {
          headers: {
            accept: "application/json",
            "X-API-KEY": this.apiKey,
            "x-chain": chain
          },
          cache: "no-store",
          signal: controller.signal
        });
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const delayMs = retryAfter
            ? Number(retryAfter) * 1000
            : 1000 * Math.pow(2, attempt);
          await this.sleep(delayMs);
          continue;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Birdeye ${path} failed: ${res.status} ${text}`);
        }
        return await res.json();
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        await this.sleep(1000 * Math.pow(2, attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(`Birdeye ${path} failed after retries`);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getPrice(params: { chain: "solana" | "base"; address: string }) {
    return this.get("/defi/price", { address: params.address, include_liquidity: "true" }, params.chain);
  }

  async getTokenOverview(params: { chain: "solana" | "base"; address: string }) {
    return this.get("/defi/token_overview", { address: params.address }, params.chain);
  }

  async getTokenLiquidity(params: { chain: "solana" | "base"; address: string }) {
    return this.get("/defi/v3/token/exit-liquidity", { address: params.address }, params.chain);
  }

  async getPriceVolumeSingle(params: { chain: "solana" | "base"; address: string }) {
    return this.get("/defi/price_volume/single", { address: params.address }, params.chain);
  }

  async getTokenHolders(params: {
    chain: "solana" | "base";
    address: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get(
      "/defi/v3/token/holder",
      {
        address: params.address,
        limit: String(params.limit ?? 100),
        offset: String(params.offset ?? 0)
      },
      params.chain
    );
  }

  async getTokenTxs(params: {
    chain: "solana" | "base";
    address: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get(
      "/defi/v3/token/txs",
      {
        address: params.address,
        limit: String(params.limit ?? 50),
        offset: String(params.offset ?? 0)
      },
      params.chain
    );
  }
}
