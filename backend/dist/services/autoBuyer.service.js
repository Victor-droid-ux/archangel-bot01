// backend/src/services/autoBuyer.service.ts
import crypto from "crypto";
import { getJupiterQuote, executeJupiterSwap } from "./jupiter.service.js";
import dbService from "./db.service.js";
import { getLogger } from "../utils/logger.js";
import { Connection, PublicKey } from "@solana/web3.js";
const LOG = getLogger("autoBuyer");
const SOL_MINT = "So11111111111111111111111111111111111111112";
/* ---------------- RPC for token decimals ---------------- */
const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const commitment = process.env.SOLANA_COMMITMENT || "confirmed";
const connection = new Connection(SOLANA_RPC, commitment);
const decimalsCache = new Map();
async function getDecimals(mint) {
    if (decimalsCache.has(mint))
        return decimalsCache.get(mint);
    try {
        const info = await connection.getParsedAccountInfo(new PublicKey(mint));
        const d = info.value?.data?.parsed?.info?.decimals ??
            info.value?.data?.info?.decimals ??
            9;
        const num = Number(d);
        decimalsCache.set(mint, num);
        return num;
    }
    catch (err) {
        LOG.warn({ mint }, "Fallback decimals=9 for");
        decimalsCache.set(mint, 9);
        return 9;
    }
}
/* ------------------------------------------------------------------------
   AUTO BUY EXECUTOR (triggered by token discovery)
------------------------------------------------------------------------ */
export async function registerAutoBuyCandidate(io, token) {
    try {
        const mint = token.mint;
        if (!mint)
            return;
        const decimals = await getDecimals(mint);
        const base = 10 ** decimals;
        const buySol = Number(process.env.BUY_AMOUNT_SOL ?? 0.1);
        const lamports = Math.round(buySol * 1e9);
        // Test liquidity
        const quote = await getJupiterQuote(SOL_MINT, mint, lamports, 1);
        if (!quote?.outAmount) {
            LOG.info({ mint }, "Not tradable / no quote");
            return;
        }
        const wallet = process.env.BACKEND_RECEIVER_WALLET ||
            process.env.SERVER_PUBLIC_KEY ||
            "";
        if (!wallet) {
            LOG.error("AUTO BUY FAILED → Wallet not configured");
            return;
        }
        const useReal = process.env.USE_REAL_SWAP === "true";
        const swap = useReal
            ? await executeJupiterSwap({
                inputMint: SOL_MINT,
                outputMint: mint,
                amount: lamports,
                userPublicKey: wallet,
                slippage: Number(process.env.DEFAULT_SLIPPAGE_PCT ?? 1),
            })
            : {
                success: true,
                simulated: true,
                signature: `sim-autoBuy-${Date.now()}`,
            };
        if (!swap.success) {
            LOG.error({ error: 'error' in swap ? swap.error : 'Unknown error' }, "Swap failed");
            return;
        }
        // Correct conversion: token amount in units
        const tokenQty = Number(quote.outAmount) / base;
        if (!tokenQty || tokenQty <= 0) {
            LOG.warn({ mint }, "Token conversion bad");
            return;
        }
        const pricePerToken = buySol / tokenQty; // SOL per token
        const trade = {
            id: crypto.randomUUID(),
            type: "buy",
            token: mint,
            inputMint: SOL_MINT,
            outputMint: mint,
            amountLamports: lamports,
            amountSol: buySol,
            price: pricePerToken,
            pnl: 0,
            wallet,
            simulated: !useReal,
            signature: swap.signature ?? null,
            timestamp: new Date(),
        };
        const saved = await dbService.addTrade(trade);
        io.emit("tradeFeed", {
            ...saved,
            auto: true,
            reason: "auto_buy",
        });
        LOG.info({ mint, price: pricePerToken, id: saved.id, simulated: saved.simulated }, "AutoBuy stored");
        return saved;
    }
    catch (err) {
        LOG.error({ err: err.message ?? err }, "AutoBuyer error");
        return null;
    }
}
//# sourceMappingURL=autoBuyer.service.js.map