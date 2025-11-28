// backend/src/services/monitor.service.ts
import { getJupiterQuote, executeJupiterSwap } from "./jupiter.service.js";
import dbService from "./db.service.js";
import { getLogger } from "../utils/logger.js";
import crypto from "crypto";
import { Connection, PublicKey } from "@solana/web3.js";
const log = getLogger("monitor");
/* ------------------------------------------------------------------
   CONFIG
------------------------------------------------------------------ */
const SOL_MINT = "So11111111111111111111111111111111111111112";
// Global default TP/SL (percent *as decimal*; 0.1 = 10%)
const DEFAULT_TP_PCT = Number(process.env.TP_PCT ?? 0.1);
const DEFAULT_SL_PCT = Number(process.env.SL_PCT ?? 0.02);
const SOLANA_RPC = process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_ENDPOINT ||
    "https://api.mainnet-beta.solana.com";
if (!SOLANA_RPC.startsWith("http")) {
    throw new Error("SOLANA_RPC_URL must start with http(s)://");
}
const commitment = process.env.SOLANA_COMMITMENT || "confirmed";
const connection = new Connection(SOLANA_RPC, commitment);
/* ------------------------------------------------------------------
   MINT DECIMALS CACHE
------------------------------------------------------------------ */
const mintDecimalsCache = new Map();
async function getMintDecimals(mint) {
    if (mintDecimalsCache.has(mint)) {
        return mintDecimalsCache.get(mint);
    }
    try {
        const info = await connection.getParsedAccountInfo(new PublicKey(mint));
        const parsed = info.value?.data;
        const decimals = parsed?.parsed?.info?.decimals ?? parsed?.info?.decimals ?? 9; // fallback
        const n = Number(decimals);
        const safeDecimals = Number.isFinite(n) ? n : 9;
        mintDecimalsCache.set(mint, safeDecimals);
        return safeDecimals;
    }
    catch (err) {
        log.warn({ mint, err: err?.message ?? String(err) }, "Failed to fetch mint decimals; using 9");
        mintDecimalsCache.set(mint, 9);
        return 9;
    }
}
/* ------------------------------------------------------------------
   CORE POSITION MONITOR
------------------------------------------------------------------ */
export function startPositionMonitor(io, opts) {
    const intervalMs = opts?.intervalMs ?? 5000;
    log.info({
        intervalMs,
        DEFAULT_TP_PCT,
        DEFAULT_SL_PCT,
    }, "Starting position monitor");
    const tick = async () => {
        try {
            const positions = await dbService.getPositions();
            for (const pos of positions) {
                try {
                    const tokenMint = pos.token;
                    if (!tokenMint)
                        continue;
                    if (!pos.netSol || pos.netSol <= 0)
                        continue;
                    // Per-position overrides if you ever add them to DB
                    const tpPct = typeof pos.tpPct === "number" ? pos.tpPct : DEFAULT_TP_PCT;
                    const slPct = typeof pos.slPct === "number" ? pos.slPct : DEFAULT_SL_PCT;
                    // Fetch decimals (cached)
                    const decimals = typeof pos.decimals === "number"
                        ? pos.decimals
                        : await getMintDecimals(tokenMint);
                    const base = 10 ** decimals;
                    // avgBuyPrice = SOL per token (approx). If missing, fall back to a tiny value.
                    const avgBuy = typeof pos.avgBuyPrice === "number" && pos.avgBuyPrice > 0
                        ? pos.avgBuyPrice
                        : Number(process.env.FALLBACK_AVG_PRICE_SOL ?? 0.000_001);
                    // Estimated token quantity = total SOL exposure / avg buy price
                    const estTokenQty = pos.netSol / avgBuy;
                    if (!Number.isFinite(estTokenQty) || estTokenQty <= 0) {
                        log.debug({ tokenMint, netSol: pos.netSol, avgBuy }, "Skipping position: invalid estTokenQty");
                        continue;
                    }
                    // Full position in token base units
                    const fullAmountBase = Math.floor(estTokenQty * base);
                    if (!fullAmountBase || fullAmountBase <= 0) {
                        log.debug({ tokenMint, estTokenQty, decimals }, "Skipping position: zero base amount");
                        continue;
                    }
                    // Use 10% of position (or a safe minimum) to probe price via Jupiter
                    const probeAmountBase = Math.max(Math.floor(fullAmountBase / 10), Math.floor(base / 1000) // e.g. 0.001 token
                    );
                    const quote = await getJupiterQuote(tokenMint, SOL_MINT, probeAmountBase, 1);
                    if (!quote?.outAmount)
                        continue;
                    const outSolForProbe = Number(quote.outAmount) / 1e9;
                    if (!outSolForProbe || outSolForProbe <= 0)
                        continue;
                    const probeTokenQty = probeAmountBase / base;
                    const currentPrice = outSolForProbe / probeTokenQty; // SOL per token
                    const pnlPercent = (currentPrice - avgBuy) / avgBuy;
                    // Check TP/SL triggers
                    if (pnlPercent >= tpPct || pnlPercent <= -slPct) {
                        log.info({
                            tokenMint,
                            pnlPercent,
                            avgBuy,
                            currentPrice,
                            tpPct,
                            slPct,
                        }, "Position hit TP/SL. Executing auto-sell.");
                        const useRealSwap = process.env.USE_REAL_SWAP === "true";
                        let swapRes;
                        if (useRealSwap) {
                            const backendWallet = process.env.BACKEND_RECEIVER_WALLET ||
                                process.env.SERVER_PUBLIC_KEY ||
                                "";
                            if (!backendWallet) {
                                log.error({ tokenMint }, "USE_REAL_SWAP=true but BACKEND_RECEIVER_WALLET / SERVER_PUBLIC_KEY is not set");
                                swapRes = {
                                    success: false,
                                    error: "Missing backend wallet for auto-sell",
                                };
                            }
                            else {
                                swapRes = await executeJupiterSwap({
                                    inputMint: tokenMint,
                                    outputMint: SOL_MINT,
                                    amount: fullAmountBase,
                                    userPublicKey: backendWallet,
                                    slippage: Number(process.env.DEFAULT_SLIPPAGE_PCT ?? 1),
                                });
                            }
                        }
                        else {
                            swapRes = {
                                success: true,
                                signature: `sim-sell-${Date.now()}`,
                            };
                        }
                        if (!swapRes.success) {
                            log.error({
                                tokenMint,
                                error: swapRes.error,
                            }, "Auto-sell swap failed");
                            continue;
                        }
                        // Build trade record in DB format
                        const tradeRecord = {
                            id: crypto.randomUUID(),
                            type: "sell",
                            token: tokenMint,
                            inputMint: tokenMint,
                            outputMint: SOL_MINT,
                            amountLamports: fullAmountBase, // token base units
                            price: currentPrice, // SOL per token
                            pnl: pnlPercent, // decimal (0.12 = +12%)
                            wallet: process.env.BACKEND_RECEIVER_WALLET ||
                                process.env.SERVER_PUBLIC_KEY ||
                                "",
                            simulated: !useRealSwap,
                            signature: swapRes.signature ?? null,
                            timestamp: new Date(),
                        };
                        // Persist and let db.service compute updated stats
                        const saved = await dbService.addTrade(tradeRecord);
                        // Emit rich tradeFeed event for frontend PnL
                        io.emit("tradeFeed", {
                            id: saved.id,
                            type: saved.type,
                            token: saved.token,
                            amount: saved.amountLamports,
                            amountSol: saved.amountSol,
                            price: saved.price,
                            pnl: saved.pnl, // decimal
                            pnlSol: saved.pnlSol,
                            simulated: saved.simulated,
                            signature: saved.signature,
                            timestamp: saved.timestamp,
                            auto: true,
                            reason: pnlPercent >= tpPct ? "take_profit" : "stop_loss",
                        });
                        log.info({
                            tokenMint,
                            id: saved.id,
                            reason: pnlPercent >= tpPct ? "TP" : "SL",
                        }, "Auto-sell executed & broadcast");
                    }
                }
                catch (innerErr) {
                    log.error({
                        err: innerErr?.message ?? String(innerErr),
                    }, "Monitor inner loop error");
                }
            }
        }
        catch (err) {
            log.error({ err: err?.message ?? String(err) }, "Position monitor tick failed");
        }
    };
    const timer = setInterval(tick, intervalMs);
    // Run one tick immediately on startup
    tick().catch((e) => log.warn({ err: e?.message ?? String(e) }, "Initial monitor tick error"));
    // Allow caller to stop monitor
    return () => clearInterval(timer);
}
//# sourceMappingURL=monitor.service.js.map