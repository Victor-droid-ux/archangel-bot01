"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card } from "@components/ui/card";
import TradingConfigPanel from "@components/trading/trading-config";
import LiveFeed from "@components/trading/live-feed";
import TokenTable from "@app/trading/token-table";
import StatsPanel from "@app/trading/stats-panel";
import ActionsBar from "@app/trading/actions-bar";
import { SocialFilter } from "@app/trading/social-filter";
import PerformanceChart from "@components/trading/performance-chart";
import { NewTokens } from "@app/trading/new-tokens";
import TradeSummary from "@components/trading/trade-summary"; // ✅ imported from ui version
import TradeHistory from "@components/trading/trade-history";

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function TradingDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      {/* ========================== HEADER ========================== */}
      <motion.div {...fadeIn(0.1)}>
        <h1 className="text-3xl font-bold text-primary mb-2">
          ArchAngel Trading Dashboard
        </h1>
        <p className="text-base-content/60">
          Track trades, monitor profit, and manage your Solana trading setup in
          real time.
        </p>
      </motion.div>

      {/* ========================== SUMMARY (Animated) ========================== */}
      <motion.div {...fadeIn(0.2)}>
        <TradeSummary />
      </motion.div>

      {/* ========================== GRID LAYOUT ========================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <motion.div {...fadeIn(0.3)} className="space-y-6">
          <Card className="p-4">
            <TradingConfigPanel />
          </Card>

          <Card className="p-4">
            <SocialFilter />
          </Card>
        </motion.div>

        {/* CENTER COLUMN */}
        <motion.div {...fadeIn(0.4)} className="space-y-6">
          <Card className="p-4">
            <StatsPanel />
          </Card>

          <Card className="p-4">
            <TokenTable />
          </Card>

          <Card className="p-4">
            <LiveFeed />
          </Card>
        </motion.div>

        {/* RIGHT COLUMN */}
        <motion.div {...fadeIn(0.5)} className="space-y-6">
          <Card className="p-4">
            <NewTokens />
          </Card>

          <Card className="p-4">
            <PerformanceChart />
          </Card>
          <Card className="p-4">
            <TradeHistory />
          </Card>
        </motion.div>
      </div>

      {/* ========================== MANUAL ACTIONS ========================== */}
      <motion.div {...fadeIn(0.6)}>
        <ActionsBar />
      </motion.div>
    </div>
  );
}
