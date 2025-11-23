// components/trading/PriceChart.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useSocket } from "@hooks/useSocket";

type Point = { time: string; value: number };

export const PriceChart: React.FC<{
  tokenMintOrSymbol: string;
  width?: number;
  height?: number;
}> = ({ tokenMintOrSymbol }) => {
  const { lastMessage } = useSocket();
  const [data, setData] = useState<Point[]>([]);

  // Accept incoming priceUpdate messages: { token, price, timestamp }
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event === "priceUpdate") {
      const p = lastMessage.payload;
      if (p?.token === tokenMintOrSymbol || p?.mint === tokenMintOrSymbol) {
        const time = new Date(p.timestamp || Date.now()).toLocaleTimeString();
        setData((d) => [...d.slice(-119), { time, value: Number(p.price) }]);
      }
    }

    // also accept tokenFeed with per-token price arrays
    if (lastMessage.event === "tokenFeed") {
      const payload = lastMessage.payload;
      if (Array.isArray(payload.tokens)) {
        const match = payload.tokens.find(
          (t: any) =>
            t.symbol === tokenMintOrSymbol || t.mint === tokenMintOrSymbol
        );
        if (match) {
          const time = new Date().toLocaleTimeString();
          setData((d) => [
            ...d.slice(-119),
            { time, value: Number(match.price) },
          ]);
        }
      }
    }
  }, [lastMessage, tokenMintOrSymbol]);

  // seed with small placeholder if empty
  useEffect(() => {
    if (data.length === 0) {
      setData([{ time: new Date().toLocaleTimeString(), value: 0 }]);
    }
  }, [data.length]);

  return (
    <div className="bg-[#111] border border-gray-800 p-4 rounded-xl h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#555" minTickGap={20} />
          <YAxis stroke="#555" domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "none",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
