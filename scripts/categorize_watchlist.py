import json
from pathlib import Path

watchlist_path = Path(r"C:\Users\TF\Desktop\链上分析\chain-chip-analytics\data\watchlist_raw.json")
raw = json.loads(watchlist_path.read_text(encoding="utf-8", errors="ignore"))

keywords = {
  "MARKET_MAKER": ["做市", "底部", "出货", "A级", "MM"],
  "HOUSE_DEV": ["house", "莊家", "庄家", "useless莊家", "主控", "内部资金"],
  "WASH_TRADER": ["洗米盤", "內盤", "專打內盤", "追內盤", "开盘哥", "內盘", "洗米盘"],
  "SMART_MONEY": ["勝率高", "厲害", "很猛", "精品哥", "上得早", "早期高手", "聪明", "高胜率"],
  "SUSPECTED": ["很陰", "陰謀", "疑似", "可能", "阴谋", "很阴"],
  "ALT_ACCOUNT": ["小號", "alt", "旗下机器人", "bot", "小号"],
  "GROUP_CLUSTER": ["烏茲", "乌兹", "GP哥", "sling", "fartless", "大聰明"],
}

out = {k: [] for k in list(keywords.keys()) + ["GENERAL_WATCH"]}

entries = raw if isinstance(raw, list) else (raw.get("solana", []) + raw.get("base", []) + raw.get("unknown", []))
for entry in entries:
    name = (entry.get("name") or "")
    emoji = (entry.get("emoji") or "")
    groups = " ".join(entry.get("groups") or [])
    hay = f"{name} {emoji} {groups}".lower()
    cat = "GENERAL_WATCH"
    for k, kws in keywords.items():
        if any(kw.lower() in hay for kw in kws):
            cat = k
            break
    entry["category"] = cat
    out[cat].append(entry)

out_path = Path(r"C:\Users\TF\Desktop\链上分析\chain-chip-analytics\data\watchlist_by_category.json")
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print("counts:", {k: len(v) for k, v in out.items()})
print("out:", out_path)
