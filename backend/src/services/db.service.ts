// backend/src/services/db.service.ts

import { MongoClient, Db, Collection } from "mongodb";
import { getLogger } from "../utils/logger.js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();
const log = getLogger("db.service");

/* ---------------------------------------
   TYPE DEFINITIONS
---------------------------------------- */
export type TradeRecord = {
  id: string;
  type: "buy" | "sell";
  token: string;
  inputMint?: string;
  outputMint?: string;
  amountLamports: number;
  amountSol: number;
  price?: number;
  pnl?: number; // percent decimal ex: 0.02 means +2%
  pnlSol?: number; // absolute SOL PnL
  wallet?: string;
  simulated?: boolean;
  signature?: string | null;
  timestamp: Date;
};

export type StatsDoc = {
  _id?: string;
  portfolioValue: number;
  totalProfitSol: number;
  totalProfitPercent: number;
  openTrades: number;
  tradeVolumeSol: number;
  winRate: number;
  lastUpdated: Date;
};

/* ---------------------------------------
   CONNECTION
---------------------------------------- */
let client: MongoClient | null = null;
let db: Db | null = null;
let tradesCol: Collection<TradeRecord> | null = null;
let statsCol: Collection<StatsDoc> | null = null;

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_DB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "archangel";

async function connect() {
  if (!MONGO_URI) throw new Error("❌ MONGO_URI is missing.");

  if (client && db) return db;

  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  tradesCol = db.collection<TradeRecord>("trades");
  statsCol = db.collection<StatsDoc>("stats");

  // Indexes for speed
  await tradesCol.createIndex({ timestamp: -1 });
  await tradesCol.createIndex({ token: 1 });
  await statsCol.createIndex({ lastUpdated: -1 });

  // Initial stats doc (if missing)
  const existing = await statsCol.findOne({});
  if (!existing) {
    await statsCol.insertOne({
      portfolioValue: 0,
      totalProfitSol: 0,
      totalProfitPercent: 0,
      openTrades: 0,
      tradeVolumeSol: 0,
      winRate: 0,
      lastUpdated: new Date(),
    });
  }

  log.info(`Connected to MongoDB: ${DB_NAME}`);
  return db;
}

/* ---------------------------------------
   ADD TRADE + UPDATE STATS (ATOMIC)
---------------------------------------- */
async function addTrade(input: {
  id?: string;
  type: "buy" | "sell";
  token: string;
  inputMint?: string;
  outputMint?: string;
  amountLamports: number;
  price?: number;
  pnl?: number;
  wallet?: string;
  simulated?: boolean;
  signature?: string | null;
  timestamp?: Date | string;
}) {
  if (!db) await connect();

  try {
    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();

    const amountLamports = Number(input.amountLamports);
    const amountSol = amountLamports / 1e9;

    let pnlPercent = 0;
    if (typeof input.pnl === "number") {
      pnlPercent = Math.abs(input.pnl) <= 1 ? input.pnl : input.pnl / 100;
    }

    const pnlSol = amountSol * pnlPercent;

    const record: TradeRecord = {
      id: input.id || crypto.randomUUID(),
      type: input.type,
      token: input.token,
      amountLamports,
      amountSol,
      timestamp,
      ...(input.inputMint !== undefined && { inputMint: input.inputMint }),
      ...(input.outputMint !== undefined && { outputMint: input.outputMint }),
      ...(input.price !== undefined && { price: input.price }),
      ...(pnlPercent !== 0 && { pnl: pnlPercent }),
      ...(pnlSol !== 0 && { pnlSol }),
      ...(input.wallet !== undefined && { wallet: input.wallet }),
      ...(input.simulated !== undefined && { simulated: input.simulated }),
      ...(input.signature !== undefined && { signature: input.signature }),
    };

    await tradesCol!.insertOne(record);

    const deltaOpen = input.type === "buy" ? 1 : -1;
    const updatedStats = await statsCol!.findOneAndUpdate(
      {},
      {
        $inc: {
          tradeVolumeSol: amountSol,
          totalProfitSol: pnlSol,
          openTrades: deltaOpen,
        },
        $set: { lastUpdated: new Date() },
      },
      { returnDocument: "after" }
    );

    if (!updatedStats) throw new Error("Failed updating stats");

    const s = updatedStats;
    const totalProfitPercent =
      s.tradeVolumeSol > 0 ? (s.totalProfitSol / s.tradeVolumeSol) * 100 : 0;

    await statsCol!.updateOne(
      {},
      {
        $set: {
          totalProfitPercent,
          portfolioValue: (s.portfolioValue ?? 0) + pnlSol,
        },
      }
    );

    log.info(`Trade stored: ${record.type.toUpperCase()} ${record.token}`);
    return record;
  } catch (err: any) {
    log.error("addTrade failed:", err.message);
    throw err;
  }
}

/* ---------------------------------------
   GETTERS
---------------------------------------- */
async function getTrades(limit = 50) {
  if (!db) await connect();
  return tradesCol!.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
}

async function getStats() {
  if (!db) await connect();
  const stats = await statsCol!.findOne({});
  if (!stats) throw new Error("Stats doc missing.");
  return stats;
}

async function getPositions(): Promise<
  Array<{ token: string; netSol: number; avgBuyPrice?: number }>
> {
  if (!db) await connect();

  const agg = await tradesCol!
    .aggregate([
      {
        $group: {
          _id: "$token",
          buys: {
            $sum: { $cond: [{ $eq: ["$type", "buy"] }, "$amountLamports", 0] },
          },
          sells: {
            $sum: { $cond: [{ $eq: ["$type", "sell"] }, "$amountLamports", 0] },
          },
          avgBuyPrice: {
            $avg: { $cond: [{ $eq: ["$type", "buy"] }, "$price", null] },
          },
        },
      },
      {
        $project: {
          token: "$_id",
          _id: 0,
          netSol: { $divide: [{ $subtract: ["$buys", "$sells"] }, 1e9] },
          avgBuyPrice: 1,
        },
      },
    ])
    .toArray();

  return agg as Array<{ token: string; netSol: number; avgBuyPrice?: number }>;
}

async function updateStats(updates: Partial<StatsDoc>) {
  if (!db) await connect();
  const out = await statsCol!.findOneAndUpdate(
    {},
    { $set: { ...updates, lastUpdated: new Date() } },
    { returnDocument: "after" }
  );
  return out!;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    tradesCol = null;
    statsCol = null;
  }
}

export default {
  connect,
  addTrade,
  getTrades,
  getStats,
  getPositions,
  updateStats,
  close,
};
