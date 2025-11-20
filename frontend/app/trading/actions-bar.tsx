"use client";

import React, { useState, useEffect } from "react";
import {
  PlayCircle,
  PauseCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@components/ui/button";
import { useWallet } from "@hooks/useWallet";
import { useTradingConfigStore } from "@hooks/useConfig";
import { useTrade } from "@hooks/useTrade";
import { useStats } from "@hooks/useStats";
import { useSocket } from "@hooks/useSocket";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function ActionsBar() {
  const { connected, publicKey } = useWallet();
  const { amount, slippage } = useTradingConfigStore();
  const { executeTrade } = useTrade();
  const { updateStats, stats } = useStats();
  const { sendMessage, connected: socketConnected } = useSocket();

  const [loading, setLoading] = useState(false);
  const [autoTrading, setAutoTrading] = useState(false);

  // Manual trade
  const handleTrade = React.useCallback(
    async (type: "buy" | "sell") => {
      if (!connected) {
        toast.error("Please connect your wallet first.");
        return;
      }

      try {
        setLoading(true);
        toast.loading(`${type === "buy" ? "Buying" : "Selling"} tokens...`, {
          id: "trade",
        });

        // 🪙 Execute trade via custom hook
        const result = await executeTrade(type, "BONK");

        toast.dismiss("trade");

        if (!result.success) throw new Error(result.message);

        toast.success(
          `${type === "buy" ? "✅ Bought" : "✅ Sold"} ${result.data.token} (${
            result.data.amount
          } SOL)`
        );

        // 📡 Emit live trade event to socket
        sendMessage("tradeLog", {
          type,
          token: result.data.token,
          amount: result.data.amount,
          time: new Date().toLocaleTimeString(),
        });

        // 📊 Update stats
        updateStats({
          totalProfit:
            stats.totalProfit +
            (type === "buy" ? -result.data.pnl : result.data.pnl),
        });
      } catch (err: any) {
        toast.dismiss("trade");
        toast.error("❌ Trade failed. Try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [connected, executeTrade, sendMessage, updateStats, stats]
  );

  // Auto trading simulation
  useEffect(() => {
    if (!autoTrading) return;

    const interval = setInterval(() => {
      const randomType = Math.random() > 0.5 ? "buy" : "sell";
      handleTrade(randomType);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoTrading, handleTrade]);

  const toggleAutoTrade = () => {
    if (!connected) {
      toast.error("Connect wallet before enabling auto-trade.");
      return;
    }

    setAutoTrading((prev) => !prev);
    toast.success(
      !autoTrading
        ? "🤖 Auto-trade activated — monitoring markets..."
        : "⏹️ Auto-trade stopped."
    );
  };

  return (
    <motion.div
      className="bg-base-200 rounded-xl p-5 flex flex-wrap justify-center md:justify-between items-center gap-4 border border-base-300 shadow-sm"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 text-primary">
        <Zap size={18} className="text-yellow-400" />
        <h2 className="text-lg font-semibold">Trading Controls</h2>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Socket status */}
        <span
          className={`text-xs font-mono ${
            socketConnected ? "text-green-400" : "text-red-400"
          }`}
        >
          Socket: {socketConnected ? "Connected" : "Offline"}
        </span>

        {/* Buy button */}
        <Button
          variant="secondary"
          onClick={() => handleTrade("buy")}
          disabled={!connected || loading}
          className="flex items-center gap-2 hover:scale-105 transition"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <TrendingUp size={18} />
          )}
          {loading ? "Executing..." : "Buy"}
        </Button>

        {/* Sell button */}
        <Button
          variant="danger"
          onClick={() => handleTrade("sell")}
          disabled={!connected || loading}
          className="flex items-center gap-2 hover:scale-105 transition"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <TrendingDown size={18} />
          )}
          {loading ? "Executing..." : "Sell"}
        </Button>

        {/* Auto-trade toggle */}
        <Button
          variant="primary"
          onClick={toggleAutoTrade}
          disabled={!connected}
          className={`flex items-center gap-2 hover:scale-105 transition ${
            autoTrading ? "bg-green-700" : ""
          }`}
        >
          {autoTrading ? (
            <>
              <PauseCircle size={18} /> Stop Auto-Trade
            </>
          ) : (
            <>
              <PlayCircle size={18} /> Start Auto-Trade
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
