import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  transfer,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/* -------------------------------------------------------------------------- */
/* 🛰️  SOLANA CONNECTION SETUP */
/* -------------------------------------------------------------------------- */

const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta";

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  clusterApiUrl(SOLANA_CLUSTER as any);

export const connection = new Connection(RPC_ENDPOINT, "confirmed");

/* -------------------------------------------------------------------------- */
/* 💰  WALLET HELPERS */
/* -------------------------------------------------------------------------- */

export async function getSolBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await connection.getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
  } catch (err) {
    console.error("Error fetching SOL balance:", err);
    return 0;
  }
}

export async function toSOL(lamports: number): Promise<number> {
  return lamports / LAMPORTS_PER_SOL;
}

export function toLamports(sol: number): number {
  return sol * LAMPORTS_PER_SOL;
}

/* -------------------------------------------------------------------------- */
/* 🪙  SPL TOKEN HELPERS */
/* -------------------------------------------------------------------------- */

export async function getTokenAccount(
  walletAddress: string,
  mintAddress: string
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(
    new PublicKey(mintAddress),
    new PublicKey(walletAddress)
  );
}

export async function getTokenBalance(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  try {
    const tokenAccount = await getTokenAccount(walletAddress, mintAddress);
    const accountInfo = await getAccount(connection, tokenAccount);
    const mintInfo = await getMint(connection, new PublicKey(mintAddress));

    return Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
  } catch (err) {
    console.error("Error fetching token balance:", err);
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* 🧮  TOKEN PRICE FETCHING (DEXSCREENER + JUPITER API) */
/* -------------------------------------------------------------------------- */

/**
 * Fetch token price from Dexscreener
 */
export async function getTokenPrice(symbolOrAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${symbolOrAddress}`
    );
    const data = await res.json();

    if (data.pairs && data.pairs.length > 0) {
      return parseFloat(data.pairs[0].priceUsd);
    }

    throw new Error("Price not found");
  } catch (err) {
    console.warn(`⚠️ Dexscreener fallback for ${symbolOrAddress}:`, err);
    // fallback to Jupiter quote
    return await getJupiterPrice(symbolOrAddress);
  }
}

/**
 * Fetch token price from Jupiter
 */
export async function getJupiterPrice(
  symbolOrAddress: string
): Promise<number> {
  try {
    const res = await fetch(
      `https://price.jup.ag/v6/price?ids=${symbolOrAddress}`
    );
    const data = await res.json();
    const price = data.data?.[symbolOrAddress]?.price;
    return price ? parseFloat(price) : 0;
  } catch (err) {
    console.error("Error fetching Jupiter price:", err);
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔁  JUPITER AGGREGATOR SWAP EXECUTION */
/* -------------------------------------------------------------------------- */

/**
 * Build and execute swap transaction via Jupiter API
 */
export async function executeJupiterSwap({
  inputMint,
  outputMint,
  amount,
  slippageBps,
  wallet,
}: {
  inputMint: string; // e.g. SOL
  outputMint: string; // e.g. BONK
  amount: number; // in smallest unit (lamports or token units)
  slippageBps?: number; // 50 = 0.5%
  wallet: string; // wallet address
}) {
  try {
    const response = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputMint,
        outputMint,
        amount,
        slippageBps: slippageBps || 50,
        userPublicKey: wallet,
        wrapAndUnwrapSol: true,
      }),
    });

    const data = await response.json();

    if (!data.swapTransaction) throw new Error("No swap transaction returned");

    console.log("💹 Jupiter swap quote received");
    return data;
  } catch (err) {
    console.error("❌ Jupiter swap failed:", err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* ⚙️  UTILITIES */
/* -------------------------------------------------------------------------- */

export async function sendTransaction(
  tx: Transaction,
  signers: any[]
): Promise<string | null> {
  try {
    const signature = await sendAndConfirmTransaction(connection, tx, signers);
    console.log("✅ Transaction confirmed:", signature);
    return signature;
  } catch (err) {
    console.error("❌ Transaction failed:", err);
    return null;
  }
}
