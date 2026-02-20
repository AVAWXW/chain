export const env = {
  birdeyeApiKey: process.env.BIRDEYE_API_KEY ?? "",
  heliusApiKey: process.env.HELIUS_API_KEY ?? "",
  alchemyApiKey: process.env.ALCHEMY_API_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  alertPollSeconds: Number(process.env.ALERT_POLL_SECONDS ?? "60"),
  alchemyOnly: (process.env.ALCHEMY_ONLY ?? "0") === "1",
  duneSimApiKey: process.env.DUNE_SIM_API_KEY ?? "",
  birdeyeBaseUrl: process.env.BIRDEYE_BASE_URL ?? "https://public-api.birdeye.so",
  heliusBaseUrl: process.env.HELIUS_BASE_URL ?? "https://api.helius.xyz",
  alchemyBaseUrl: process.env.ALCHEMY_BASE_URL ?? "https://base-mainnet.g.alchemy.com"
};

export function assertEnv() {
  const missing: string[] = [];
  if (!env.birdeyeApiKey) missing.push("BIRDEYE_API_KEY");
  if (!env.heliusApiKey) missing.push("HELIUS_API_KEY");
  if (!env.alchemyApiKey) missing.push("ALCHEMY_API_KEY");
  if (!env.telegramBotToken) missing.push("TELEGRAM_BOT_TOKEN");
  if (!env.telegramChatId) missing.push("TELEGRAM_CHAT_ID");
  if (!env.duneSimApiKey) missing.push("DUNE_SIM_API_KEY");
  return missing;
}
