"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { Card } from "@components/ui/card";
import { useStats } from "@hooks/useStats";

interface TradeSummaryData {
  portfolioValue: number;
  totalProfit: number;
  openTrades: number;
}

export default function TradeSummary() {
  const { stats, loading } = useStats();
  const [data, setData] = useState<TradeSummaryData>({
    portfolioValue: 10000,
    totalProfit: 250,
    openTrades: 5,
  });

  // 🔁 Smoothly transition toward latest stats or dummy updates
  useEffect(() => {
    if (!loading && stats.portfolioValue) {
      setData({
        portfolioValue: stats.portfolioValue,
        totalProfit: stats.totalProfit,
        openTrades: stats.openTrades,
      });
    } else {
      // If stats are unavailable, simulate live fluctuations
      const interval = setInterval(() => {
        setData((prev) => {
          const profitChange = prev.totalProfit * (Math.random() * 0.06 - 0.03);
          const valueChange =
            prev.portfolioValue * (Math.random() * 0.02 - 0.01);
          const tradesChange = Math.floor(Math.random() * 10);

          return {
            portfolioValue: Math.max(9000, prev.portfolioValue + valueChange),
            totalProfit: prev.totalProfit + profitChange,
            openTrades: tradesChange,
          };
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [stats, loading]);

  const profitPositive = data.totalProfit >= 0;

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Portfolio Value */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Card className="bg-base-200 border border-base-300 p-4 text-center hover:bg-base-300 transition-all duration-200">
          <div className="flex justify-center items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
              Portfolio Value
            </h3>
          </div>
          <motion.p
            className="text-2xl font-bold text-white"
            key={data.portfolioValue}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            $
            <CountUp
              end={data.portfolioValue}
              duration={1.8}
              separator=","
              decimals={2}
            />
          </motion.p>
          <span className="text-xs text-base-content/60">
            Across all assets
          </span>
        </Card>
      </motion.div>

      {/* Total Profit */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        animate={{
          boxShadow: profitPositive
            ? "0px 0px 16px rgba(0,255,120,0.15)"
            : "0px 0px 16px rgba(255,60,60,0.15)",
        }}
        transition={{ duration: 0.4 }}
      >
        <Card
          className={`border p-4 text-center transition-all duration-200 ${
            profitPositive
              ? "bg-green-950/30 border-green-700/40"
              : "bg-red-950/30 border-red-700/40"
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            {profitPositive ? (
              <TrendingUp size={20} className="text-green-400" />
            ) : (
              <TrendingDown size={20} className="text-red-400" />
            )}
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Total Profit
            </h3>
          </div>

          <motion.p
            key={data.totalProfit}
            className={`text-2xl font-bold ${
              profitPositive ? "text-green-400" : "text-red-400"
            }`}
            animate={{
              textShadow: profitPositive
                ? "0 0 10px rgba(0,255,120,0.6)"
                : "0 0 10px rgba(255,80,80,0.4)",
            }}
            transition={{ duration: 0.5 }}
          >
            {profitPositive ? "+" : "-"}$
            <CountUp
              end={Math.abs(data.totalProfit)}
              duration={2}
              separator=","
              decimals={2}
            />
          </motion.p>

          <span className="text-xs text-base-content/60">
            {profitPositive ? "In the green 🚀" : "Needs attention 📉"}
          </span>
        </Card>
      </motion.div>

      {/* Open Trades */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Card className="bg-base-200 border border-base-300 p-4 text-center hover:bg-base-300 transition-all duration-200">
          <div className="flex justify-center items-center gap-2">
            <TrendingUp size={20} className="text-info" />
            <h3 className="text-sm font-semibold text-info uppercase tracking-wide">
              Open Trades
            </h3>
          </div>
          <motion.p
            key={data.openTrades}
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CountUp end={data.openTrades} duration={1.5} />
          </motion.p>
          <span className="text-xs text-base-content/60">Active positions</span>
        </Card>
      </motion.div>
    </motion.div>
  );
}

