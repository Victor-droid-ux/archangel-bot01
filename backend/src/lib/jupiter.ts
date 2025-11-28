import axios from "axios";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import dotenv from "dotenv";
import { getLogger } from "../utils/logger.js";

dotenv.config();

const log = getLogger("jupiterSwap.service");

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

const SOLANA_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_ENDPOINT ||
  "https://api.mainnet-beta.solana.com";

if (!SOLANA_RPC.startsWith("http")) {
  throw new Error("SOLANA_RPC_URL must start with http:// or https://");
}

const SOLANA_COMMITMENT =
  (process.env.SOLANA_COMMITMENT as "processed" | "confirmed" | "finalized") ||
  "confirmed";

// Use your .env values, with safe fallbacks to official Jupiter endpoints
const JUPITER_QUOTE_URL =
  process.env.JUPITER_QUOTE_URL || "https://quote-api.jup.ag/v6/quote";

const JUPITER_SWAP_URL =
  process.env.JUPITER_SWAP_URL || "https://quote-api.jup.ag/v6/swap";

// Feature flag: if false, executeJupiterSwap will RETURN A SIMULATED RESULT
const USE_REAL_SWAP =
  String(process.env.USE_REAL_SWAP || "false").toLowerCase() === "true";

const connection = new Connection(SOLANA_RPC, SOLANA_COMMITMENT);

/* -------------------------------------------------------------------------- */
/*                              QUOTE: getJupiterQuote                        */
/* -------------------------------------------------------------------------- */

/**
 * Fetch best Jupiter quote for a swap.
 * `amount` is in raw units (e.g. lamports for SOL).
 * `slippage` is in percent (1 = 1%).
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number = 1
) {
  try {
    const { data } = await axios.get(JUPITER_QUOTE_URL, {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: Math.floor(slippage * 100), // 1% → 100 bps
      },
      timeout: 15_000,
    });

    log.info(
      {
        inputMint,
        outputMint,
        inAmount: amount,
        outAmount: data?.outAmount,
        routePlanLen: data?.routePlan?.length ?? 0,
      },
      "📈 Jupiter quote ok"
    );

    return data;
  } catch (err: any) {
    const msg = err?.message || String(err);
    log.error({ err: msg }, "❌ Jupiter quote error");
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                             SWAP: executeJupiterSwap                       */
/* -------------------------------------------------------------------------- */

interface ExecuteSwapArgs {
  inputMint: string;
  outputMint: string;
  amount: number; // raw units
  userPublicKey: string;
  slippage?: number; // percent, 1 = 1%
}

/**
 * Execute a Jupiter swap (server-side only).
 * Respects USE_REAL_SWAP env:
 *  - if false → returns simulated success object (no on-chain tx).
 */
export async function executeJupiterSwap({
  inputMint,
  outputMint,
  amount,
  userPublicKey,
  slippage = 1,
}: ExecuteSwapArgs) {
  // Safety: if flag is off, don't touch chain – just simulate
  if (!USE_REAL_SWAP) {
    log.warn(
      {
        inputMint,
        outputMint,
        amount,
        userPublicKey,
      },
      "USE_REAL_SWAP=false → returning simulated swap result"
    );

    return {
      success: true,
      simulated: true,
      signature: `sim-${Date.now()}`,
      inputMint,
      outputMint,
      amount,
    };
  }

  try {
    // 🔐 Load backend wallet (server-side only)
    const secretRaw = process.env.SECRET_KEY || "[]";
    let secretArray: number[];

    try {
      secretArray = JSON.parse(secretRaw);
    } catch {
      throw new Error("SECRET_KEY must be a valid JSON array of numbers");
    }

    if (!Array.isArray(secretArray) || !secretArray.length) {
      throw new Error("Missing or invalid backend wallet SECRET_KEY");
    }

    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretArray));

    // 🔹 Get best route from Jupiter
    const quoteResponse = await getJupiterQuote(
      inputMint,
      outputMint,
      amount,
      slippage
    );

    if (!quoteResponse) {
      throw new Error("Failed to get Jupiter quote");
    }

    // 🔹 Request swap transaction from Jupiter
    const { data } = await axios.post(
      JUPITER_SWAP_URL,
      {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 5_000,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15_000,
      }
    );

    if (!data?.swapTransaction) {
      throw new Error("Invalid swap transaction data from Jupiter");
    }

    // 🔹 Deserialize, sign, and send tx
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(data.swapTransaction, "base64")
    );

    swapTx.sign([keypair]);

    log.info(
      {
        inputMint,
        outputMint,
        amount,
        userPublicKey,
      },
      "🚀 Sending swap transaction to Solana"
    );

    const signature = await connection.sendTransaction(swapTx, {
      skipPreflight: false,
      preflightCommitment: SOLANA_COMMITMENT,
    });

    await connection.confirmTransaction(
      {
        signature,
        ...(await connection.getLatestBlockhash()),
      },
      SOLANA_COMMITMENT
    );

    log.info({ signature }, "✅ Swap confirmed on-chain");

    return {
      success: true,
      simulated: false,
      signature,
      inputMint,
      outputMint,
      amount,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    log.error({ err: msg }, "❌ Jupiter swap error");
    return { success: false, error: msg };
  }
}
