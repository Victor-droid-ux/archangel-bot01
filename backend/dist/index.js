// 🔐 Load environment variables FIRST before anything else
import dotenv from "dotenv";
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