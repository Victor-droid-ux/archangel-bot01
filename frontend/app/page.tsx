"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { Button } from "@components/ui/button";
import { useTrade } from "@hooks/useTrade";
import { useSocket } from "@hooks/useSocket";
import { useStats } from "@hooks/useStats";
import { useWallet } from "@hooks/useWallet";
import { useTradingConfigStore } from "@hooks/useConfig";
import toast from "react-hot-toast";
import { DashboardStats } from "@hooks/useStats";
import TokenDiscovery from "@components/trading/TokenDiscovery";
import PriceChart from "@components/trading/PriceChart";
import LiveTrades from "@components/trading/LiveTrades";
import PositionsPanel from "@components/trading/PositionsPanel";



export default function TradingPage() {
  const { connected, publicKey } = useWallet();
  const { executeTrade, loading } = useTrade();
  const { connected: socketConnected, lastMessage } = useSocket();
  const { stats, updateStats } = useStats();
  const { selectedToken } = useTradingConfigStore();

  const [autoTrading, setAutoTrading] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  // ⚡ Handle auto trading
  useEffect(() => {
    if (!autoTrading) return;

    const interval = setInterval(() => {
      const randomType = Math.random() > 0.5 ? "buy" : "sell";
      executeTrade(randomType, selectedToken || "BONK");
    }, 15000);

    return () => clearInterval(interval);
  }, [autoTrading, executeTrade, selectedToken]);

  // 📡 Listen for new tradeFeed socket events
  useEffect(() => {
    if (lastMessage && lastMessage.event === "tradeFeed") {
      const trade = lastMessage.payload;
      setTradeHistory((prev) => [trade, ...prev.slice(0, 19)]); // keep recent 20

      // update live pnl using functional updater to avoid stale deps
      const profitDelta =
        trade.type === "sell" ? Math.random() * 10 : -(Math.random() * 3);
      updateStats((prev) => ({
        totalProfit: prev.totalProfit + profitDelta,
        tradeVolume: prev.tradeVolume + trade.amount,
      }));

      toast.success(
        `${
          trade.simulated ? "🧪 Simulated" : "✅ Live"
        } ${trade.type.toUpperCase()} ${trade.amount} ${trade.token}`,
        { duration: 3000 }
      );
    }
  }, [lastMessage, updateStats]);

  const handleTrade = async (type: "buy" | "sell") => {
    if (!connected) {
      toast.error("Please connect your wallet first.");
      return;
    }
    await executeTrade(type, selectedToken || "BONK");
  };

  const toggleAutoTrade = () => {
    if (!connected) {
      toast.error("Connect your wallet before enabling auto trade.");
      return;
    }

    setAutoTrading((prev) => !prev);
    toast.success(
      !autoTrading ? "🤖 Auto-trade activated" : "⏹️ Auto-trade stopped."
    );
  };

  return (
    <motion.div
      className="space-y-8 container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Zap size={22} /> Trading Panel
        </h1>
        <span
          className={`text-sm ${
            socketConnected ? "text-green-400" : "text-red-400"
          }`}
        >
          Socket: {socketConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* ⚙️ Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          variant="secondary"
          onClick={() => handleTrade("buy")}
          disabled={loading || !connected}
          className="flex items-center justify-center gap-2 text-lg py-4"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <TrendingUp size={20} />
          )}
          {loading ? "Executing..." : `Buy ${selectedToken || "BONK"}`}
        </Button>

        <Button
          variant="danger"
          onClick={() => handleTrade("sell")}
          disabled={loading || !connected}
          className="flex items-center justify-center gap-2 text-lg py-4"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <TrendingDown size={20} />
          )}
          {loading ? "Executing..." : `Sell ${selectedToken || "BONK"}`}
        </Button>

        <Button
          variant="primary"
          onClick={toggleAutoTrade}
          disabled={!connected}
          className={`flex items-center justify-center gap-2 text-lg py-4 ${
            autoTrading ? "bg-green-700" : ""
          }`}
        >
          {autoTrading ? (
            <>
              <PauseCircle size={20} /> Stop Auto-Trade
            </>
          ) : (
            <>
              <PlayCircle size={20} /> Start Auto-Trade
            </>
          )}
        </Button>
      </div>

      {/* 💹 Live Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-base-200 p-4 rounded-xl">
        <p>
          Total Profit:{" "}
          <span className="text-green-400">
            ${(stats.totalProfit ?? 0).toFixed(2)}
          </span>
        </p>
        <p>
          Trade Volume:{" "}
          <span className="text-primary">
            {(stats.tradeVolume ?? 0).toFixed(2)} SOL
          </span>
        </p>
        <p>
          Open Trades:{" "}
          <span className="text-yellow-400">{stats.openTrades}</span>
        </p>
      </div>

      {/* 🕒 Trade History */}
      <div className="bg-base-200 rounded-xl p-4">
        <h3 className="text-primary font-semibold mb-2">Recent Trades</h3>
        <div className="h-64 overflow-y-auto text-sm font-mono space-y-2">
          {tradeHistory.length === 0 && (
            <p className="text-gray-500 italic">No trades yet...</p>
          )}
          {tradeHistory.map((t, idx) => (
            <div
              key={idx}
              className={`p-2 rounded ${
                t.type === "buy"
                  ? "bg-green-900/20 text-green-400"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              [{t.time}] {t.type.toUpperCase()} {t.amount} {t.token}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
