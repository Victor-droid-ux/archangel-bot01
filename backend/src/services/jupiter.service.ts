import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
import {
  Connection,
  Commitment,
  Keypair,
  VersionedTransaction,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getLogger } from "../utils/logger.js";

dotenv.config();
const log = getLogger("jupiter.service");

/* ----------------------------- TYPES ----------------------------- */
export type JupiterSwapResponse =
  | {
      success: true;
      signature: string;
      raw?: any;
      simulated?: boolean;
      error?: never;
    }
  | {
      success: false;
      error: string;
      signature?: never;
      raw?: never;
      simulated?: never;
    };

/* ----------------------------- CONFIG ----------------------------- */
const SOLANA_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_ENDPOINT ||
  "https://api.mainnet-beta.solana.com";

if (!SOLANA_RPC.startsWith("http")) {
  throw new Error("SOLANA_RPC_URL must start with http:// or https://");
}

export const JUPITER_QUOTE_URL =
  process.env.JUPITER_QUOTE_URL ||
  process.env.NEXT_PUBLIC_JUPITER_ENDPOINT ||
  process.env.JUPITER_API_URL ||
  "https://quote-api.jup.ag/v6";

const JUPITER_SWAP_URL =
  process.env.JUPITER_SWAP_URL ||
  process.env.JUPITER_SWAP_API_URL ||
  process.env.JUPITER_API_KEY ||
  process.env.JUPITER_SWAP ||
  "https://jupiter-swap-api.quiknode.pro/";

/* ----------------------------- CONNECTION ----------------------------- */
const commitment: Commitment =
  (process.env.SOLANA_COMMITMENT as Commitment) || "confirmed";

const connection = new Connection(SOLANA_RPC, commitment);

/* ----------------------------- AXIOS INSTANCES ----------------------------- */
const quoteClient: AxiosInstance = axios.create({
  baseURL: JUPITER_QUOTE_URL,
  timeout: 10_000,
});

const swapClient: AxiosInstance = axios.create({
  baseURL: JUPITER_SWAP_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    ...(process.env.JUPITER_API_KEY
      ? { "x-api-key": process.env.JUPITER_API_KEY }
      : {}),
  },
});

/* ----------------------------- HELPERS ----------------------------- */
async function retry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 300) {
  let lastErr: any;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/** Normalizes quote responses from different Jupiter endpoints/versions */
function parseQuoteResponse(raw: any) {
  if (!raw) return null;
  // v6-like: {inAmount, outAmount, priceImpact, routePlan,...}
  if (typeof raw.outAmount === "number" || typeof raw.outAmount === "string") {
    return raw;
  }
  // some APIs wrap in data or quotes arrays
  if (raw.data && Array.isArray(raw.data) && raw.data.length > 0)
    return raw.data[0];
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  if (raw.quoteResponse) return raw.quoteResponse;
  return raw;
}

/* ----------------------------- PUBLIC API ----------------------------- */

/**
 * Fetch best Jupiter quote for a swap.
 * returns parsed quote or null on failure.
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippagePercent = 1
) {
  try {
    const res = await retry(() =>
      quoteClient.get("/quote", {
        params: {
          inputMint,
          outputMint,
          amount: amountLamports,
          slippageBps: Math.round(slippagePercent * 100),
        },
      })
    );

    const parsed = parseQuoteResponse(
      res.data || res.data?.data || res.data?.quote
    );
    if (!parsed) {
      log.warn(
        {
          inputMint,
          outputMint,
          amountLamports,
        },
        "Unable to parse Jupiter quote response"
      );
      return null;
    }

    // For convenience attach numeric outAmount / inAmount if strings
    if (parsed.outAmount && typeof parsed.outAmount === "string") {
      parsed.outAmount = Number(parsed.outAmount);
    }
    if (parsed.inAmount && typeof parsed.inAmount === "string") {
      parsed.inAmount = Number(parsed.inAmount);
    }

    log.info(
      {
        inputMint,
        outputMint,
        in: parsed.inAmount ?? amountLamports,
        out: parsed.outAmount ?? null,
      },
      "Jupiter quote fetched"
    );

    return parsed;
  } catch (err: any) {
    log.error("getJupiterQuote failed", err?.message ?? err);
    return null;
  }
}

/**
 * Request a swap transaction from Jupiter and execute it on-chain.
 * - quoteResponse: the object returned from getJupiterQuote (optional)
 * - userPublicKey: the wallet receiving the output tokens
 *
 * Returns { success, signature, raw } on success or { success: false, error } on failure.
 */
// 🔥 Safe execute with simulation fallback
export async function executeJupiterSwap(opts: {
  quoteResponse?: any;
  inputMint: string;
  outputMint: string;
  amount: number;
  userPublicKey: string;
  slippage?: number;
}): Promise<JupiterSwapResponse> {
  try {
    // Global kill-switch: simulation mode only unless explicitly enabled
    const useReal = process.env.USE_REAL_SWAP === "true";
    if (!useReal) {
      return {
        success: true,
        simulated: true,
        signature: `simulated-${Date.now()}`,
      };
    }

    const secretRaw = process.env.SECRET_KEY;
    if (!secretRaw) {
      throw new Error("SECRET_KEY missing (required for real swaps).");
    }

    const secretArray: number[] = JSON.parse(secretRaw);
    const signer = Keypair.fromSecretKey(Uint8Array.from(secretArray));

    const quoteResp =
      opts.quoteResponse ??
      (await getJupiterQuote(
        opts.inputMint,
        opts.outputMint,
        opts.amount,
        opts.slippage ?? 1
      ));

    if (!quoteResp) throw new Error("Missing Jupiter quote response");

    const payload = {
      quoteResponse: quoteResp,
      userPublicKey: opts.userPublicKey,
      wrapAndUnwrapSol: true,
    };

    const res = await retry(() => swapClient.post("/swap", payload), 2, 400);
    const raw = res.data ?? res;

    const base64Tx =
      raw?.swapTransaction ||
      raw?.swapTransactionBase64 ||
      raw?.data?.swapTransaction ||
      raw?.swap_tx ||
      raw?.swap_transaction ||
      raw?.transaction;

    if (!base64Tx) {
      return { success: false, error: "Jupiter returned no transaction" };
    }

    const versioned = VersionedTransaction.deserialize(
      Buffer.from(base64Tx, "base64")
    );

    versioned.sign([signer]);

    const signature = await connection.sendTransaction(versioned, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, ...(await connection.getLatestBlockhash()) },
      "confirmed"
    );

    return { success: true, signature, raw };
  } catch (err: any) {
    log.error("Swap failed", err?.message ?? err);
    return { success: false, error: err?.message ?? String(err) };
  }
}

