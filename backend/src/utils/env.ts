import dotenv from "dotenv";
dotenv.config();

// ✅ Helper: required backend-only env keys
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`❌ Missing required env variable: ${key}`);
  return value;
};

export const ENV = {
  PORT: process.env.PORT || "4000",

  // Solana RPC & WebSocket endpoints
  SOLANA_RPC_URL: requireEnv("SOLANA_RPC_URL"),
  NEXT_PUBLIC_SOLANA_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_ENDPOINT || "",

  SOLANA_WS_URL: process.env.SOLANA_WS_URL || "",

  // Jupiter API endpoints
  JUPITER_QUOTE_URL: requireEnv("JUPITER_QUOTE_URL"),
  NEXT_PUBLIC_JUPITER_ENDPOINT: process.env.NEXT_PUBLIC_JUPITER_ENDPOINT || "",
  JUPITER_SWAP_URL: requireEnv("JUPITER_SWAP_URL"),

  // Server secret key
  SECRET_KEY: requireEnv("SECRET_KEY"),
  NEXT_PUBLIC_SECRET_KEY: process.env.NEXT_PUBLIC_SECRET_KEY || "",

  // Feature flags
  USE_REAL_SWAP: process.env.USE_REAL_SWAP === "true",

  // Frontend CORS URL
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Default trading / monitor settings
  ENABLE_AUTO_BUY: process.env.ENABLE_AUTO_BUY === "true",

  AUTO_BUY_AMOUNT_SOL: Number(process.env.AUTO_BUY_AMOUNT_SOL ?? 0.1),

  DEFAULT_SLIPPAGE: Number(process.env.DEFAULT_SLIPPAGE ?? 1),

  TOKEN_WATCH_INTERVAL_MS: Number(
    process.env.TOKEN_WATCH_INTERVAL_MS ?? 10_000
  ),

  MIN_TOKEN_MARKETCAP_USD: Number(
    process.env.MIN_TOKEN_MARKETCAP_USD ?? 300000
  ),

  MIN_TOKEN_LIQUIDITY_USD: Number(process.env.MIN_TOKEN_LIQUIDITY_USD ?? 5000),

  POSITION_MONITOR_INTERVAL_MS: Number(
    process.env.POSITION_MONITOR_INTERVAL_MS ?? 5000
  ),

  DEFAULT_TAKE_PROFIT_PCT: Number(process.env.DEFAULT_TAKE_PROFIT_PCT ?? 0.1), // 10%

  DEFAULT_STOP_LOSS_PCT: Number(process.env.DEFAULT_STOP_LOSS_PCT ?? 0.05), // 5%

  // server's public key (optional)
  SERVER_PUBLIC_KEY: process.env.SERVER_PUBLIC_KEY ?? undefined,

  // Server wallet keys / overrides
  DEFAULT_SERVER_WALLET: process.env.DEFAULT_SERVER_WALLET ?? "",
};

export { requireEnv };
