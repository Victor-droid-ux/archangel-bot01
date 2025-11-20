"use client";

import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { fetcher, formatNumber } from "@lib/utils";
import { TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react";

export default function StatsPanel() {
  const { data, error, isLoading } = useSWR("/api/stats", fetcher, {
    refreshInterval: 6000, // refresh every 6 seconds
  });

  if (error)
    return (
      <Card className="bg-base-200 p-4 text-red-400 text-center">
        Failed to load stats
      </Card>
    );

  if (isLoading)
    return (
      <Card className="bg-base-200 p-4 text-gray-400 text-center">
        Loading stats...
      </Card>
    );

  const { pnl, totalTrades, winRate, balance } = data || {
    pnl: 0,
    totalTrades: 0,
    winRate: 0,
    balance: 0,
  };

  const pnlColor = pnl >= 0 ? "text-green-400" : "text-red-400";
  const pnlIcon =
    pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />;

  return (
    <Card className="bg-base-200 rounded-xl p-4 shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          Trading Stats
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="flex flex-col items-center">
          <div className={`flex items-center gap-2 ${pnlColor}`}>
            {pnlIcon}
            <span className="text-lg font-semibold">{pnl}%</span>
          </div>
          <p className="text-sm opacity-70">PnL</p>
        </div>

        <div className="flex flex-col items-center">
          <Activity className="text-blue-400" size={20} />
          <span className="text-lg font-semibold">{totalTrades}</span>
          <p className="text-sm opacity-70">Total Trades</p>
        </div>

        <div className="flex flex-col items-center">
          <TrendingUp className="text-yellow-400" size={20} />
          <span className="text-lg font-semibold">{winRate}%</span>
          <p className="text-sm opacity-70">Win Rate</p>
        </div>

        <div className="flex flex-col items-center">
          <Wallet className="text-purple-400" size={20} />
          <span className="text-lg font-semibold">
            {formatNumber(balance)} SOL
          </span>
          <p className="text-sm opacity-70">Balance</p>
        </div>
      </CardContent>
    </Card>
  );
}
