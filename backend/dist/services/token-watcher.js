// backend/src/services/token-watcher.ts
import { getLogger } from "../utils/logger.js";
import * as jupiter from "./jupiter.service.js";
import { autoBuyToken } from "./auto-trader.js";
import { ENV } from "../utils/env.js";
const log = getLogger("token-watcher");
// in-memory last seen token set (also persisted could be added)
const seen = new Set();
export async function startTokenWatcher(io) {
    const intervalMs = ENV.TOKEN_WATCH_INTERVAL_MS;
    log.info(`Starting token watcher (interval ${intervalMs}ms)`);
    // expose global io for other modules
    if (io)
        global.__IO = io;
    // initial load populate seen tokens (persisted option: db)
    try {
        const initial = await jupiter.fetchTokenPrices();
        for (const t of initial)
            seen.add(t.mint ?? t.address ?? t.token ?? t.symbol);
    }
    catch (e) {
        log.warn("token-watcher initial load failed: " + String(e));
    }
    async function tick() {
        try {
            const tokens = await jupiter.fetchTokenPrices();
            if (!tokens || !tokens.length)
                return;
            // build token feed and emit
            const filtered = tokens.filter((t) => {
                const mint = t.mint ?? t.address;
                // skip tokens we already processed
                if (!mint)
                    return false;
                // check thresholds
                const minMarketCap = Number(process.env.MIN_TOKEN_MARKETCAP_USD ??
                    ENV.MIN_TOKEN_MARKETCAP_USD ??
                    500000);
                const minLiquidity = Number(process.env.MIN_TOKEN_LIQUIDITY_USD ??
                    ENV.MIN_TOKEN_LIQUIDITY_USD ??
                    10000);
                if ((t.marketCap ?? 0) < minMarketCap)
                    return false;
                if ((t.liquidity ?? 0) < minLiquidity)
                    return false;
                return true;
            });
            // emit full token feed
            if (io && typeof io.emit === "function") {
                io.emit("tokenFeed", {
                    tokens: filtered,
                    timestamp: new Date().toISOString(),
                });
            }
            // detect & handle new tokens (not seen)
            for (const t of filtered) {
                const mint = t.mint ?? t.address;
                if (!mint)
                    continue;
                if (!seen.has(mint)) {
                    log.info(`New eligible token detected: ${t.symbol} (${mint}). triggering auto-buy if enabled.`);
                    seen.add(mint);
                    // Auto-buy only if enabled by ENV
                    if (ENV.ENABLE_AUTO_BUY) {
                        const buyRes = await autoBuyToken({
                            symbol: t.symbol,
                            mint,
                            price: Number(t.price ?? 0),
                        });
                        if (buyRes?.success) {
                            log.info(`Auto-buy succeeded for ${t.symbol}`);
                        }
                        else {
                            log.warn(`Auto-buy failed for ${t.symbol}: ${buyRes?.error}`);
                        }
                    }
                }
            }
        }
        catch (err) {
            log.error("token-watcher tick error: " + (err?.message ?? String(err)));
        }
    }
    // start interval
    const timer = setInterval(tick, intervalMs);
    // run once immediately
    tick();
    return () => clearInterval(timer);
}
//# sourceMappingURL=token-watcher.js.map