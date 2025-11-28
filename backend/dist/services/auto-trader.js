import { getLogger } from "../utils/logger.js";
import { getJupiterQuote, executeJupiterSwap } from "../lib/jupiter.js";
import dbService from "./db.service.js";
import { ENV } from "../utils/env.js";
const log = getLogger("auto-trader");
const SOL_MINT = "So11111111111111111111111111111111111111112";
/** Resolve a usable backend wallet */
function resolveWallet() {
    const wallet = ENV.SERVER_PUBLIC_KEY ||
        process.env.BACKEND_RECEIVER_WALLET ||
        process.env.WALLET_FALLBACK ||
        "";
    if (!wallet)
        throw new Error("❌ Missing backend wallet to execute swap");
    return wallet;
}
export async function autoBuyToken(token) {
    try {
        const wallet = resolveWallet();
        const amountSol = ENV.AUTO_BUY_AMOUNT_SOL ?? 0.1;
        const lamports = Math.round(amountSol * 1e9);
        const slippage = ENV.DEFAULT_SLIPPAGE_PCT ?? 1;
        const quote = await getJupiterQuote(SOL_MINT, token.mint, lamports, slippage);
        if (!quote)
            throw new Error("Failed to get Jupiter quote");
        const swap = await executeJupiterSwap({
            inputMint: SOL_MINT,
            outputMint: token.mint,
            amount: lamports,
            userPublicKey: wallet,
            slippage,
        });
        if (!swap.success)
            throw new Error(swap.error);
        const amountTokens = Number(quote.outAmount ?? 0) / 1e9;
        const price = amountTokens > 0
            ? Number((amountSol / amountTokens).toFixed(9))
            : token.price;
        const trade = {
            id: `autoBuy-${Date.now()}`,
            type: "buy",
            token: token.mint,
            inputMint: SOL_MINT,
            outputMint: token.mint,
            amountLamports: lamports,
            amountSol,
            price,
            pnl: 0,
            wallet,
            simulated: !!swap.simulated,
            signature: swap.signature ?? null,
            timestamp: new Date(),
        };
        const record = await dbService.addTrade(trade);
        emitUpdate(record, "autobuy");
        return { success: true, data: record };
    }
    catch (err) {
        log.error({ err: err.message }, "⚠ autoBuyToken");
        return { success: false, error: err.message };
    }
}
export async function autoSellPosition({ tokenMint, amountSol, }) {
    try {
        const wallet = resolveWallet();
        const lamports = Math.round(amountSol * 1e9);
        if (lamports <= 0)
            throw new Error("Invalid sell amount");
        const slippage = ENV.DEFAULT_SLIPPAGE_PCT ?? 1;
        const quote = await getJupiterQuote(tokenMint, SOL_MINT, lamports, slippage);
        if (!quote)
            throw new Error("Failed to get Jupiter quote");
        const swap = await executeJupiterSwap({
            inputMint: tokenMint,
            outputMint: SOL_MINT,
            amount: lamports,
            userPublicKey: wallet,
            slippage,
        });
        if (!swap.success)
            throw new Error(swap.error);
        const price = Number(quote.outAmount ?? 0) / 1e9 / (lamports / 1e9) || 0;
        const trade = {
            id: `autoSell-${Date.now()}`,
            type: "sell",
            token: tokenMint,
            inputMint: tokenMint,
            outputMint: SOL_MINT,
            amountLamports: lamports,
            amountSol,
            price,
            pnl: 0, // computed later
            wallet,
            simulated: !!swap.simulated,
            signature: swap.signature ?? null,
            timestamp: new Date(),
        };
        const record = await dbService.addTrade(trade);
        emitUpdate(record, "autotakeprofit");
        return { success: true, data: record };
    }
    catch (err) {
        log.error({ err: err.message }, "⚠ autoSellPosition");
        return { success: false, error: err.message };
    }
}
/** Socket Notify Helper */
function emitUpdate(trade, reason) {
    try {
        const io = global.__IO;
        if (!io)
            return;
        io.emit("tradeFeed", {
            ...trade,
            auto: true,
            reason,
        });
    }
    catch {
        /* ignored */
    }
}
//# sourceMappingURL=auto-trader.js.map