"use client";

import { useState } from "react";
import { useTokenAnalysis } from "@/hooks";

export default function Home() {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<"base" | "solana">("base");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { data, isLoading, error, alerts } = useTokenAnalysis(
    submitted ? { chain, address: submitted } : null
  );

  const metrics = [
    { label: "Top10 控盘", value: data ? `${data.distribution.top10Pct.toFixed(2)}%` : "—" },
    { label: "Top50 控盘", value: data ? `${data.distribution.top50Pct.toFixed(2)}%` : "—" },
    {
      label: "Top100 盈利占比",
      value: data
        ? `${data.top100Profit.profitPct.toFixed(2)}%${data.top100Profit.estimated ? " (est)" : ""}`
        : "—"
    },
    { label: "当前价格", value: data ? `$${data.price.toFixed(8)}` : "—" }
  ];

  const bins = data?.costBins?.length
    ? data.costBins.map((bin) => ({
        label: `$${bin.price.toFixed(6)}`,
        value: bin.volumePct
      }))
    : Array.from({ length: 6 }).map((_, i) => ({
        label: `${i * 5}%`,
        value: Math.max(10, 80 - i * 8)
      }));

  return (
    <main className="min-h-screen grid-sheen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Chain Chip Analytics</p>
              <h1 className="text-3xl md:text-5xl font-semibold text-slate-900">
                链上筹码结构
                <span className="text-slate-400"> / Solana + Base</span>
              </h1>
            </div>
            <span className="rounded-full bg-lime-200 px-4 py-2 text-xs font-semibold text-slate-900 shadow-soft-xl">
              实时监控 30s
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="rounded-3xl bg-white/90 p-6 shadow-soft-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">输入合约地址 / CA</p>
                <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1 text-xs">
                  <button
                    onClick={() => setChain("base")}
                    className={`rounded-full px-3 py-1 ${chain === "base" ? "bg-white shadow-soft-xl" : "text-slate-500"}`}
                  >
                    Base
                  </button>
                  <button
                    onClick={() => setChain("solana")}
                    className={`rounded-full px-3 py-1 ${chain === "solana" ? "bg-white shadow-soft-xl" : "text-slate-500"}`}
                  >
                    Solana
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cobalt"
                  placeholder={`输入 ${chain === "base" ? "Base" : "Solana"} 的合约地址`}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
                <button
                  onClick={() => setSubmitted(address.trim())}
                  className="rounded-2xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-soft-xl"
                >
                  立即分析
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">支持 SOL / Base。后端将统一用 Birdeye + Helius + Alchemy 聚合。</p>
              {error ? (
                <p className="mt-3 text-xs text-rose-500">{error.message}</p>
              ) : null}
            </div>

            <div className="rounded-3xl bg-graphite p-6 text-white shadow-soft-xl">
              <p className="text-sm text-slate-300">监控提示</p>
              <h2 className="mt-4 text-2xl font-semibold">等待事件触发</h2>
              <p className="mt-2 text-xs text-slate-400">
                Webhook + 轮询。检测大单、筹码集中度变化、成本区间突破。
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-lime-200">
                <span className="h-2 w-2 rounded-full bg-lime-300" />
                连接中
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-white/90 p-5 shadow-soft-xl">
              <p className="text-xs text-slate-400">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {isLoading && metric.value === "—" ? "…" : metric.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow-soft-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">筹码分布区间</h3>
              <span className="text-xs text-slate-400">成本分布</span>
            </div>
            <div className="mt-6 grid gap-3">
              {bins.map((bin) => (
                <div key={bin.label} className="flex items-center gap-4">
                  <span className="w-12 text-xs text-slate-400">{bin.label}</span>
                  <div className="relative h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="absolute left-0 top-0 h-2 rounded-full bg-lime-300"
                      style={{ width: `${bin.value}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-400">{bin.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-soft-xl">
            <h3 className="text-lg font-semibold text-slate-900">Top 100 地址洞察</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-500">
              <div className="flex items-center justify-between">
                <span>盈利地址占比</span>
                <span className="font-semibold text-slate-900">
                  {data
                    ? `${data.top100Profit.profitPct.toFixed(2)}%${data.top100Profit.estimated ? " (est)" : ""}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>平均成本</span>
                <span className="font-semibold text-slate-900">
                  {data && data.costBins.length > 0 ? "基于成本分布估算" : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>集中度变化</span>
                <span className="font-semibold text-slate-900">—</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-400">
                当盈利占比快速下滑或成本区间上移时触发出场提示。
              </div>
            </div>
            {data?.notes?.length ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-700">
                {data.notes.join(" ")}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow-soft-xl">
            <h3 className="text-lg font-semibold text-slate-900">Top 100 流向明细</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-600">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">地址/标签</th>
                    <th className="py-2 pr-3">持仓占比</th>
                    <th className="py-2 pr-3">估算成本</th>
                    <th className="py-2 pr-3">未实现盈亏</th>
                    <th className="py-2 pr-3">3D Flow</th>
                    <th className="py-2 pr-3">7D Flow</th>
                    <th className="py-2 pr-3">首次入场</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.topHolders?.length
                    ? data.topHolders.map((h) => (
                        <tr key={h.address} className="text-slate-700">
                          <td className="py-2 pr-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{h.label ?? "Wallet"}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {h.address.slice(0, 6)}...{h.address.slice(-4)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-3">{h.pct.toFixed(4)}%</td>
                          <td className="py-2 pr-3">{h.avgCost ? `$${h.avgCost.toFixed(6)}` : "—"}</td>
                          <td className="py-2 pr-3">{h.pnlPct !== undefined ? `${h.pnlPct.toFixed(2)}%` : "—"}</td>
                          <td className="py-2 pr-3">{h.flow3d !== undefined ? `${h.flow3d.toFixed(4)}%` : "—"}</td>
                          <td className="py-2 pr-3">{h.flow7d !== undefined ? `${h.flow7d.toFixed(4)}%` : "—"}</td>
                          <td className="py-2 pr-3">{h.firstSeen ?? "—"}</td>
                        </tr>
                      ))
                    : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            暂无 Top100 数据，输入合约地址后自动加载。
                          </td>
                        </tr>
                      )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-soft-xl">
            <h3 className="text-lg font-semibold text-slate-900">策略信号</h3>
            <div className="mt-4 space-y-3 text-xs text-slate-600">
              {data?.signals?.length ? (
                data.signals.map((signal) => (
                  <div key={signal.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{signal.title}</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">
                        {signal.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{signal.reason}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-400">
                  策略信号等待首次分析。
                </div>
              )}
            </div>
            {data?.liquidityUsd ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                流动性约 ${data.liquidityUsd.toLocaleString()}
                {data.top10HoldingsUsd
                  ? ` ｜Top10 市值约 ${data.top10HoldingsUsd.toLocaleString()}`
                  : ""}
              </div>
            ) : null}
          </div>
        </section>

        <div className="fixed bottom-6 right-6 z-50 flex w-72 flex-col gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl bg-rose-600 p-4 text-xs text-white shadow-soft-xl">
              <p className="text-[11px] uppercase tracking-widest text-rose-100">Alert</p>
              <p className="mt-2 text-sm font-semibold">{alert.title}</p>
              <p className="mt-1 text-[11px] text-rose-100">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
