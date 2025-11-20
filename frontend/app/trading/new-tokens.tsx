"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { useSocket } from "@hooks/useSocket";
import { fetcher, formatNumber } from "@lib/utils";

interface Token {
  symbol: string;
  price: number;
  pnl?: number;
  liquidity?: number;
  marketCap?: number;
}

export const NewTokens = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const prevValues = useRef<Record<string, Token>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down" | null>>({});

  const { lastMessage } = useSocket();

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event !== "tokenFeed") return;

    const incoming: Token[] = lastMessage.payload?.tokens || [];
    if (!Array.isArray(incoming)) return;

    const flashes: Record<string, "up" | "down" | null> = {};

    for (const newTok of incoming) {
      const oldTok = prevValues.current[newTok.symbol];

      if (oldTok) {
        if (newTok.price > oldTok.price) flashes[newTok.symbol] = "up";
        else if (newTok.price < oldTok.price) flashes[newTok.symbol] = "down";
        else flashes[newTok.symbol] = null;
      } else {
        flashes[newTok.symbol] = null; // first load
      }

      prevValues.current[newTok.symbol] = newTok;
    }

    setFlash(flashes);
    setTimeout(() => setFlash({}), 700);

    setTokens(incoming);
  }, [lastMessage]);

  return (
    <Card className="bg-base-200 rounded-xl shadow p-4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
          <Sparkles size={18} />
          New Token Discovery
        </CardTitle>
      </CardHeader>

      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-base-300">
              <th className="pb-2">Token</th>
              <th className="pb-2">Price</th>
              <th className="pb-2">24h</th>
              <th className="pb-2">Liquidity</th>
              <th className="pb-2">Market Cap</th>
            </tr>
          </thead>

          <tbody>
            {tokens.map((t) => {
              const flashType = flash[t.symbol];

              return (
                <tr
                  key={t.symbol}
                  className="border-b border-base-300 hover:bg-base-300/30 transition"
                >
                  <td className="py-2 font-medium">{t.symbol}</td>

                  <td
                    className={`transition-all duration-500 ${
                      flashType === "up"
                        ? "bg-green-500/30"
                        : flashType === "down"
                        ? "bg-red-500/30"
                        : ""
                    }`}
                  >
                    {formatNumber(t.price)}
                  </td>

                  <td
                    className={`transition-all duration-500 ${
                      (t.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(t.pnl ?? 0) >= 0 ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                      {t.pnl?.toFixed(2)}%
                    </div>
                  </td>

                  <td>{formatNumber(t.liquidity || 0)}</td>
                  <td>{formatNumber(t.marketCap || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
