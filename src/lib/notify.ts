import { buildTelegramMessage } from "@/lib/telegramTemplate";
import { inferCluster, loadWatchlistMap } from "@/lib/watchlistMap";
import { loadChannelMap } from "@/lib/telegramChannels";
import { sendTelegram } from "@/lib/alerts";

const categoryMeta: Record<string, { name: string; risk: string }> = {
  MARKET_MAKER: { name: "做市商", risk: "VERY_HIGH" },
  HOUSE_DEV: { name: "庄家", risk: "VERY_HIGH" },
  WASH_TRADER: { name: "内盘/洗米盘", risk: "HIGH" },
  SMART_MONEY: { name: "聪明钱", risk: "FOLLOW" },
  SUSPECTED: { name: "可疑资金", risk: "MEDIUM_HIGH" },
  ALT_ACCOUNT: { name: "小号/马甲/机器人", risk: "TRACK_ONLY" },
  GROUP_CLUSTER: { name: "同IP集群", risk: "MEDIUM_HIGH" },
  GENERAL_WATCH: { name: "普通观察", risk: "LOW" }
};

function txLink(chain: string, tx: string) {
  if (!tx) return "-";
  if (chain === "solana") return `https://solscan.io/tx/${tx}`;
  if (chain === "base") return `https://basescan.org/tx/${tx}`;
  return tx;
}

export async function notifyWatchAddress(params: {
  address: string;
  chain: string;
  action: string;
  amount: string;
  token: string;
  tokenAddress: string;
  txHash: string;
  time: string;
}) {
  const watchlist = loadWatchlistMap();
  const entry = watchlist.get(params.address);
  if (!entry) {
    return { ok: false, reason: "address_not_in_watchlist" };
  }

  const category = entry.category ?? "GENERAL_WATCH";
  const categoryInfo = categoryMeta[category] ?? categoryMeta.GENERAL_WATCH;
  const cluster = inferCluster(entry.name);

  const message = buildTelegramMessage({
    categoryName: categoryInfo.name,
    riskLevel: categoryInfo.risk,
    label: entry.name ?? "地址",
    address: params.address,
    chain: params.chain,
    action: params.action,
    amount: params.amount,
    token: params.token,
    tokenAddress: params.tokenAddress,
    txLink: txLink(params.chain, params.txHash),
    time: params.time,
    cluster
  });

  const channels = loadChannelMap();
  const target = channels[category] ?? channels.GROUP_CLUSTER ?? undefined;
  if (!target) {
    return { ok: false, reason: "no_channel_mapping", category };
  }

  const ok = await sendTelegram(message, {
    chatId: target.chatId,
    threadId: target.threadId
  });

  return { ok, category };
}

