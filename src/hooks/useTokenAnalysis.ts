import { useEffect, useState } from "react";
import { TokenAnalysisInput, TokenAnalysisResult } from "../types";

export interface AlertToast {
  id: string;
  title: string;
  message: string;
  ts: number;
}

export function useTokenAnalysis(input: TokenAnalysisInput | null) {
  const [data, setData] = useState<TokenAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [alerts, setAlerts] = useState<AlertToast[]>([]);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    async function run() {
      if (!input) return;
      setIsLoading(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
        const text = await res.text();
        let json: any = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch {
            throw new Error(`Analyze API returned non-JSON: ${text.slice(0, 200)}`);
          }
        }
        if (!mounted) return;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? `Analyze failed (${res.status})`);
        }
        setData(json.result);
        setError(null);

        const alertRes = await fetch("/api/alerts/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chain: input.chain,
            address: input.address,
            top10Pct: json.result?.distribution?.top10Pct ?? 0,
            liquidityUsd: json.result?.liquidityUsd ?? 0,
            top10HoldingsUsd: json.result?.top10HoldingsUsd ?? 0,
            holders: (json.result?.topHolders ?? []).map((h: any) => ({
              address: h.address,
              pct: h.pct
            })),
            recentTransfers: []
          })
        });
        if (alertRes.ok) {
          const alertJson = await alertRes.json();
          if (alertJson?.alerts?.length) {
            const mapped = alertJson.alerts.map((a: any) => ({
              id: `${a.type}-${a.ts}`,
              title: a.title,
              message: a.message,
              ts: a.ts
            }));
            setAlerts((prev) => [...mapped, ...prev].slice(0, 5));
          }
        }
      } catch (err) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : JSON.stringify(err ?? "Unknown error");
        setError(new Error(message));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    run();
    timer = setInterval(run, 60_000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [input?.address, input?.chain]);

  return { data, isLoading, error, alerts };
}
