export interface TelegramTemplateInput {
  categoryName: string;
  riskLevel: string;
  label: string;
  address: string;
  chain: string;
  action: string;
  amount: string;
  token: string;
  tokenAddress: string;
  txLink: string;
  cluster?: string;
  time: string;
}

export function buildTelegramMessage(input: TelegramTemplateInput) {
  const lines = [
    "🚨 链上地址异动",
    `分类：${input.categoryName}`,
    `风险等级：${input.riskLevel}`,
    `标签：${input.label}`,
    `地址：${input.address}`,
    input.cluster ? `Cluster: ${input.cluster}` : "",
    "",
    `行为：${input.action}`,
    `金额：${input.amount} ${input.token}`,
    "",
    `链：${input.chain}`,
    `代币：${input.token} (${input.tokenAddress})`,
    `交易：${input.txLink}`,
    `时间：${input.time}`
  ];
  return lines.filter((line) => line !== "").join("\n");
}

