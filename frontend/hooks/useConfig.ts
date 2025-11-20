// frontend/hooks/useConfig.ts
import { create } from "zustand";

interface TradingConfig {
  amount: number;
  slippage: number;
  takeProfit: number;
  stopLoss: number;
  autoTrade: boolean;
  selectedToken?: string;
  setSelectedToken: (token: string) => void;
  jupiterRoute: string;
  setAmount: (value: number) => void;
  setSlippage: (value: number) => void;
  setTakeProfit: (value: number) => void;
  setStopLoss: (value: number) => void;
  setAutoTrade: (value: boolean) => void;
  setJupiterRoute: (value: string) => void;
  saveConfig: () => void;
  loadConfig: () => void;
  syncConfig: () => Promise<void>;
  loadConfigFromAPI: () => Promise<void>;
}

export const useTradingConfigStore = create<TradingConfig>((set, get) => ({
  amount: 0.1,
  slippage: 2,
  takeProfit: 10,
  stopLoss: 5,
  autoTrade: false,
  jupiterRoute: "Jupiter",
  selectedToken: "BONK",

  setAmount: (value) => set({ amount: value }),
  setSlippage: (value) => set({ slippage: value }),
  setTakeProfit: (value) => set({ takeProfit: value }),
  setStopLoss: (value) => set({ stopLoss: value }),
  setAutoTrade: (value) => set({ autoTrade: value }),
  setJupiterRoute: (value) => set({ jupiterRoute: value }),
  setSelectedToken: (token: string) => set({ selectedToken: token }),

  saveConfig: () => {
    const config = get();
    localStorage.setItem("tradingConfig", JSON.stringify(config));
    console.log("✅ Trading config saved locally:", config);
  },

  loadConfig: () => {
    const saved = localStorage.getItem("tradingConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set(parsed);
        console.log("🔁 Loaded saved trading config:", parsed);
      } catch (err) {
        console.error("⚠️ Failed to parse saved config:", err);
      }
    }
  },

  // ✅ Send config to backend
  syncConfig: async () => {
    try {
      const config = get();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to sync config");
      console.log("☁️ Synced config to backend:", config);
    } catch (err) {
      console.error("❌ Config sync failed:", err);
    }
  },

  // ✅ Load config from backend
  loadConfigFromAPI: async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("No config found on backend");
      const data = await res.json();
      set(data);
      console.log("☁️ Loaded config from backend:", data);
    } catch (err) {
      console.error("⚠️ Failed to load config from backend:", err);
    }
  },
}));
