import axios from "axios";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

/* ----------------------------- 🔗 CONFIGURATION ----------------------------- */
const SOLANA_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_ENDPOINT ||
  "https://autumn-radial-owl.solana-mainnet.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/";

if (!SOLANA_RPC.startsWith("http")) {
  throw new Error("SOLANA_RPC_URL must start with http:// or https://");
}

const JUPITER_QUOTE =
  process.env.JUPITER_API_URL ||
  process.env.NEXT_PUBLIC_JUPITER_ENDPOINT ||
  "https://jupiter-quote-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/";

const JUPITER_SWAP =
  process.env.JUPITER_API_KEY ||
  "https://jupiter-swap-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/";

const connection = new Connection(SOLANA_RPC, "confirmed");

/* ------------------------------ 📊 GET QUOTE ------------------------------ */
/**
 * Fetch best Jupiter quote for a swap
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number = 1
) {
  try {
    const { data } = await axios.get(`${JUPITER_QUOTE}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: slippage * 100, // convert 1% to 100 bps
      },
    });

    console.log("📈 Jupiter Quote:", {
      inputMint,
      outputMint,
      inAmount: amount / 1e9,
      outAmount: data.outAmount / 1e9,
      routePlan: data.routePlan?.length,
    });

    return data;
  } catch (err: any) {
    console.error("❌ Jupiter quote error:", err.message);
    return null;
  }
}

/* ------------------------------ 💸 EXECUTE SWAP ------------------------------ */
/**
 * Execute a real Jupiter swap (server-side only)
 */
export async function executeJupiterSwap({
  inputMint,
  outputMint,
  amount,
  userPublicKey,
  slippage = 1,
}: {
  inputMint: string;
  outputMint: string;
  amount: number;
  userPublicKey: string;
  slippage?: number;
}) {
  try {
    // 🔐 Load backend wallet (server-side only)
    const secretArray = JSON.parse(process.env.SECRET_KEY || "[]");
    if (!secretArray.length)
      throw new Error("Missing backend wallet secret key");

    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretArray));

    // 🔹 Fetch best route from Jupiter
    const quoteResponse = await getJupiterQuote(
      inputMint,
      outputMint,
      amount,
      slippage
    );
    if (!quoteResponse) throw new Error("Failed to get Jupiter quote");

    // 🔹 Request swap transaction from Jupiter API
    const { data } = await axios.post(
      `${JUPITER_SWAP}/swap`,
      {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 5000,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!data.swapTransaction) throw new Error("Invalid swap transaction data");

    // 🔹 Deserialize, sign, and send transaction
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(data.swapTransaction, "base64")
    );
    swapTx.sign([keypair]);

    console.log("🚀 Sending transaction to Solana...");

    const signature = await connection.sendTransaction(swapTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(signature, "confirmed");

    console.log("✅ Swap confirmed on-chain:", signature);

    return {
      success: true,
      signature,
      inputMint,
      outputMint,
      amount,
    };
  } catch (err: any) {
    console.error("❌ Jupiter swap error:", err.message);
    return { success: false, error: err.message };
  }
}
