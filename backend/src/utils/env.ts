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
  SOLANA_WS_URL: process.env.SOLANA_WS_URL || "",

  // Jupiter API endpoints
  JUPITER_QUOTE_URL: requireEnv("JUPITER_QUOTE_URL"),
  JUPITER_SWAP_URL: requireEnv("JUPITER_SWAP_URL"),

  // Server secret key
  SECRET_KEY: requireEnv("SECRET_KEY"),

  // Feature flags
  USE_REAL_SWAP: process.env.USE_REAL_SWAP === "true",

  // Frontend CORS URL
  FRONTEND_URL: process.env.FRONTEND_URL || "*",
};

export { requireEnv };
