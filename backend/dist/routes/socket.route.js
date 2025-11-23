import { getLogger } from "../utils/logger.js";
import { getLatestTokens } from "../services/tokenPrice.service.js";
const logger = getLogger("socket");
export function registerSocketHandlers(io) {
    io.on("connection", (socket) => {
        logger.info("⚡ Socket connected: " + socket.id);
        // Send current token prices immediately on connect (best-effort)
        try {
            const snapshot = getLatestTokens();
            socket.emit("token_prices", { tokens: snapshot });
        }
        catch (err) {
            logger.warn({ err: err?.message }, "Could not load token snapshot on connect");
        }
        // Initial handshake
        socket.emit("update", {
            event: "connection",
            payload: { status: "connected" },
        });
        // Receive logs from client
        socket.on("tradeLog", (payload) => {
            io.emit("update", {
                event: "tradeLog",
                payload,
                timestamp: new Date().toISOString(),
            });
        });
        // Admin/backend triggers
        socket.on("trade:update", (payload) => {
            io.emit("update", { event: "trade:update", payload });
        });
        // Token discovery ISR realtime updates
        socket.on("tokenFeed", (payload) => {
            logger.info("🔄 Broadcasting tokenFeed");
            io.emit("tokenFeed", payload);
        });
        // Price updates (backend streaming)
        socket.on("priceUpdate", (payload) => {
            io.emit("priceUpdate", payload);
        });
        socket.on("disconnect", (reason) => {
            logger.warn(`❌ Socket disconnected: ${socket.id} (${reason})`);
        });
        socket.on("error", (err) => {
            logger.error("Socket error: " + (err?.message ?? String(err)));
        });
    });
}
//# sourceMappingURL=socket.route.js.map