// components/trading/TokenDiscovery.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { fetcher, formatNumber } from "@lib/utils";
import { useSocket } from "@hooks/useSocket";
import { Loader2 } from "lucide-react";

type TokenItem = {
  symbol: string;
  name?: string;
  mint?: string;
  price: number;
  pnl?: number;
  liquidity?: number;
  marketCap?: number;
};

export const TokenDiscovery: React.FC = () => {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage, connected } = useSocket();

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher("/api/tokens").catch(() => null);
      if (data?.tokens) setTokens(data.tokens);
    } catch (err) {
      console.warn("Failed to fetch tokens:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    const t = setInterval(loadTokens, 10_000); // every 10s
    return () => clearInterval(t);
  }, [loadTokens]);

  // Replace / update list with socket updates
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event === "tokenFeed") {
      const payload = lastMessage.payload;
      // payload.tokens expected: array of tokens
      if (Array.isArray(payload?.tokens)) {
        setTokens(payload.tokens);
      } else if (payload?.token) {
        // incremental update
        setTokens((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.symbol === payload.token.symbol || p.mint === payload.token.mint
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...payload.token };
            return updated;
          }
          return [payload.token, ...prev].slice(0, 100);
        });
      }
    }
  }, [lastMessage]);

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-primary">
          New Token Discovery
        </CardTitle>
        <div className="text-xs text-gray-400">
          {connected ? "Live" : "Offline"}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" />
            <div className="text-sm text-gray-400">Loading tokens...</div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-sm text-gray-400">No tokens found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-base-300">
                  <th className="py-2">Token</th>
                  <th className="py-2 text-right">Price (SOL)</th>
                  <th className="py-2 text-right">24h</th>
                  <th className="py-2 text-right">Liquidity</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr
                    key={t.symbol ?? t.mint}
                    className="border-b border-base-300 hover:bg-base-300/30 transition"
                  >
                    <td className="py-2 font-medium">
                      {t.name ?? t.symbol}{" "}
                      <span className="text-xs opacity-60">({t.symbol})</span>
                    </td>
                    <td className="py-2 text-right">{formatNumber(t.price)}</td>
                    <td
                      className={`py-2 text-right ${
                        typeof t.pnl === "number" && t.pnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {typeof t.pnl === "number" ? `${t.pnl}%` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {t.liquidity ? formatNumber(t.liquidity) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenDiscovery;
