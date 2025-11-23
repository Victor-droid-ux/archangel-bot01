// components/trading/LiveTrades.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { TerminalSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@hooks/useSocket";

type TradeRow = {
  id: string;
  time: string;
  message: string;
  type: "buy" | "sell" | "info";
  pnl?: number;
  signature?: string | null;
};

export const LiveTrades: React.FC = () => {
  const { lastMessage, connected } = useSocket();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event !== "tradeFeed") return;

    const t = lastMessage.payload;
    const now = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const row: TradeRow = {
      id: t.id ?? crypto.randomUUID(),
      time: now,
      message:
        t.message ?? `${(t.type ?? "info").toUpperCase()} ${t.token ?? ""}`,
      type: t.type ?? "info",
      pnl: typeof t.pnl === "number" ? t.pnl : undefined,
      signature: t.signature ?? null,
    };
    setTrades((prev) => [row, ...prev].slice(0, 200));
  }, [lastMessage]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [trades]);

  return (
    <div
      className="bg-base-200 rounded-xl p-4 h-80 overflow-y-auto scrollbar-thin"
      ref={feedRef}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TerminalSquare size={18} /> Live Trades
        </h2>
        <div className="text-xs text-gray-400">
          {connected ? "Live" : "Offline"}
        </div>
      </div>

      <ul className="space-y-2 text-sm font-mono">
        <AnimatePresence>
          {trades.map((t) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className={`p-2 rounded ${
                t.type === "buy"
                  ? "bg-green-900/20 text-green-400"
                  : t.type === "sell"
                  ? "bg-red-900/20 text-red-400"
                  : "bg-slate-800/30 text-slate-300"
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <span className="opacity-60">{t.time} — </span>
                  {t.message}
                </div>
                <div className="text-right">
                  {typeof t.pnl === "number" ? (
                    <span
                      className={`${
                        t.pnl >= 0 ? "text-green-400" : "text-red-400"
                      } font-semibold`}
                    >
                      {t.pnl >= 0 ? "+" : ""}
                      {(t.pnl * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default LiveTrades;
