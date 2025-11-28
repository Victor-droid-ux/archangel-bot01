"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { useSocket } from "@hooks/useSocket";
import { fetcher, formatNumber } from "@lib/utils";

interface Token {
  symbol: string;
  price: number;
  pnl: number;
  liquidity?: number;
  marketCap?: number;
}

export const NewTokens = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const prev = useRef<Record<string, Token>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  const { lastMessage } = useSocket();

  // initial load
  useEffect(() => {
    fetcher("/api/tokens").then((res) => setTokens(res.tokens || []));
  }, []);

  // socket updates
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event !== "tokenFeed") return;

    const incoming = lastMessage.payload.tokens;
    if (!Array.isArray(incoming)) return;

    const flashMap: Record<string, "up" | "down"> = {};

    for (const t of incoming) {
      const prevTok = prev.current[t.symbol];

      if (prevTok) {
        if (t.price > prevTok.price) flashMap[t.symbol] = "up";
        else if (t.price < prevTok.price) flashMap[t.symbol] = "down";
      }

      prev.current[t.symbol] = t;
    }

    setFlash(flashMap);
    setTimeout(() => setFlash({}), 700);

    setTokens(incoming);
  }, [lastMessage]);

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex gap-2 text-primary">
          <Sparkles size={18} /> New Tokens
        </CardTitle>
      </CardHeader>

      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-300 text-gray-400">
              <th>Token</th>
              <th>Price</th>
              <th>24h</th>
              <th>Liquidity</th>
              <th>MCap</th>
            </tr>
          </thead>

          <tbody>
            {tokens.map((t) => (
              <tr key={t.symbol} className="border-b border-base-300">
                <td>{t.symbol}</td>

                <td
                  className={`${
                    flash[t.symbol] === "up"
                      ? "bg-green-500/30"
                      : flash[t.symbol] === "down"
                      ? "bg-red-500/30"
                      : ""
                  }`}
                >
                  {formatNumber(t.price)}
                </td>

                <td className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                  {(t.pnl >= 0 ? "+" : "") + t.pnl}%
                </td>

                <td>{formatNumber(t.liquidity || 0)}</td>
                <td>{formatNumber(t.marketCap || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
