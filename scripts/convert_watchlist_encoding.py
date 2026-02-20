from pathlib import Path
import json

src = Path(r"C:\Users\TF\Desktop\地址json版本.json.txt")
raw_bytes = src.read_bytes()

text = None
for enc in ("utf-8", "gbk", "gb18030"):
    try:
        text = raw_bytes.decode(enc)
        break
    except UnicodeDecodeError:
        continue

if text is None:
    text = raw_bytes.decode("utf-8", errors="ignore")

start = text.find("[")
end = text.rfind("]")
if start == -1 or end == -1:
    raise SystemExit("No JSON array found")

data = json.loads(text[start:end + 1])

out_path = Path(r"C:\Users\TF\Desktop\链上分析\chain-chip-analytics\data\watchlist_raw.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(out_path)

