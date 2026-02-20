import { NextResponse } from "next/server";
import { notifyWatchAddress } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const address = String(body?.address ?? "").trim();
  const chain = String(body?.chain ?? "").trim();
  const action = String(body?.action ?? "买入");
  const amount = String(body?.amount ?? "0");
  const token = String(body?.token ?? "-");
  const tokenAddress = String(body?.tokenAddress ?? "-");
  const txHash = String(body?.txHash ?? "");
  const time = String(body?.time ?? new Date().toISOString());
  const label = String(body?.label ?? "地址");

  if (!address || !chain) {
    return NextResponse.json({ ok: false, error: "Missing address or chain" }, { status: 400 });
  }

  const result = await notifyWatchAddress({
    address,
    chain,
    action,
    amount,
    token,
    tokenAddress,
    txHash,
    time
  });

  return NextResponse.json(result);
}
