import fs from "fs";
import path from "path";

export type ChannelMap = Record<string, { chatId: string; threadId?: number }>;

export function loadChannelMap(): ChannelMap {
  const filePath = path.join(process.cwd(), "data", "telegram_channels.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, string>;

  const out: ChannelMap = {};
  Object.entries(parsed).forEach(([key, value]) => {
    if (value.includes("_")) {
      const [chatId, thread] = value.split("_");
      out[key] = { chatId, threadId: Number(thread) };
    } else {
      out[key] = { chatId: value };
    }
  });
  return out;
}

