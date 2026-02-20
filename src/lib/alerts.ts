import { env } from "@/lib/env";
import { loadSnapshotBefore } from "@/lib/snapshots";

export type AlertItem = {
  type: "top10_spike" | "whale_move" | "dump_risk" | "shuffle";
  title: string;
  message: string;
  ts: number;
};

export async function sendTelegram(message: string, params?: { chatId?: string; threadId?: number }) {
  if (!env.telegramBotToken) return false;
  const chatId = params?.chatId ?? env.telegramChatId;
  if (!chatId) return false;
  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_thread_id: params?.threadId,
      text: message
    })
  });
  return res.ok;
}

export function loadRecentAlert(db: any, params: { chain: string; address: string; type: string; since: number }) {
  return db
    .prepare(
      "SELECT ts FROM alerts WHERE chain = ? AND address = ? AND type = ? AND ts >= ? ORDER BY ts DESC LIMIT 1"
    )
    .get(params.chain, params.address, params.type, params.since);
}

export function saveAlert(db: any, params: { chain: string; address: string; type: string; ts: number; message: string }) {
  db.prepare(
    "INSERT INTO alerts (chain, address, type, ts, message) VALUES (?, ?, ?, ?, ?)"
  ).run(params.chain, params.address, params.type, params.ts, params.message);
}

export function evaluateAlerts(params: {
  db: any;
  chain: "base" | "solana";
  address: string;
  nowTs: number;
  top10Pct: number;
  holders: Array<{ address: string; pct: number }>;
  liquidityUsd?: number;
  top10HoldingsUsd?: number;
  recentTransfers?: Array<{ from?: string; to?: string; ts?: number; amount?: number }>;
}) {
  const alerts: AlertItem[] = [];
  const snap1h = loadSnapshotBefore(params.db, {
    chain: params.chain,
    address: params.address,
    ts: params.nowTs - 3600
  });
  if (snap1h) {
    const delta = params.top10Pct - (snap1h?.top10 ?? 0);
    if (delta > 2) {
      alerts.push({
        type: "top10_spike",
        title: "Top10 控盘快速提升",
        message: `Top10 占比 1h 内提升 ${delta.toFixed(2)}%`,
        ts: params.nowTs
      });
    }
  }

  const snap15m = loadSnapshotBefore(params.db, {
    chain: params.chain,
    address: params.address,
    ts: params.nowTs - 900
  });
  if (snap15m?.holders?.length) {
    const prev = new Map<string, number>();
    snap15m.holders.forEach((h: any) => prev.set(h.address, Number(h.pct ?? 0)));
    const whale = params.holders.find((h) => (h.pct - (prev.get(h.address) ?? 0)) >= 0.5);
    if (whale) {
      alerts.push({
        type: "whale_move",
        title: "巨鲸异动",
        message: `地址 ${whale.address.slice(0, 6)}...${whale.address.slice(-4)} 在 15min 内提升 ${(
          whale.pct - (prev.get(whale.address) ?? 0)
        ).toFixed(2)}%`,
        ts: params.nowTs
      });
    }
  }

  if (params.liquidityUsd && params.top10HoldingsUsd) {
    const risk = params.top10HoldingsUsd / params.liquidityUsd;
    if (risk >= 0.3) {
      alerts.push({
        type: "dump_risk",
        title: "流动性风险偏高",
        message: `Top10 持仓市值 / 流动性 = ${(risk * 100).toFixed(1)}%`,
        ts: params.nowTs
      });
    }
  }

  if (params.recentTransfers?.length) {
    const top50 = params.holders.slice(0, 50).map((h) => h.address);
    const topSet = new Set(top50);
    const holderSet = new Set(params.holders.map((h) => h.address));
    const cutoff = params.nowTs - 600;
    const bySender = new Map<string, Set<string>>();
    params.recentTransfers.forEach((t) => {
      if (!t.from || !t.to || !t.ts) return;
      if (t.ts < cutoff) return;
      if (!topSet.has(t.from)) return;
      if (holderSet.has(t.to)) return;
      if (!bySender.has(t.from)) bySender.set(t.from, new Set());
      bySender.get(t.from)?.add(t.to);
    });
    for (const [sender, recipients] of bySender.entries()) {
      if (recipients.size >= 5) {
        alerts.push({
          type: "shuffle",
          title: "疑似洗盘分发",
          message: `Top50 地址 ${sender.slice(0, 6)}...${sender.slice(-4)} 在 10min 内分发至 ${recipients.size} 个新钱包`,
          ts: params.nowTs
        });
        break;
      }
    }
  }

  return alerts;
}
