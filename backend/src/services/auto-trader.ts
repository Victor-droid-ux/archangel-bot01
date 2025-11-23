// backend/src/services/auto-trader.ts
import { getLogger } from "../utils/logger.js";
import * as jupiter from "./jupiter.service.js";
import dbService from "./db.service.js";
import { ENV } from "../utils/env.js";

const log = getLogger("auto-trader");

// SOL mint constant
const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function autoBuyToken(token: {
  symbol: string;
  mint: string;
  price: number;
  marketCap?: number;
  liquidity?: number;
}) {
  try {
    const amountSol = Number(process.env.AUTO_BUY_AMOUNT_SOL ?? ENV.AUTO_BUY_AMOUNT_SOL ?? 0.1); // default 0.1 SOL
    const lamports = Math.round(amountSol * 1e9);

    log.info(`Attempting auto-buy for ${token.symbol} (${token.mint}) amount ${amountSol} SOL`);

    // get a quote from Jupiter
    const quote = await jupiter.getJupiterQuote(SOL_MINT, token.mint, lamports, ENV.DEFAULT_SLIPPAGE);
    if (!quote) {
      throw new Error("No quote from Jupiter");
    }

    // execute swap (server-side signing)
    const swapResult = await jupiter.executeJupiterSwap({
      quoteResponse: quote,
      inputMint: SOL_MINT,
      outputMint: token.mint,
      amount: lamports,
      userPublicKey: ENV.SERVER_PUBLIC_KEY || ENV.DEFAULT_SERVER_WALLET || "", // optional
      slippage: ENV.DEFAULT_SLIPPAGE,
    });

    if (!swapResult.success) {
      log.error("Auto-buy failed: " + swapResult.error);
      return { success: false, error: swapResult.error };
    }

    // compute pnl placeholder (0 initially)
    const pnl = 0;

    // record trade in DB
    const tradePayload: any = {
      type: "buy",
      token: token.mint,
      inputMint: SOL_MINT,
      outputMint: token.mint,
      amount: lamports,
      price: token.price,
      pnl,
      wallet: ENV.SERVER_PUBLIC_KEY || undefined,
      simulated: false,
      signature: swapResult.signature ?? null,
      timestamp: new Date(),
    };
    if (swapResult.signature) {
      tradePayload.id = `onchain-${swapResult.signature}`;
    }
    const record = await dbService.addTrade(tradePayload);

    // emit to sockets (if socket available via app)
    try {
      const io = (global as any).__IO as any;
      if (io && typeof io.emit === "function") {
        io.emit("token:autobuy", { success: true, trade: record });
      }
    } catch (e) {
      log.warn("No global io to emit autobuy event");
    }

    return { success: true, data: record };
  } catch (err: any) {
    log.error("autoBuyToken error: " + (err?.message || String(err)));
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function autoSellPosition(position: {
  tokenMint: string;
  amountSol: number;
  id?: string;
  minAcceptPrice?: number;
}) {
  try {
    const lamports = Math.round(position.amountSol * 1e9);
    if (lamports <= 0) throw new Error("No amount to sell");

    // Sell token -> SOL
    const quote = await jupiter.getJupiterQuote(position.tokenMint, SOL_MINT, lamports, ENV.DEFAULT_SLIPPAGE);
    if (!quote) throw new Error("No quote for sell");

    const swapResult = await jupiter.executeJupiterSwap({
      quoteResponse: quote,
      inputMint: position.tokenMint,
      outputMint: SOL_MINT,
      amount: lamports,
      userPublicKey: ENV.SERVER_PUBLIC_KEY || ENV.DEFAULT_SERVER_WALLET || "",
      slippage: ENV.DEFAULT_SLIPPAGE,
    });

    if (!swapResult.success) {
      throw new Error(swapResult.error ?? "Swap failed");
    }

    const sellPayload: any = {
      type: "sell",
      token: position.tokenMint,
      inputMint: position.tokenMint,
      outputMint: SOL_MINT,
      amount: lamports,
      price: position.minAcceptPrice ?? undefined,
      pnl: undefined, // will be computed by monitoring or DB
      wallet: ENV.SERVER_PUBLIC_KEY || undefined,
      simulated: false,
      signature: swapResult.signature ?? null,
      timestamp: new Date(),
    };
    if (swapResult.signature) {
      sellPayload.id = `onchain-${swapResult.signature}`;
    }
    const sellRecord = await dbService.addTrade(sellPayload);

    // try to emit
    try {
      const io = (global as any).__IO as any;
      if (io && typeof io.emit === "function") {
        io.emit("tradeFeed", {
          id: sellRecord.id,
          type: "sell",
          token: sellRecord.token,
          amount: sellPayload.amount,
          price: sellRecord.price,
          signature: sellRecord.signature,
          timestamp: sellRecord.timestamp,
          auto: true,
          reason: "TP/SL",
        });
      }
    } catch (e) {
      log.warn("No socket to emit sell event");
    }

    return { success: true, data: sellRecord };
  } catch (err: any) {
    log.error("autoSellPosition error: " + (err?.message || String(err)));
    return { success: false, error: err?.message ?? String(err) };
  }
}