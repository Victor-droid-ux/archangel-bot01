import { getLogger } from "../utils/logger.js";
import { getLatestTokens } from "../services/tokenPrice.service.js";
import dbService from "../services/db.service.js";
const logger = getLogger("socket");
export function registerSocketHandlers(io) {
    io.on("connection", async (socket) => {
        logger.info(`⚡ Socket connected: ${socket.id}`);
        /** INITIAL TOKEN SNAPSHOT */
        try {
            const snapshot = getLatestTokens();
            socket.emit("tokenFeed", { tokens: snapshot });
        }
        catch (err) {
            logger.warn({ err: err?.message }, "Failed to send token snapshot on connect");
        }
        /** INITIAL STATS SNAPSHOT */
        try {
            const stats = await dbService.getStats();
            socket.emit("stats:update", stats);
        }
        catch (err) {
            logger.warn("Failed broadcasting initial stats");
        }
        /** CONFIRM CONNECTION */
        socket.emit("connection", { status: "connected" });
        /**
         * FRONTEND TRADE EVENTS → Broadcast to all
         * and trigger stats recalculation
         */
        socket.on("tradeLog", async (payload) => {
            logger.info("📥 tradeLog received → broadcasting");
            io.emit("tradeFeed", {
                ...payload,
                timestamp: new Date().toISOString(),
            });
            const stats = await dbService.getStats();
            io.emit("stats:update", stats);
        });
        socket.on("trade:update", async (payload) => {
            logger.info("📡 trade:update received");
            io.emit("tradeFeed", payload);
            const stats = await dbService.getStats();
            io.emit("stats:update", stats);
        });
        /**
         * TOKEN DISCOVERY LIVE UPDATES
         */
        socket.on("tokenFeed", (payload) => {
            logger.info("🔄 tokenFeed update");
            io.emit("tokenFeed", payload);
        });
        /**
         * PRICE STREAM PASS-THROUGH
         */
        socket.on("priceUpdate", (payload) => {
            io.emit("priceUpdate", payload);
        });
        /**
         * FRONTEND CAN REQUEST CURRENT STATS
         */
        socket.on("stats:request", async () => {
            const stats = await dbService.getStats();
            socket.emit("stats:update", stats);
        });
        /** DISCONNECT */
        socket.on("disconnect", (reason) => logger.warn(`❌ Disconnected: ${socket.id} (${reason})`));
        socket.on("error", (err) => logger.error("Socket error: " + (err?.message ?? String(err))));
    });
}
//# sourceMappingURL=socket.route.js.map