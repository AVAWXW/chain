import fs from "fs";
import path from "path";
import { categoryKeywords, categoryPriority, WatchCategory } from "./watchlistCategories";

export interface WatchEntry {
  address: string;
  name?: string;
  emoji?: string;
  groups?: string[];
  category?: WatchCategory;
}

export interface WatchlistData {
  solana: WatchEntry[];
  base: WatchEntry[];
  unknown: WatchEntry[];
}

export function loadWatchlist(): WatchlistData {
  const filePath = path.join(process.cwd(), "data", "watchlist.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as WatchlistData;
}

export function categorizeEntry(entry: WatchEntry): WatchCategory {
  const haystack = `${entry.name ?? ""} ${entry.emoji ?? ""} ${(entry.groups ?? []).join(" ")}`.toLowerCase();
  for (const category of categoryPriority) {
    if (category === "uncategorized") continue;
    const keywords = categoryKeywords[category];
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return "uncategorized";
}

export function categorizeWatchlist(list: WatchlistData) {
  const result: Record<WatchCategory, WatchEntry[]> = {
    MARKET_MAKER: [],
    HOUSE_DEV: [],
    WASH_TRADER: [],
    SMART_MONEY: [],
    SUSPECTED: [],
    ALT_ACCOUNT: [],
    GROUP_CLUSTER: [],
    GENERAL_WATCH: []
  };

  const all = [...list.solana, ...list.base, ...list.unknown];
  all.forEach((entry) => {
    const category = categorizeEntry(entry);
    result[category].push({ ...entry, category });
  });

  return result;
}
