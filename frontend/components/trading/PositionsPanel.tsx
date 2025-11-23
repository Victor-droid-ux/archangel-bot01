// components/trading/PositionsPanel.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { fetcher, formatNumber } from "@lib/utils";
import { useSocket } from "@hooks/useSocket";
import { Loader2 } from "lucide-react";

type Position = {
  token: string;
  netSol: number;
  avgBuyPrice?: number;
  currentPrice?: number;
  unrealizedPnlSol?: number;
  unrealizedPnlPct?: number;
};

export const PositionsPanel: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage, connected } = useSocket();

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher("/api/positions").catch(() => null);
      if (data) setPositions(data.positions ?? []);
    } catch (err) {
      console.warn("Failed loading positions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
    const t = setInterval(loadPositions, 15000); // refresh 15s
    return () => clearInterval(t);
  }, [loadPositions]);

  // on tradeFeed update, refresh positions (or update incrementally)
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event === "tradeFeed") {
      // simple approach: refetch positions
      loadPositions();
    }
  }, [lastMessage, loadPositions]);

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          Positions
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" />
            <div className="text-sm text-gray-400">Loading positions...</div>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-sm text-gray-400">No open positions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-base-300">
                  <th className="py-2">Token</th>
                  <th className="py-2 text-right">Net (SOL)</th>
                  <th className="py-2 text-right">Avg Buy</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Unrealized PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const pnlClass =
                    (p.unrealizedPnlPct ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400";
                  return (
                    <tr
                      key={p.token}
                      className="border-b border-base-300 hover:bg-base-300/30 transition"
                    >
                      <td className="py-2 font-medium">{p.token}</td>
                      <td className="py-2 text-right">
                        {formatNumber(p.netSol)}
                      </td>
                      <td className="py-2 text-right">
                        {p.avgBuyPrice ? formatNumber(p.avgBuyPrice) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {p.currentPrice ? formatNumber(p.currentPrice) : "—"}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${pnlClass}`}
                      >
                        {typeof p.unrealizedPnlPct === "number"
                          ? `${(p.unrealizedPnlPct * 100).toFixed(2)}%`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PositionsPanel;
