import fs from "fs";
import path from "path";

type Category =
  | "MARKET_MAKER"
  | "HOUSE_DEV"
  | "WASH_TRADER"
  | "SMART_MONEY"
  | "SUSPECTED"
  | "ALT_ACCOUNT"
  | "GROUP_CLUSTER"
  | "GENERAL_WATCH";

export interface WatchEntry {
  address: string;
  name?: string;
  category?: Category;
}

export interface WatchlistByCategory {
  [key: string]: WatchEntry[];
}

const clusterRules: Array<{ name: string; keywords: string[] }> = [
  { name: "WUZI_SERIES", keywords: ["乌兹", "烏茲", "wuzie"] },
  { name: "GP_SERIES", keywords: ["GP", "GP哥"] },
  { name: "SLING_SERIES", keywords: ["sling"] },
  { name: "FARTLESS_SERIES", keywords: ["fartless"] },
  { name: "DACONGMING_SERIES", keywords: ["大聰明", "大聪明"] }
];

export function loadWatchlistMap() {
  const filePath = path.join(process.cwd(), "data", "watchlist_by_category.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WatchlistByCategory;
  const map = new Map<string, WatchEntry>();
  Object.entries(parsed).forEach(([category, list]) => {
    list.forEach((entry) => {
      map.set(entry.address, { ...entry, category: category as Category });
    });
  });
  return map;
}

export function inferCluster(name?: string) {
  if (!name) return undefined;
  const hay = name.toLowerCase();
  for (const rule of clusterRules) {
    if (rule.keywords.some((kw) => hay.includes(kw.toLowerCase()))) {
      return rule.name;
    }
  }
  return undefined;
}

