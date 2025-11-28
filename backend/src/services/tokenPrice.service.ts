// backend/src/services/tokenPrice.service.ts
import axios from "axios";
import { Server as SocketIOServer } from "socket.io";
import { getLogger } from "../utils/logger.js";

const log = getLogger("tokenPrice.service");

const SOL_MINT = "So11111111111111111111111111111111111111112";

export type JupiterToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
};

export type TokenWithPrice = JupiterToken & {
  price: number | null;
  pnl: number | null;
  liquidity: number | null;
  marketCap: number | null;
};

let tokenList: JupiterToken[] = [];
let tokenPriceMap = new Map<string, TokenWithPrice>();
let initialized = false;

const TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/jup-ag/token-list/main/src/tokens/mainnet.json";

const PRICE_URL = "https://price.jup.ag/v4/price";

/* -----------------------------------------------------------
   INIT — Fetch list and start price refresh
----------------------------------------------------------- */
export async function initTokenPriceService(io: SocketIOServer) {
  if (initialized) return;
  initialized = true;

  await loadTokenList();
  await refreshPricesAndBroadcast(io);

  setInterval(() => {
    refreshPricesAndBroadcast(io).catch((err) =>
      log.error("Periodic refresh failed", err.message)
    );
  }, 10_000);
}

export function getLatestTokens(): TokenWithPrice[] {
  return Array.from(tokenPriceMap.values());
}

/* -----------------------------------------------------------
   LOAD TOKEN LIST
----------------------------------------------------------- */
async function loadTokenList() {
  log.info("🌍 Fetching Jupiter token list...");

  try {
    const { data } = await axios.get("https://token.jup.ag/all-tokens", {
      timeout: 20000,
      headers: {
        "User-Agent": "ArchAngelBot/1.0",
      },
    });

    if (!data || typeof data !== "object") {
      throw new Error("Invalid token list structure");
    }

    // Convert object → array
    tokenList = Object.values(data).filter(
      (t: any) => t?.address && t?.symbol
    ) as JupiterToken[];

    log.info(`✅ Loaded ${tokenList.length} Jupiter tokens`);
  } catch (err: any) {
    log.error(
      { err: err.message },
      "❌ Unable to load Jupiter token list - enabling SAFE FALLBACK LIST"
    );

    // 👉 Minimal fallback: SOL + USDC only
    tokenList = [
      {
        address: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
      },
      {
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ];
  }
}

/* -----------------------------------------------------------
   PRICE REFRESH LOOP
----------------------------------------------------------- */
async function refreshPricesAndBroadcast(io: SocketIOServer) {
  try {
    const response = await axios.get(
      "https://public-api.birdeye.so/public/market/price?address=So11111111111111111111111111111111111111112",
      {
        headers: {
          "x-chain": "solana",
        },
      }
    );

    const solPrice = Number(response.data?.data?.value ?? 0);

    tokenPriceMap.set(SOL_MINT, {
      address: SOL_MINT,
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      price: solPrice,
      pnl: null,
      liquidity: null,
      marketCap: null,
    });

    io.emit("token_prices", { tokens: getLatestTokens() });
    log.info("📡 Broadcasted updated SOL price");
  } catch (err: any) {
    log.error("SOL price fetch failed:", err.message);
  }
}
