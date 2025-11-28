import dotenv from "dotenv";
dotenv.config();

/** Helper to enforce required env only when needed */
const required = (key: string): string => {
  const v = process.env[key];
  if (!v?.length) throw new Error(`❌ Missing env var: ${key}`);
  return v;
};

export const ENV = {
  PORT: process.env.PORT || "4000",

  /** RPC */
  SOLANA_RPC_URL: required("SOLANA_RPC_URL"),
  SOLANA_WS_URL: process.env.SOLANA_WS_URL || "",

  /** Jupiter API */
  JUPITER_QUOTE_URL: required("JUPITER_QUOTE_URL"),
  JUPITER_SWAP_URL: required("JUPITER_SWAP_URL"),

  /** Wallet + signing */
  USE_REAL_SWAP: process.env.USE_REAL_SWAP === "true",

  /** SECRET_KEY only required for real swaps */
  SECRET_KEY:
    process.env.SECRET_KEY && process.env.SECRET_KEY.trim().length > 0
      ? process.env.SECRET_KEY
      : undefined,

  /** Server Public Wallet */
  SERVER_PUBLIC_KEY: process.env.SERVER_PUBLIC_KEY || "",

  /** Safety checks */
  ensureKeys() {
    if (ENV.USE_REAL_SWAP) {
      if (!ENV.SECRET_KEY)
        throw new Error("❌ USE_REAL_SWAP=true but SECRET_KEY is missing");
      if (!ENV.SERVER_PUBLIC_KEY)
        throw new Error("❌ SERVER_PUBLIC_KEY is required for real swaps");
    }
  },

  /** Trading config */
  AUTO_BUY_AMOUNT_SOL: Number(process.env.AUTO_BUY_AMOUNT_SOL ?? 0.1),
  DEFAULT_SLIPPAGE_PCT: Number(process.env.DEFAULT_SLIPPAGE_PCT ?? 1),
  ENABLE_AUTO_BUY: process.env.ENABLE_AUTO_BUY === "true",
  TOKEN_WATCH_INTERVAL_MS: Number(process.env.TOKEN_WATCH_INTERVAL_MS ?? 10000),

  POSITION_MONITOR_INTERVAL_MS: Number(
    process.env.POSITION_MONITOR_INTERVAL_MS ?? 5000
  ),
  DEFAULT_TAKE_PROFIT_PCT: Number(process.env.DEFAULT_TAKE_PROFIT_PCT ?? 0.1),
  DEFAULT_STOP_LOSS_PCT: Number(process.env.DEFAULT_STOP_LOSS_PCT ?? 0.05),

  /** Token filtering */
  MIN_TOKEN_MARKETCAP_USD: Number(
    process.env.MIN_TOKEN_MARKETCAP_USD ?? 300000
  ),
  MIN_TOKEN_LIQUIDITY_USD: Number(process.env.MIN_TOKEN_LIQUIDITY_USD ?? 5000),

  /** Frontend CORS */
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};

// 🚀 Run validation now so backend fails early if required keys missing
ENV.ensureKeys();

export { required as requireEnv };
