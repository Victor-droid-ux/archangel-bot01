// backend/src/routes/socket.route.ts
import { Server, Socket } from "socket.io";
import { getLogger } from "../utils/logger.js";
import { getLatestTokens } from "../services/tokenPrice.service.js";

const logger = getLogger("socket");

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    logger.info("Socket connected: " + socket.id);

    // Send current token prices immediately on connect
    const snapshot = getLatestTokens();
    socket.emit("token_prices", { tokens: snapshot });

    // Send initial handshake
    socket.emit("update", {
      event: "connection",
      payload: { status: "connected" },
    });

    // -----------------------------
    // Client -> Server trade logs
    // -----------------------------
    socket.on("tradeLog", (payload) => {
      logger.info("Received tradeLog from client");

      const data = {
        event: "tradeLog",
        payload,
        timestamp: new Date().toISOString(),
      };

      // broadcast to all clients
      io.emit("update", data);
    });

    // -----------------------------
    // Admin/server can emit trade:update
    // -----------------------------
    socket.on("trade:update", (payload) => {
      logger.warn("Received trade:update; broadcasting");
      io.emit("update", { event: "trade:update", payload });
    });

    // -----------------------------
    // Token feed: backend emits live token updates
    // -----------------------------
    socket.on("tokenFeed", (payload) => {
      logger.info("Received tokenFeed from backend");
      io.emit("tokenFeed", payload);
    });

    socket.on("disconnect", (reason) => {
      logger.warn(`Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on("error", (err) => {
      logger.error("Socket error: " + (err?.message ?? String(err)));
    });
  });
}
