// frontend/hooks/useTrade.ts
"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useWallet } from "@hooks/useWallet";
import { useTradingConfigStore } from "@hooks/useConfig";
import { useStats } from "@hooks/useStats";
import { useSocket } from "@hooks/useSocket";
import { fetcher } from "@lib/utils";

/**
 * useTrade
 * - posts to /api/trade
 * - falls back to a safe local simulation if backend is down
 * - emits a clear socket payload consumed by LiveFeed & useStats
 */
export const useTrade = () => {
  const { publicKey, connected } = useWallet();
  const {
    amount,
    slippage,
    takeProfit,
    stopLoss,
    autoTrade,
    jupiterRoute,
    selectedToken,
  } = useTradingConfigStore();
  const { stats, updateStats } = useStats();
  const { sendMessage } = useSocket();

  const [loading, setLoading] = useState(false);

  /**
   * type: "buy" | "sell"
   * token: the token mint OR symbol depending on how you wire it (recommended: pass mint)
   */
  const executeTrade = async (
    type: "buy" | "sell",
    tokenMintOrSymbol: string
  ) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    toast.loading(
      `${type === "buy" ? "Buying" : "Selling"} ${tokenMintOrSymbol}...`,
      {
        id: "trade-status",
      }
    );

    try {
      // Prefer explicit outputMint from param; fall back to selectedToken from config
      const outputMint = tokenMintOrSymbol || selectedToken;
      if (!outputMint) throw new Error("No token selected for swap.");

      // Send trade request to backend (fetcher adds content-type header)
      const res = await fetcher("/api/trade", {
        method: "POST",
        body: JSON.stringify({
          type,
          inputMint: "So11111111111111111111111111111111111111112", // base SOL
          outputMint,
          wallet: publicKey,
          amount, // amount in lamports or per your contract (keep consistent)
          slippage,
          takeProfit,
          stopLoss,
          autoTrade,
          jupiterRoute,
        }),
      }).catch(() => null);

      // If backend not available, simulate a consistent payload
      let payload: any;
      if (!res || !res.success) {
        console.warn("Backend unavailable — simulating trade result.");
        const simulatedPrice = parseFloat(
          (Math.random() * 0.002 + 0.0005).toFixed(6)
        );
        const simulatedPnl = parseFloat(
          (Math.random() * 0.05 - 0.02).toFixed(3)
        ); // decimal fraction, e.g. 0.02 => 2%
        payload = {
          simulated: true,
          token: outputMint,
          outputMint,
          amount: amount, // keep same unit as request (likely lamports)
          price: simulatedPrice,
          pnl: simulatedPnl,
          signature: `simulated-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Normalise backend response shape. Many backends return data.data or data
        const data = res.data ?? res;
        payload = {
          simulated: !!res.simulated || false,
          token: data.token ?? data.outputMint ?? outputMint,
          outputMint: data.outputMint ?? outputMint,
          amount: Number(data.amount ?? amount ?? 0),
          price: Number(data.price ?? data.outPrice ?? 0),
          // Accept both decimal PnL (0.02) or percent string "2.0" — normalize to decimal fraction
          pnl: normalizePnl(data.pnl),
          signature: data.signature ?? data.txSignature ?? null,
          timestamp: data.timestamp ?? new Date().toISOString(),
        };
      }

      // Emit well-structured socket message for LiveFeed
      sendMessage("tradeLog", {
        id: payload.signature ?? crypto.randomUUID(),
        type,
        token: payload.token,
        outputMint: payload.outputMint,
        amount: payload.amount,
        price: payload.price,
        pnl: payload.pnl,
        simulated: payload.simulated,
        signature: payload.signature,
        timestamp: payload.timestamp,
        // human-readable message for quick UI
        message: `${type === "buy" ? "Bought" : "Sold"} ${(
          payload.amount / 1e9
        ).toFixed(6)} ${payload.token} @ ${payload.price} SOL (${(
          payload.pnl * 100
        ).toFixed(2)}% PnL)`,
      });

      // Update local dashboard stats
      updateStats({
        totalProfit: stats.totalProfit + Number(payload.pnl ?? 0),
        openTrades: stats.openTrades + (type === "buy" ? 1 : 0), // increment buys
        tradeVolume: stats.tradeVolume + Number(payload.amount ?? 0) / 1e9,
      });

      toast.success(
        `${type === "buy" ? "✅ Bought" : "💸 Sold"} ${payload.token} ${
          payload.simulated ? "(simulated)" : ""
        }`,
        { id: "trade-status" }
      );

      console.log("✅ Trade result payload:", payload);
      return payload;
    } catch (err: any) {
      toast.error(`Trade failed: ${err?.message ?? err}`);
      console.error("executeTrade error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // helper: normalize PnL to decimal fraction (e.g., 2 -> 0.02, 0.02 -> 0.02)
  const normalizePnl = (raw: any): number => {
    if (raw === undefined || raw === null) return 0;
    // numeric value
    const n = Number(raw);
    if (Number.isNaN(n)) {
      // try to parse percent strings like "2.3%" or "+2.3%"
      const s = String(raw).replace("%", "").replace("+", "");
      const parsed = Number(s);
      if (!Number.isNaN(parsed))
        return parsed > 10 ? parsed / 100 : parsed / 100; // best-effort
      return 0;
    }
    // if n looks like percent (e.g., 2 or 2.0) and likely intended as percent (heuristic)
    if (Math.abs(n) > 1.5) return n / 100;
    return n;
  };

  return { executeTrade, loading };
};
