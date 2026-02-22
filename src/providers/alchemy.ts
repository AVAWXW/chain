export interface AlchemyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AlchemyProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AlchemyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://base-mainnet.g.alchemy.com";
  }

  private rpcUrl() {
    return `${this.baseUrl}/v2/${this.apiKey}`;
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(this.rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      }),
      cache: "no-store",
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Alchemy ${method} failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    if (json?.error) {
      throw new Error(`Alchemy ${method} error: ${JSON.stringify(json.error)}`);
    }
    return json.result as T;
  }

  async getAssetTransfers(params: { contractAddress: string; maxCount?: number | string }) {
    return this.rpc("alchemy_getAssetTransfers", [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        category: ["erc20"],
        contractAddresses: [params.contractAddress],
        withMetadata: true,
        maxCount: params.maxCount ?? "0x64",
        excludeZeroValue: true
      }
    ]);
  }
}