/* ----------------------------- OPTIONAL: token list / price helpers ----------------------------- */
/**
 * Fetch token list from jup ag token list (or fallback)
 */
export async function fetchTokenList() {
  try {
    // official jupiter token-list (raw GitHub JSON) often used by frontends
    const url =
      "https://raw.githubusercontent.com/jup-ag/token-list/main/src/tokens/mainnet.json";
    const res = await retry(() => axios.get(url), 2, 400);
    return res.data;
  } catch (err: any) {
    log.warn("fetchTokenList failed, returning null", err?.message ?? err);
    return null;
  }
}

/**
 * Fetch simple prices for a list of mints using Jupiter price endpoint (price.jup.ag or your proxy).
 * Accepts array of mint addresses (max depends on endpoint).
 */
export async function fetchPricesForMints(mints: string[]) {
  try {
    if (!mints || mints.length === 0) return {};
    // some Jupiter price endpoints accept comma-separated ids on /price?ids=
    const url =
      (process.env.JUPITER_PRICE_URL || JUPITER_QUOTE_URL).replace(/\/$/, "") +
      "/price";
    const res = await retry(
      () => axios.get(url, { params: { ids: mints.join(",") }, timeout: 8000 }),
      2,
      300
    );
    return res.data ?? {};
  } catch (err: any) {
    log.warn("fetchPricesForMints failed", err?.message ?? err);
    return {};
  }
}

/**
 * Fetch token prices merged with token metadata.
 * Returns array of tokens with price, liquidity, marketCap, etc.
 */
export async function fetchTokenPrices() {
  try {
    const tokenList = await fetchTokenList();
    if (!tokenList || !Array.isArray(tokenList.tokens)) {
      log.warn("fetchTokenPrices: Invalid or empty tokenList");
      return [];
    }
    const tokens = tokenList.tokens;

    // fetch prices for mints in tokenList
    const mints = tokens.map((t: any) => t.address);
    const pricesMap = await fetchPricesForMints(mints);

    // merge tokens with prices and return
    const merged = tokens.map((t: any) => ({
      ...t,
      price: pricesMap[t.address] ?? null,
      marketCap: t.extensions?.marketCap ?? null,
      liquidity: t.extensions?.liquidity ?? null,
    }));

    return merged;
  } catch (err: any) {
    log.warn("fetchTokenPrices failed", err?.message ?? err);
    return [];
  }
}

// Removed default export object for clearer named exports
