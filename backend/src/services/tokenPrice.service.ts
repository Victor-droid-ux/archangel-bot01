// backend/src/services/tokenPrice.service.ts
import axios from "axios";
import { Server as SocketIOServer } from "socket.io";
import { getLogger } from "../utils/logger.js";

const log = getLogger("tokenPrice.service");

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
let tokenPriceMap: Map<string, TokenWithPrice> = new Map();
let initialized = false;

/**
 * Initialize the token price service:
 *  - Load Jupiter token list once
 *  - Start 5s interval to refresh prices
 *  - Broadcast latest prices via Socket.IO
 */
export async function initTokenPriceService(io: SocketIOServer) {
  if (initialized) return;
  initialized = true;

  try {
    await loadTokenList();
    await refreshPricesAndBroadcast(io);
  } catch (err: any) {
    log.error("❌ Failed initial token list/price load:", err.message);
  }

  // Live updates every 5s
  setInterval(() => {
    refreshPricesAndBroadcast(io).catch((err) => {
      log.error("❌ Periodic price refresh failed:", err.message);
    });
  }, 5000);
}

/**
 * Public getter for latest token snapshot
 */
export function getLatestTokens(): TokenWithPrice[] {
  if (!tokenPriceMap.size && tokenList.length) {
    // Fallback: tokens without prices yet
    return tokenList.slice(0, 200).map((t) => ({
      ...t,
      price: null,
      pnl: null,
      liquidity: null,
      marketCap: null,
    }));
  }

  return Array.from(tokenPriceMap.values());
}

/* -------------------------------------------------------------
   Internal helpers
------------------------------------------------------------- */

async function loadTokenList() {
  const url = "https://tokens.jup.ag/tokens";
  log.info("🌐 Fetching Jupiter token list...");
  const { data } = await axios.get<JupiterToken[]>(url, { timeout: 20000 });

  tokenList = data.filter((t) => t.symbol && t.address);
  log.info(`✅ Loaded ${tokenList.length} Jupiter tokens`);
}

async function refreshPricesAndBroadcast(io: SocketIOServer) {
  if (!tokenList.length) {
    await loadTokenList();
  }

  const allMints = tokenList.map((t) => t.address);
  const chunkSize = 150; // keep query strings reasonable

  const newPriceMap = new Map<string, TokenWithPrice>();

  for (let i = 0; i < allMints.length; i += chunkSize) {
    const chunk = allMints.slice(i, i + chunkSize);
    const url = "https://price.jup.ag/v6/price?ids=" + chunk.join(",");

    try {
      const { data } = await axios.get(url, { timeout: 15000 });
      const priceData = data?.data || {};

      for (const mint of Object.keys(priceData)) {
        const p = priceData[mint];
        const meta = tokenList.find((t) => t.address === mint);
        if (!meta) continue;

        const merged: TokenWithPrice = {
          ...meta,
          price: Number(p.price),
          // Jupiter price API doesn't provide daily % change in v6 directly:
          pnl: null,
          liquidity: null,
          marketCap: null,
        };

        newPriceMap.set(mint, merged);
      }
    } catch (err: any) {
      log.error(
        `❌ Price chunk fetch failed (mints ${i}–${i + chunkSize}): ${
          err.message
        }`
      );
    }
  }

  if (!newPriceMap.size) {
    log.warn("⚠️ No prices updated in this cycle");
  } else {
    tokenPriceMap = newPriceMap;
    const snapshot = getLatestTokens();
    log.info(`📡 Broadcasting prices for ${snapshot.length} tokens`);
    io.emit("token_prices", { tokens: snapshot });
  }
}
