// backend/src/services/tokenDiscovery.service.ts
import axios from "axios";
import { getLogger } from "../utils/logger.js";
const log = getLogger("tokenDiscovery");
const MIN_MARKETCAP = Number(process.env.MIN_MARKETCAP || 500000); // default 500k
export function startTokenDiscovery(io) {
    async function run() {
        try {
            const { data } = await axios.get("https://jupiter-quote-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/");
            const filtered = data
                .filter((t) => t.market_cap && t.market_cap >= MIN_MARKETCAP)
                .map((t) => ({
                symbol: t.symbol,
                name: t.name,
                mint: t.address,
                price: Number(t.price),
                pnl: Number(t.daily_price_change ?? 0),
                liquidity: t.liquidity ?? null,
                marketCap: t.market_cap ?? 0,
            }));
            // Emit live token list
            io.emit("tokenFeed", { tokens: filtered });
            log.info(`🌐 tokenFeed broadcasted: ${filtered.length} tokens`);
        }
        catch (err) {
            // err typed as any so we can safely access message; fall back to string representation
            log.error("Token discovery failed", err?.message ?? String(err));
        }
    }
    // Run immediately + every 10 seconds
    run();
    setInterval(run, 10_000);
}
//# sourceMappingURL=tokenDiscovery.service.js.map