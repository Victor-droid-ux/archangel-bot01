// frontend/app/api/trade/route.ts
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenPrice, executeJupiterSwap } from "@lib/solana";

// ⚙️ Initialize Solana connection
const SOLANA_RPC =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC, "confirmed");

// ✅ Example token mint addresses (replace dynamically later)
const SOL_MINT = "So11111111111111111111111111111111111111112"; // SOL
const BONK_MINT = "DezXzV3Jm5p2EuxHWz1t6HkS3b1t2bjLr2Y3FPs2Dg"; // BONK

export async function POST(req: Request) {
  try {
    const { action, baseToken, quoteToken, amount, slippage, wallet } =
      await req.json();

    if (!action || !wallet || !amount) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    console.log(`📨 ${action.toUpperCase()} ${amount} ${baseToken}`);

    // 🔹 1) Get live price from Solana/Jupiter
    const price = await getTokenPrice(BONK_MINT);
    console.log("🪙 BONK/USD:", price);

    // 🔹 2) Simulate or execute a Jupiter swap
    const swap = await executeJupiterSwap({
      inputMint: SOL_MINT,
      outputMint: BONK_MINT,
      amount: Math.floor(amount * 1e9), // convert SOL → lamports
      wallet,
    });

    if (!swap) {
      throw new Error("Jupiter swap execution failed.");
    }

    // 🔹 3) Construct mock trade result (later linked to real Jupiter Tx)
    const result = {
      token: quoteToken || "BONK",
      action,
      price,
      amount,
      output: (amount * price).toFixed(2),
      pnl: (Math.random() * 10 - 5).toFixed(2), // fake ±5% profit/loss
      time: new Date().toISOString(),
    };

    console.log("✅ Simulated trade result:", result);

    // 🔹 4) Return JSON to frontend
    return NextResponse.json({
      success: true,
      message: `Simulated ${action} executed successfully.`,
      data: result,
    });
  } catch (err: any) {
    console.error("❌ Trade route error:", err);
    return NextResponse.json(
      { success: false, message: "Trade execution failed." },
      { status: 500 }
    );
  }
}
