"use client";

import React, { useEffect } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { fetcher, formatNumber } from "@lib/utils";
import { Loader2 } from "lucide-react";
import { useSocket } from "@hooks/useSocket";
import { useStats } from "@hooks/useStats";

export default function TokenTable() {
  const { data, error, isLoading, mutate } = useSWR("/api/tokens", fetcher, {
    refreshInterval: 8000, // auto-refresh every 8s
  });

  const { connected, lastMessage } = useSocket();
  const { updateStats, stats } = useStats();

  // 🔁 Real-time socket updates
  useEffect(() => {
    if (lastMessage?.event === "tokenUpdate") {
      // Update token data in real-time
      mutate();

      // Update dashboard stats dynamically
      if (lastMessage.payload?.pnlChange) {
        updateStats({
          totalProfit: stats.totalProfit + lastMessage.payload.pnlChange,
        });
      }
    }
  }, [lastMessage, mutate, updateStats, stats]);

  if (error)
    return (
      <Card className="bg-base-200 rounded-xl shadow p-4 text-center text-red-400">
        Failed to load token data.
      </Card>
    );

  if (isLoading)
    return (
      <Card className="bg-base-200 rounded-xl shadow p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
        <span className="ml-2 text-sm text-gray-400">Loading tokens...</span>
      </Card>
    );

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex justify-between items-center">
          <span>Active Tokens</span>
          <span
            className={`text-xs ${
              connected ? "text-green-400" : "text-gray-500"
            }`}
          >
            {connected ? "🟢 Live" : "⚫ Offline"}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-base-300">
              <th className="text-left py-2">Token</th>
              <th className="text-right py-2">Price (SOL)</th>
              <th className="text-right py-2">PNL (%)</th>
            </tr>
          </thead>
          <tbody>
            {data?.tokens?.map((token: any) => (
              <tr
                key={token.symbol}
                className="border-b border-base-300 hover:bg-base-300/30 transition"
              >
                <td className="font-medium text-left py-2">{token.symbol}</td>
                <td className="text-right py-2">{formatNumber(token.price)}</td>
                <td
                  className={`text-right py-2 ${
                    token.pnl > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {token.pnl > 0 ? `+${token.pnl}` : token.pnl}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
