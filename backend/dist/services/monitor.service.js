// backend/src/services/monitor.service.ts
import { getLogger } from "../utils/logger.js";
import dbService from "./db.service.js";
import * as jupiter from "./jupiter.service.js";
import { autoSellPosition } from "./auto-trader.js";
import { ENV } from "../utils/env.js";
const log = getLogger("monitor");
// default thresholds (percent as decimal)
const DEFAULT_TP = Number(process.env.DEFAULT_TAKE_PROFIT_PCT ?? ENV.DEFAULT_TAKE_PROFIT_PCT ?? 0.1); // 10%
const DEFAULT_SL = Number(process.env.DEFAULT_STOP_LOSS_PCT ?? ENV.DEFAULT_STOP_LOSS_PCT ?? 0.05); // 5%
export async function startPositionMonitor(io) {
    const intervalMs = Number(process.env.POSITION_MONITOR_INTERVAL_MS ??
        ENV.POSITION_MONITOR_INTERVAL_MS ??
        5000);
    log.info(`Starting position monitor (interval ${intervalMs}ms)`);
    // run check loop
    async function check() {
        try {
            // derive positions using DB helper
            const positions = await dbService.getPositions(); // returns token, netSol, avgBuyPrice
            if (!positions || !positions.length)
                return;
            // fetch current prices from Jupiter
            const tokenPrices = await jupiter.fetchTokenPrices();
            const priceMap = new Map();
            for (const p of tokenPrices || [])
                priceMap.set(p.mint ?? p.address ?? p.symbol, Number(p.price ?? 0));
            for (const pos of positions) {
                try {
                    const mint = pos.token;
                    const netSol = Number(pos.netSol ?? 0);
                    if (netSol <= 0)
                        continue;
                    const avgBuy = Number(pos.avgBuyPrice ?? 0);
                    const currentPrice = priceMap.get(mint) ?? avgBuy;
                    const pnlPct = avgBuy > 0 ? (currentPrice - avgBuy) / avgBuy : 0;
                    // decide thresholds from DB or defaults
                    const TP = pos.takeProfitPct ?? DEFAULT_TP;
                    const SL = pos.stopLossPct ?? DEFAULT_SL;
                    if (pnlPct >= TP || pnlPct <= -SL) {
                        log.info(`Position ${mint} hit threshold. pnl=${(pnlPct * 100).toFixed(2)}% -> auto-sell.`);
                        // auto sell position
                        const sellRes = await autoSellPosition({
                            tokenMint: mint,
                            amountSol: netSol,
                            id: pos._id,
                            minAcceptPrice: currentPrice,
                        });
                        if (sellRes?.success) {
                            // update stats in DB or emit
                            if (io && typeof io.emit === "function") {
                                io.emit("tradeFeed", {
                                    id: sellRes?.data?.id ?? null,
                                    type: "sell",
                                    token: mint,
                                    amount: netSol,
                                    price: currentPrice,
                                    pnl: pnlPct,
                                    auto: true,
                                    reason: pnlPct >= TP ? "TP" : "SL",
                                    timestamp: new Date().toISOString(),
                                });
                            }
                        }
                        else {
                            const errInfo = sellRes?.data?.error ??
                                sellRes?.data ??
                                sellRes ??
                                "unknown error";
                            log.warn("Auto-sell failed for " + mint + " : " + (typeof errInfo === "string" ? errInfo : JSON.stringify(errInfo)));
                        }
                    }
                }
                catch (innerErr) {
                    log.error("Error checking position: " + (innerErr?.message ?? innerErr));
                }
            }
        }
        catch (err) {
            log.error("Position monitor error: " + (err?.message ?? String(err)));
        }
    }
    // schedule
    const timer = setInterval(check, intervalMs);
    // run immediately
    check();
    return () => clearInterval(timer);
}
//# sourceMappingURL=monitor.service.js.map