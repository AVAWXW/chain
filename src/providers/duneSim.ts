export interface DuneSimConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DuneSimProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DuneSimConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.sim.dune.com";
  }

  private async get(path: string, params: Record<string, string>) {
    const url = new URL(this.baseUrl + path);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        "X-Sim-Api-Key": this.apiKey
      },
      cache: "no-store",
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dune Sim ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getTokenHolders(params: {
    chainId: number;
    address: string;
    limit?: number;
    offset?: string;
  }) {
    const address = params.address.toLowerCase();
    return this.get(`/v1/evm/token-holders/${params.chainId}/${address}`, {
      limit: String(params.limit ?? 100),
      offset: params.offset ?? ""
    });
  }

  async getTokenInfo(params: { chainId: number; address: string }) {
    const address = params.address.toLowerCase();
    return this.get(`/v1/evm/token-info/${address}`, {
      chain_ids: String(params.chainId)
    });
  }
}
