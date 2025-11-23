// backend/src/services/priceStreamer.service.ts
import axios from "axios";
import { getLogger } from "../utils/logger.js";
const log = getLogger("priceStreamer");
export function startPriceStreamer(io, tokensToTrack = []) {
    async function run() {
        try {
            if (tokensToTrack.length === 0)
                return;
            const { data } = await axios.get("https://jupiter-quote-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/");
            tokensToTrack.forEach((symbol) => {
                const t = data.find((x) => x.symbol === symbol);
                if (!t)
                    return;
                io.emit("priceUpdate", {
                    token: t.symbol,
                    mint: t.address,
                    price: Number(t.price),
                    timestamp: new Date().toISOString(),
                });
            });
        }
        catch (err) {
            if (err instanceof Error) {
                log.error({ err: err.message }, "priceStreamer failed");
            }
            else {
                log.error({ err: String(err) }, "priceStreamer failed");
            }
        }
    }
    run();
    setInterval(run, 5000); // every 5s
}
//# sourceMappingURL=priceStreamer.service.js.map