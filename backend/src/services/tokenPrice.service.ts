// backend/src/services/tokenPrice.service.ts
import axios from "axios";
import { Server as SocketIOServer } from "socket.io";
import { getLogger } from "../utils/logger.js";
import { fetchTokenList } from "./jupiter.service.js";

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

const TOKENS_URL =
  "https://raw.githubusercontent.com/jup-ag/token-list/main/src/tokens/mainnet.json";

const PRICE_URL =
  "https://jupiter-quote-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/";

/**
 * Initialize the token price service
 */
export async function initTokenPriceService(io: SocketIOServer) {
  if (initialized) return;
  initialized = true;

  try {
    await loadTokenList();
    await refreshPricesAndBroadcast(io);
  } catch (err: any) {
    log.error(
      {
        status: err.response?.status,
        data: err.response?.data,
        url: TOKENS_URL,
      },
      `❌ Failed initial token list/price load: ${err.message}`
    );
  }

  // Choose a refresh interval depending on how many tokens we loaded.
  // If we have a large token list, keep a fast refresh cadence. If we
  // fell back to a small list (or none), back off to reduce log spam when
  // external endpoints are failing.
  const refreshIntervalMs = tokenList.length > 50 ? 5000 : 30000;

  setInterval(() => {
    refreshPricesAndBroadcast(io).catch((err) => {
      log.error(
        {
          status: err.response?.status,
          data: err.response?.data,
        },
        `❌ Periodic price refresh failed: ${err.message}`
      );
    });
  }, refreshIntervalMs);
}

/**
 * Public getter for latest data
 */
export function getLatestTokens(): TokenWithPrice[] {
  return Array.from(tokenPriceMap.values());
}

/* ------------------------------------------------------------------
   Internal data loaders
------------------------------------------------------------------ */

async function loadTokenList() {
  log.info("🌐 Fetching Jupiter token list...");
  try {
    const { data } = await axios.get<JupiterToken[]>(TOKENS_URL, {
      timeout: 20000,
    });

    tokenList = data.filter((t) => t.symbol && t.address);
    log.info(`✅ Loaded ${tokenList.length} Jupiter tokens`);
  } catch (err: any) {
    log.warn(
      {
        status: err.response?.status,
        data: err.response?.data,
        url: TOKENS_URL,
      },
      `⚠ Failed to fetch Jupiter token list: ${err.message}. Attempting fallback.`
    );

    // Fallback: attempt to build a minimal token list from the Jupiter price endpoint
    try {
      const prices = await fetchTokenList();
      if (Array.isArray(prices) && prices.length > 0) {
        tokenList = prices
          .filter((p: any) => p.mint && p.symbol)
          .map(
            (p: any) =>
              ({
                address: p.mint,
                symbol: p.symbol,
                name: p.symbol,
                decimals: 9,
              } as JupiterToken)
          );
        log.info(
          `✅ Built token list from Jupiter price endpoint (${tokenList.length} tokens)`
        );
        return;
      }
    } catch (err2: any) {
      log.error(
        { err: err2?.message },
        "❌ Fallback via fetchTokenPrices failed"
      );
    }

    // If fallback failed, rethrow original error so caller can handle it
    throw err;
  }
}

async function refreshPricesAndBroadcast(io: SocketIOServer) {
  if (!tokenList.length) await loadTokenList();

  const allMints = tokenList.map((t) => t.address);
  const chunkSize = 100;

  const newPriceMap = new Map<string, TokenWithPrice>();

  for (let i = 0; i < allMints.length; i += chunkSize) {
    const chunk = allMints.slice(i, i + chunkSize);
    const reqUrl = `${PRICE_URL}?ids=${chunk.join(",")}`;

    try {
      const { data } = await axios.get(reqUrl, { timeout: 15000 });
      const priceData = data?.data;

      if (!priceData) {
        log.warn(`⚠ No price data from chunk ${i}-${i + chunkSize}`);
        continue;
      }

      for (const mint of Object.keys(priceData)) {
        const p = priceData[mint];
        const meta = tokenList.find((t) => t.address === mint);
        if (!meta) continue;

        newPriceMap.set(mint, {
          ...meta,
          price: p.price ? Number(p.price) : null,
          pnl: null,
          liquidity: null,
          marketCap: null,
        });
      }
    } catch (err: any) {
      log.error(
        {
          status: err.response?.status,
          data: err.response?.data,
          url: reqUrl,
        },
        `❌ Price chunk fetch failed (mints ${i}-${i + chunkSize}): ${
          err.message
        }`
      );
    }
  }

  if (newPriceMap.size > 0) {
    tokenPriceMap = newPriceMap;
    const snapshot = getLatestTokens();
    log.info(`📡 Broadcasting ${snapshot.length} token prices`);
    io.emit("token_prices", { tokens: snapshot });
  } else {
    log.warn("⚠ No prices updated this cycle");
  }
}
