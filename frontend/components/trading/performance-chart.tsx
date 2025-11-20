// frontend/components/trading/performance-chart.tsx
"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "09:00", pnl: 0 },
  { time: "09:30", pnl: 2.5 },
  { time: "10:00", pnl: 1.2 },
  { time: "10:30", pnl: 3.8 },
  { time: "11:00", pnl: 5.1 },
];

export default function PerformanceChart() {
  return (
    <div className="bg-base-200 rounded-xl p-4 shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-primary">
        Performance Chart
      </h2>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1d1f21",
              borderRadius: "8px",
              border: "1px solid #333",
            }}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#00c853"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
