import { NextResponse } from "next/server";

export async function GET() {
  const stats = {
    pnl: 8.5,
    totalTrades: 128,
    winRate: 72.3,
    balance: 12.45,
  };

  return NextResponse.json(stats);
}
