// 🔐 Load environment variables FIRST before anything else
import dotenv from "dotenv";
import { initTokenPriceService } from "./services/tokenPrice.service.js";
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import tradeRoutes from "./routes/trade.route.js";
import statsRoutes from "./routes/stats.route.js";
import logger from "./utils/logger.js";
import { ENV } from "./utils/env.js";
import tokensRoutes from "./routes/tokens.route.js";
import { registerSocketHandlers } from "./routes/socket.route.js";
import dbService from "./services/db.service.js";
import { startPositionMonitor } from "./services/monitor.service.js";
import { startTokenWatcher } from "./services/token-watcher.js";
import { getLogger } from "./utils/logger.js";
import { startTokenDiscovery } from "./services/tokenDiscovery.service.js";
import { startPriceStreamer } from "./services/priceStreamer.service.js";
import positionsRoutes from "./routes/positions.route.js";
const log = getLogger("index");
// ⚡ Initialize DB connection BEFORE server startup
(async () => {
    try {
        await dbService.connect(); // connect to MongoDB
        console.log("✅ MongoDB connected");
    }
    catch (err) {
        console.error("❌ Failed to connect to DB:", err.message);
        process.exit(1); // Stop server if DB connection fails
    }
})();
const app = express();
// 🌍 CORS configuration
app.use(cors({
    origin: ENV.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
}));
app.use(express.json());
// 🟢 Health Check Route
app.get("/", (_, res) => {
    res.json({ message: "🚀 ArchAngel Backend Running" });
});
// 📌 API Routes
app.use("/api/trade", tradeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/tokens", tokensRoutes);
app.use("/api/positions", positionsRoutes);
// ⚙️ HTTP + WebSocket setup
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: ENV.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
    },
});
// Attach socket instance to express app
app.set("io", io);
app.locals.io = io;
// 🔌 Register WebSocket event handlers
registerSocketHandlers(io);
// 🔁 Start live token price streaming every 5 seconds
initTokenPriceService(io).catch((err) => {
    logger.error("❌ Failed to start token price service: " + err.message);
});
try {
    registerSocketHandlers(io);
}
catch (e) {
    log.error("Failed to register socket handlers: " + String(e));
}
global.__IO = io; // make io globally accessible
// start background services
startTokenWatcher(io).catch((err) => {
    logger.error("❌ Failed to start token watcher: " + String(err));
});
startTokenDiscovery(io);
startPositionMonitor(io).catch((err) => {
    logger.error("❌ Failed to start position monitor: " + String(err));
});
try {
    startPriceStreamer(io);
}
catch (err) {
    logger.error("❌ Failed to start price streamer: " + String(err));
}
// 🚨 Global Error Handler
app.use((err, _req, res, _next) => {
    logger.error("❌ " + (err.message || "Unhandled backend error"));
    res.status(err.status || 500).json({ success: false, message: err.message });
});
// 🚀 Start HTTP + Socket Server
server.listen(ENV.PORT, () => {
    logger.info(`✅ Backend online → http://localhost:${ENV.PORT}`);
});
//# sourceMappingURL=index.js.map