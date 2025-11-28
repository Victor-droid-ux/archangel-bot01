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

type TokensResponse = {
  success: boolean;
  tokens: TokenItem[];
};

export const TokenDiscovery: React.FC = () => {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { lastMessage, connected } = useSocket();

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetcher<TokensResponse>("/api/tokens");
      if (res?.success && Array.isArray(res.tokens)) {
        setTokens(res.tokens);
      }
    } catch (err) {
      console.warn("❌ Failed to load tokens:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    const interval = setInterval(loadTokens, 10000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  // 🔄 Live updates from websocket
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.event !== "token_prices") return;
    const payload = lastMessage.payload;
    if (!Array.isArray(payload?.tokens)) return;

    setTokens(payload.tokens);
  }, [lastMessage]);

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-primary">
          New Token Discovery
        </CardTitle>

        <div
          className={`text-xs ${connected ? "text-green-400" : "text-red-400"}`}
        >
          {connected ? "Live" : "Offline"}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="animate-spin" />
            <span className="text-sm text-gray-400">Loading tokens...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">No tokens detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-base-300">
                  <th className="py-2">Token</th>
                  <th className="py-2 text-right">Price (SOL)</th>
                  <th className="py-2 text-right">Liquidity</th>
                </tr>
              </thead>

              <tbody>
                {tokens.map((t) => (
                  <tr
                    key={t.mint || t.symbol}
                    className="border-b border-base-300 hover:bg-base-300/20 transition"
                  >
                    <td className="py-2 font-medium">
                      {t.name ?? t.symbol}{" "}
                      <span className="text-xs opacity-60">({t.symbol})</span>
                    </td>

                    <td className="py-2 text-right">
                      {formatNumber(t.price ?? 0)}
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
