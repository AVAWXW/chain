export type WatchCategory =
  | "MARKET_MAKER"
  | "HOUSE_DEV"
  | "WASH_TRADER"
  | "SMART_MONEY"
  | "SUSPECTED"
  | "ALT_ACCOUNT"
  | "GROUP_CLUSTER"
  | "GENERAL_WATCH";

export const categoryKeywords: Record<WatchCategory, string[]> = {
  MARKET_MAKER: ["做市", "底部", "出货", "A级", "MM"],
  HOUSE_DEV: ["house", "莊家", "庄家", "useless莊家", "主控", "内部资金"],
  WASH_TRADER: ["洗米盤", "內盤", "專打內盤", "追內盤", "开盘哥", "內盘", "洗米盘"],
  SMART_MONEY: ["勝率高", "厲害", "很猛", "精品哥", "上得早", "早期高手", "聪明", "高胜率"],
  SUSPECTED: ["很陰", "陰謀", "疑似", "可能", "阴谋", "很阴"],
  ALT_ACCOUNT: ["小號", "alt", "旗下机器人", "bot", "小号"],
  GROUP_CLUSTER: ["烏茲", "乌兹", "GP哥", "sling", "fartless", "大聰明"],
  GENERAL_WATCH: []
};

export const categoryPriority: WatchCategory[] = [
  "MARKET_MAKER",
  "HOUSE_DEV",
  "WASH_TRADER",
  "SMART_MONEY",
  "SUSPECTED",
  "ALT_ACCOUNT",
  "GROUP_CLUSTER",
  "GENERAL_WATCH"
];
