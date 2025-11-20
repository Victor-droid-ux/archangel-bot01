"use client";

import React, { useEffect, useState } from "react";
import { Twitter, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Switch } from "@components/ui/switch";
import { Card } from "@components/ui/card";
import { fetcher } from "@lib/utils";

export const SocialFilter = () => {
  const [twitterEnabled, setTwitterEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [twitterStats, setTwitterStats] = useState<{
    count: number;
    sentiment: number;
  }>({
    count: 0,
    sentiment: 0,
  });

  useEffect(() => {
    if (!twitterEnabled) return;
    const interval = setInterval(async () => {
      try {
        // Temporary simulation — will later hit backend API: `/api/social/twitter`
        const count = Math.floor(Math.random() * 100);
        const sentiment = Math.floor(Math.random() * 100);
        setTwitterStats({ count, sentiment });
      } catch (err) {
        console.error("Error fetching Twitter data:", err);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [twitterEnabled]);

  return (
    <Card className="p-4 space-y-4 bg-base-200">
      <h2 className="text-lg font-semibold text-primary">Social Filters</h2>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Twitter size={18} className="text-sky-400" />
          <span>Twitter Mentions</span>
        </div>
        <Switch checked={twitterEnabled} onCheckedChange={setTwitterEnabled} />
      </div>

      {twitterEnabled && (
        <div className="pl-6 text-sm text-gray-300">
          <p>
            Mentions: <span className="font-bold">{twitterStats.count}</span>
          </p>
          <p className="flex items-center gap-1">
            Sentiment:{" "}
            <span
              className={`font-bold ${
                twitterStats.sentiment > 50 ? "text-green-400" : "text-red-400"
              }`}
            >
              {twitterStats.sentiment}%{" "}
              {twitterStats.sentiment > 50 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-400" />
          <span>Telegram Signals</span>
        </div>
        <Switch
          checked={telegramEnabled}
          onCheckedChange={setTelegramEnabled}
        />
      </div>
    </Card>
  );
};
