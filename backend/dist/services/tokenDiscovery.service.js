import axios from "axios";
import { getLogger } from "../utils/logger.js";
import { registerAutoBuyCandidate } from "./autoBuyer.service.js";
import { JUPITER_QUOTE_URL } from "./jupiter.service.js";
const log = getLogger("tokenDiscovery");
export async function fetchJupiterTokenList() {
    // Attempt to hit jup token list or fallback to price endpoint
    try {
        const url = `${JUPITER_QUOTE_URL.replace(/\/$/, "")}/tokens`;
        const res = await axios.get(url, { timeout: 8000 });
        return res.data;
    }
    catch (err) {
        const msg = err && typeof err === "object" && "message" in err
            ? err.message
            : String(err);
        log.warn(`fetchJupiterTokenList failed, fallback to jup token list: ${msg}`);
        // fallback attempt to public token list hosted by jup-ag
        try {
            const res = await axios.get("https://raw.githubusercontent.com/jup-ag/token-list/main/src/tokens/mainnet.json", { timeout: 8000 });
            return res.data;
        }
        catch (e) {
            const emsg = e && typeof e === "object" && "message" in e
                ? e.message
                : String(e);
            log.error(`No token list available: ${emsg}`);
            return null;
        }
    }
}
/**
 * Start token watcher
 * - polls token list/prices every intervalMs
 * - emits tokenFeed via socket when list changes
 * - triggers auto-buy for tokens that meet criteria via autoBuyer.register
 */
export function startTokenWatcher(io, opts) {
    const intervalMs = opts?.intervalMs ?? 10_000;
    let currentMints = new Set();
    const MIN_MC_SOL = Number(process.env.MIN_MARKETCAP_SOL ?? 2); // 2 SOL by your config
    log.info(`Starting token watcher intervalMs=${intervalMs} MIN_MC_SOL=${MIN_MC_SOL}`);
    const tick = async () => {
        try {
            // 1) Get a token list
            const tokenList = await fetchJupiterTokenList();
            if (!tokenList) {
                log.warn("token list unavailable");
                return;
            }
            // tokenList shape varies: if array of tokens -> use it; else try tokens property
            const tokensArray = Array.isArray(tokenList)
                ? tokenList
                : tokenList.tokens || tokenList.data || [];
            // Build a lightweight token summary (limit to latest 500)
            const candidates = tokensArray
                .slice(0, 500)
                .map((t) => ({
                symbol: t.symbol,
                mint: t.address || t.mint || t.id,
                name: t.name,
                priceSol: t.price ? Number(t.price) : null,
                liquidity: t.liquidity ?? null,
                marketCapSol: t.market_cap ?? null,
            }))
                .filter((t) => t.mint);
            // Emit tokenFeed to frontends
            io.emit("tokenFeed", { tokens: candidates });
            // Check for newly discovered mints
            for (const tk of candidates) {
                if (!tk.mint)
                    continue;
                if (!currentMints.has(tk.mint)) {
                    // new mint discovered
                    currentMints.add(tk.mint);
                    // Quick checks: price present OR we can attempt a small quote test
                    const price = tk.priceSol ?? 0;
                    const mc = tk.marketCapSol ?? price; // fallback if marketCap missing
                    if (mc >= MIN_MC_SOL) {
                        // candidate meets min marketcap filter
                        log.info(`Candidate meets min MC mint=${tk.mint} symbol=${tk.symbol} marketCapSol=${mc}`);
                        // register candidate for auto-buy (autoBuyer will decide based on liquidity/quote)
                        registerAutoBuyCandidate(io, tk).catch((e) => {
                            const emsg = e && typeof e === "object" && "message" in e
                                ? e.message
                                : String(e);
                            log.error(`registerAutoBuyCandidate failed: ${emsg}`);
                        });
                    }
                    else {
                        // If marketCap missing or too low, attempt quote check to determine tradability.
                        registerAutoBuyCandidate(io, tk).catch((e) => {
                            const emsg = e && typeof e === "object" && "message" in e
                                ? e.message
                                : String(e);
                            log.warn(`candidate did not meet MC but attempted registration: ${emsg}`);
                        });
                    }
                }
            }
            // prune currentMints to keep bounded size
            if (currentMints.size > 2000) {
                // keep last 1000 arbitrary (not perfect but ok for demo)
                const keys = Array.from(currentMints).slice(-1000);
                currentMints = new Set(keys);
            }
        }
        catch (err) {
            const msg = err && typeof err === "object" && "message" in err
                ? err.message
                : String(err);
            log.error(`Token watcher tick failed: ${msg}`);
        }
    };
    const handle = setInterval(tick, intervalMs);
    // run immediately once:
    tick().catch((e) => {
        const msg = e && typeof e === "object" && "message" in e
            ? e.message
            : String(e);
        log.warn(`Initial token tick failed: ${msg}`);
    });
    return () => {
        clearInterval(handle);
        log.info("Token watcher stopped");
    };
}
export default { startTokenWatcher,
};
//# sourceMappingURL=tokenDiscovery.service.js.map