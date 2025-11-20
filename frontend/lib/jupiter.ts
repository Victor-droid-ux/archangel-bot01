// frontend/lib/jupiter.ts
import { fetcher } from "@lib/utils";

const JUPITER_API = "https://quote-api.jup.ag/v6/quote";

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps = 50
) {
  try {
    const url = `${JUPITER_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    const quote = await fetcher(url);
    return quote;
  } catch (err) {
    console.error("⚠️ Jupiter quote fetch failed:", err);
    return null;
  }
}

export async function executeSwap(transactionData: any) {
  // TODO: Implement swap execution via @jup-ag/api or @solana/web3.js
  console.log("🔁 Simulated swap executed:", transactionData);
  return { signature: "mocked_signature_123" };
}
