export interface HeliusConfig {
  apiKey: string;
  baseUrl?: string;
}

export class HeliusProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: HeliusConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.helius.xyz";
  }

  private url(path: string) {
    const url = new URL(this.baseUrl + path);
    url.searchParams.set("api-key", this.apiKey);
    return url.toString();
  }

  async getEnhancedTransactions(params: { signatures: string[] }) {
    if (params.signatures.length === 0) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(this.url("/v0/transactions"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactions: params.signatures }),
      cache: "no-store",
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Helius transactions failed: ${res.status} ${text}`);
    }
    return res.json();
  }
}
