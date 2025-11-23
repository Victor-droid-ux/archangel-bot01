"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useSocket } from "@hooks/useSocket";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
export interface DashboardStats {
  portfolioValue: number;
  totalProfit: number;
  openTrades: number;
  tradeVolume: number;
  winRate: number;
}

export interface TradeHistory {
  id: string;
  type: "buy" | "sell";
  token: string;
  amount: number; // SOL or token amount (backend decides)
  price: number; // price in SOL or USD depending on backend
  pnl: number; // decimal fraction (e.g 0.03 = +3%)
  timestamp: string;
  signature?: string | null;
  simulated?: boolean;
}

/**
 * 🔥 useStats()
 * - Fetches REAL stats from backend
 * - Listens to REAL tradeFeed from backend socket
 * - Updates dashboard + trade history instantly
 */
export const useStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    portfolioValue: 0,
    totalProfit: 0,
    openTrades: 0,
    tradeVolume: 0,
    winRate: 0,
  });

  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const { lastMessage } = useSocket();

  /* ----------------------------------------------------
      1. Load initial stats from backend
  ---------------------------------------------------- */
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");

      const data = await res.json();

      setStats({
        portfolioValue: Number(data.portfolioValue || 0),
        totalProfit: Number(data.totalProfit || 0),
        openTrades: Number(data.openTrades || 0),
        tradeVolume: Number(data.tradeVolume || 0),
        winRate: Number(data.winRate || 0),
      });
    } catch (err) {
      console.error("❌ Failed to load /api/stats:", err);
      toast.error("Unable to load dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
      2. Manual stats updater
  ---------------------------------------------------- */
  type StatsUpdater =
    | Partial<DashboardStats>
    | ((prev: DashboardStats) => Partial<DashboardStats>);

  const updateStats = useCallback((updates: StatsUpdater) => {
    if (typeof updates === "function") {
      setStats((prev) => ({ ...prev, ...updates(prev) }));
    } else {
      setStats((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  /* ----------------------------------------------------
      3. Listen to REAL backend socket tradeFeed
  ---------------------------------------------------- */
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event !== "tradeFeed") return;

    const trade = lastMessage.payload;
    if (!trade) return;

    const {
      id,
      type,
      token,
      amount,
      price,
      pnl,
      signature,
      timestamp,
      simulated,
    } = trade;

    /* ------------------------------
       A. Append to trade history
    ------------------------------ */
    setTradeHistory((prev) => {
      const updated = [
        {
          id: id || crypto.randomUUID(),
          type,
          token,
          amount,
          price,
          pnl,
          signature,
          timestamp,
          simulated,
        },
        ...prev,
      ];
      return updated.slice(0, 50); // keep last 50
    });

    /* ------------------------------
       B. Update dashboard stats
    ------------------------------ */
    setStats((prev) => ({
      ...prev,
      totalProfit: prev.totalProfit + pnl, // pnl is decimal fraction (0.02 = 2%)
      tradeVolume: prev.tradeVolume + amount,
      openTrades: prev.openTrades + (type === "buy" ? 1 : 0),
      winRate:
        prev.tradeVolume + amount <= 0
          ? prev.winRate
          : ((tradeHistory.filter((t) => t.pnl > 0).length +
              (pnl > 0 ? 1 : 0)) /
              (tradeHistory.length + 1)) *
            100,
      portfolioValue: prev.portfolioValue + pnl * price,
    }));

    /* ------------------------------
       C. Toast Notification
    ------------------------------ */
    toast.success(
      `${
        simulated ? "🧪 Simulated" : "🔥 Live"
      } ${type.toUpperCase()} ${token} (${pnl >= 0 ? "+" : ""}${(
        pnl * 100
      ).toFixed(2)}%)`
    );
  }, [lastMessage, tradeHistory]);

  /* ----------------------------------------------------
      4. Fetch new stats every 10 seconds
  ---------------------------------------------------- */
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  /* ----------------------------------------------------
      EXPORT HOOK API
  ---------------------------------------------------- */
  return { stats, tradeHistory, loading, updateStats };
};
