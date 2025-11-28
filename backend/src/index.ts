// backend/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";

import tradeRoutes from "./routes/trade.route.js";
import statsRoutes from "./routes/stats.route.js";
import tokensRoutes from "./routes/tokens.route.js";
import positionsRoutes from "./routes/positions.route.js";

import { registerSocketHandlers } from "./routes/socket.route.js";

import dbService from "./services/db.service.js";
import { initTokenPriceService } from "./services/tokenPrice.service.js";
import { startTokenWatcher } from "./services/token-watcher.js";
import { startPositionMonitor } from "./services/monitor.service.js";
import { getLogger } from "./utils/logger.js";
import { ENV } from "./utils/env.js";

const log = getLogger("index");

(async () => {
  try {
    await dbService.connect();
    log.info("✅ MongoDB connected");
  } catch (err: any) {
    log.error("❌ Failed to connect to DB: " + String(err));
    process.exit(1);
  }

  const app = express();

  app.use(
    cors({
      origin: ENV.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/", (_, res) =>
    res.json({ message: "🚀 ArchAngel Backend Running" })
  );

  app.use("/api/trade", tradeRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/tokens", tokensRoutes);
  app.use("/api/positions", positionsRoutes);

  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: ENV.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);
  app.locals.io = io;
  (globalThis as any).__IO = io;

  registerSocketHandlers(io);

  // These are not Promises — just start them
  initTokenPriceService(io).catch((e: any) =>
    log.error("initTokenPriceService failed: " + String(e))
  );

  startTokenWatcher(io); // no catch
  startPositionMonitor(io); // no catch

  server.listen(ENV.PORT, () => {
    log.info(`⚡ Backend online → http://localhost:${ENV.PORT}`);
  });
})();
