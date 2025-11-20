"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { TerminalSquare, BarChart3 } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useSocket } from "@hooks/useSocket";
import { useStats } from "@hooks/useStats";
import { useTradingConfigStore } from "@hooks/useConfig";

interface TradeLog {
  id: string;
  time: string;
  message: string;
  type: "buy" | "sell" | "info";
  pnl?: number;
  amount?: number;
  signature?: string | null;
}

/* -----------------------------------------
   Animated Number
----------------------------------------- */
const AnimatedNumber = ({ value }: { value: number }) => {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (latest) => latest.toFixed(0));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
};

/* -----------------------------------------
   Animated Percent
----------------------------------------- */
const AnimatedPercent = ({ value }: { value: number }) => {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (latest) => latest.toFixed(1));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
};

/* -----------------------------------------
   MAIN LIVE FEED COMPONENT
----------------------------------------- */
export default function LiveFeed() {
  const { connected, lastMessage } = useSocket();
  const { stats, updateStats } = useStats();
  const { selectedToken } = useTradingConfigStore();

  const [logs, setLogs] = useState<TradeLog[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  /* AUTOSCROLL */
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  /* -----------------------------------------
     HANDLE SOCKET UPDATES
  ----------------------------------------- */
  useEffect(() => {
    if (!lastMessage) return;

    const { event, payload } = lastMessage;
    const now = new Date().toLocaleTimeString("en-GB", { hour12: false });

    const validEvents = ["tradeFeed", "tradeLog", "trade:update"];
    if (!validEvents.includes(event)) return;

    const type = (payload?.type as "buy" | "sell" | "info") ?? "info";

    const newLog: TradeLog = {
      id: crypto.randomUUID(),
      time: now,
      message: payload?.message ?? `${type.toUpperCase()} executed`,
      type,
      pnl: typeof payload?.pnl === "number" ? payload.pnl : undefined,
      amount: payload?.amount ?? undefined,
      signature: payload?.signature ?? null,
    };

    setLogs((prev) => [...prev, newLog].slice(-300));

    // Update dashboard live
    if (typeof newLog.pnl === "number") {
      updateStats({
        totalProfit: stats.totalProfit + newLog.pnl,
        tradeVolume: stats.tradeVolume + (newLog.amount ?? 0),
        openTrades: stats.openTrades + (type === "buy" ? 1 : 0),
      });
    }
  }, [lastMessage, updateStats, stats.openTrades, stats.totalProfit, stats.tradeVolume]);

  /* -----------------------------------------
     OFFLINE FALLBACK BEHAVIOR
  ----------------------------------------- */
  useEffect(() => {
    if (connected) return;

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-GB", { hour12: false });

      const offlineLog: TradeLog = {
        id: crypto.randomUUID(),
        time: now,
        message: "Awaiting live trading feed...",
        type: "info",
      };

      setLogs((prev) => [...prev, offlineLog].slice(-300));
    }, 7000);

    return () => clearInterval(interval);
  }, [connected]);

  /* -----------------------------------------
     SUMMARY STATS FROM LOGS
  ----------------------------------------- */
  const summary = useMemo(() => {
    const buys = logs.filter((l) => l.type === "buy").length;
    const sells = logs.filter((l) => l.type === "sell").length;

    const pnlValues = logs.map((l) => l.pnl ?? 0);
    const totalProfit = pnlValues.reduce((a, b) => a + b, 0);

    const winRate =
      pnlValues.length > 0
        ? (pnlValues.filter((p) => p > 0).length / pnlValues.length) * 100
        : 0;

    return { buys, sells, totalProfit, winRate };
  }, [logs]);

  const glowColor =
    summary.totalProfit > 0
      ? "rgba(34,197,94,0.35)"
      : summary.totalProfit < 0
      ? "rgba(239,68,68,0.35)"
      : "rgba(148,163,184,0.15)";

  /* -----------------------------------------
     RENDER UI
  ----------------------------------------- */
  return (
    <div className="bg-base-200 rounded-xl p-4 h-[26rem] flex flex-col border border-base-300 shadow-lg relative">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TerminalSquare size={18} /> Live Feed — {selectedToken ?? "ALL"}
        </h2>

        <div className="flex items-center gap-4 text-xs">
          <span
            className={`font-medium ${
              connected ? "text-green-400" : "text-red-400"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>

          <button
            onClick={() => setLogs([])}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* FEED */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm font-mono scrollbar-thin"
      >
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`p-2 rounded border border-transparent hover:border-base-300 transition ${
                log.type === "buy"
                  ? "bg-green-900/20 text-green-400"
                  : log.type === "sell"
                  ? "bg-red-900/20 text-red-400"
                  : "bg-slate-800/30 text-slate-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="opacity-60">{log.time} — </span>
                  <span>{log.message}</span>

                  {log.signature && (
                    <span className="ml-2 text-xs text-slate-400">
                      ({log.signature.slice(0, 8)}…)
                    </span>
                  )}
                </div>

                <div className="text-right min-w-[4rem]">
                  {typeof log.pnl === "number" ? (
                    <span
                      className={`font-semibold ${
                        log.pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {log.pnl >= 0 ? "+" : ""}
                      {log.pnl.toFixed(3)}%
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SUMMARY */}
      <motion.div
        className="border-t border-base-300 mt-3 pt-3 px-2 flex items-center justify-between text-xs font-mono text-slate-300 rounded-lg"
        animate={{ boxShadow: `0 0 12px ${glowColor}` }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="opacity-70" />
          <span className="font-semibold">Summary</span>
        </div>

        <div className="flex gap-4">
          <span className="text-green-400">
            Buys: <AnimatedNumber value={summary.buys} />
          </span>

          <span className="text-red-400">
            Sells: <AnimatedNumber value={summary.sells} />
          </span>

          <span>
            Win Rate: <AnimatedPercent value={summary.winRate} />%
          </span>

          <span
            className={
              summary.totalProfit >= 0 ? "text-green-400" : "text-red-400"
            }
          >
            P/L: <AnimatedPercent value={summary.totalProfit} />%
          </span>
        </div>
      </motion.div>
    </div>
  );
}
