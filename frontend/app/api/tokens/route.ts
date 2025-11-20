// frontend/app/api/tokens/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const tokens = [
    { symbol: "BONK", price: 0.000021, pnl: 9.5 },
    { symbol: "SAMO", price: 0.0042, pnl: -2.1 },
    { symbol: "WIF", price: 0.12, pnl: 15.3 },
    { symbol: "POPCAT", price: 0.0019, pnl: 7.8 },
  ];

  return NextResponse.json({ tokens });
}
