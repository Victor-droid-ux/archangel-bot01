"use client";

import React, { useEffect } from "react";
import { Input } from "@components/ui/input";
import { Switch } from "@components/ui/switch";
import { Button } from "@components/ui/button";
import { toast } from "react-hot-toast";
import { useTradingConfigStore } from "@hooks/useConfig";

// Optional Jupiter routing presets
const JUPITER_ROUTES = [
  { id: "Jupiter", label: "Jupiter (Recommended)" },
  { id: "Raydium", label: "Raydium" },
  { id: "Orca", label: "Orca" },
];

export const TradingConfigPanel = () => {
  const {
    amount,
    slippage,
    takeProfit,
    stopLoss,
    autoTrade,
    jupiterRoute,
    setAmount,
    setSlippage,
    setTakeProfit,
    setStopLoss,
    setAutoTrade,
    setJupiterRoute,
    saveConfig,
    syncConfig,
    loadConfig,
    loadConfigFromAPI,
  } = useTradingConfigStore();

  // Load user config when component mounts
  useEffect(() => {
    loadConfig?.();
  }, [loadConfig]);

  const handleSave = async () => {
    try {
      saveConfig?.();
      syncConfig?.();
      toast.success("✅ Configuration saved & synced successfully!");
    } catch (error) {
      toast.error("❌ Failed to save configuration.");
      console.error(error);
    }
  };

  const handleLoadCloud = async () => {
    try {
      await loadConfigFromAPI?.();
      toast.success("☁️ Config loaded from cloud!");
    } catch {
      toast.error("⚠️ Failed to load from cloud.");
    }
  };

  return (
    <div className="bg-base-200 border border-base-300 rounded-xl p-6 space-y-4 shadow-md">
      <h2 className="text-xl font-semibold text-primary mb-2">
        Trading Configuration
      </h2>

      {/* Trade Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Trade Amount (SOL)</label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Enter trade amount"
        />
      </div>

      {/* Slippage */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Slippage (%)</label>
        <Input
          type="number"
          min={0.1}
          step={0.1}
          value={slippage}
          onChange={(e) => setSlippage(Number(e.target.value))}
          placeholder="2"
        />
      </div>

      {/* Take Profit */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Take Profit (%)</label>
        <Input
          type="number"
          min={0}
          value={takeProfit}
          onChange={(e) => setTakeProfit(Number(e.target.value))}
          placeholder="10"
        />
      </div>

      {/* Stop Loss */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Stop Loss (%)</label>
        <Input
          type="number"
          min={0}
          value={stopLoss}
          onChange={(e) => setStopLoss(Number(e.target.value))}
          placeholder="5"
        />
      </div>

      {/* Jupiter Route */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">DEX Route</label>
        <select
          value={jupiterRoute}
          onChange={(e) => setJupiterRoute(e.target.value)}
          className="select select-bordered w-full"
        >
          {JUPITER_ROUTES.map((route) => (
            <option key={route.id} value={route.id}>
              {route.label}
            </option>
          ))}
        </select>
      </div>

      {/* Auto Trade */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium">Enable Auto Trade</span>
        <Switch checked={autoTrade} onCheckedChange={setAutoTrade} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-4">
        <Button onClick={handleSave} className="w-full">
          Save & Sync Configuration
        </Button>

        <Button variant="outline" onClick={handleLoadCloud} className="w-full">
          Load Config from Cloud
        </Button>
      </div>
    </div>
  );
};

export default TradingConfigPanel;
