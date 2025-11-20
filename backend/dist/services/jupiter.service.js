// backend/src/services/jupiter.service.ts
import axios from "axios";
import dotenv from "dotenv";
import { VersionedTransaction } from "@solana/web3.js";
import { getLogger } from "../utils/logger.js";
import { signAndSendVersionedTx } from "./solana.service.js";
dotenv.config();
const log = getLogger("jupiter.service");
// Base URLs
const JUP_API_BASE = process.env.JUPITER_API_URL ||
    process.env.NEXT_PUBLIC_JUPITER_ENDPOINT ||
    "https://quote-api.jup.ag/v6";
// Optional: private API key (swap/build)
const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
/* -------------------------------------------------------------
   1) Fetch Token List from Jupiter
------------------------------------------------------------- */
export async function fetchTokenPrices() {
    try {
        const url = "https://api.jup.ag/api/v1/tokens";
        const { data } = await axios.get(url);
        return data
            .filter((t) => t.symbol && t.price)
            .map((t) => ({
            symbol: t.symbol,
            mint: t.address,
            price: Number(t.price),
            pnl: Number((t.daily_price_change ?? 0).toFixed(2)),
            liquidity: t.liquidity ?? null,
            marketCap: t.market_cap ?? null,
        }));
    }
    catch (err) {
        log.error("❌ fetchTokenPrices failed:", err.message);
        throw new Error("Unable to fetch token prices");
    }
}
/* -------------------------------------------------------------
   2) Jupiter Quote Endpoint (v6)
------------------------------------------------------------- */
export async function getJupiterQuote(inputMint, outputMint, amount, slippage = 1) {
    try {
        const url = `${JUP_API_BASE}/quote`;
        const res = await axios.get(url, {
            params: {
                inputMint,
                outputMint,
                amount,
                slippageBps: slippage * 100,
                onlyDirectRoutes: false,
                allowCrossMint: true,
            },
            timeout: 12000,
        });
        return res.data;
    }
    catch (err) {
        log.error("❌ getJupiterQuote failed:", err.message);
        return null;
    }
}
/* -------------------------------------------------------------
   3) Build + Execute Jupiter Swap (v6)
------------------------------------------------------------- */
export async function executeJupiterSwap(opts) {
    try {
        // 1️⃣ Use existing quote or fetch new one
        const quote = opts.quoteResponse ||
            (await getJupiterQuote(opts.inputMint, opts.outputMint, opts.amount, opts.slippage));
        if (!quote) {
            throw new Error("No quote from Jupiter.");
        }
        // 2️⃣ Build SWAP transaction
        const swapUrl = `${JUP_API_BASE}/swap`;
        const headers = {};
        if (JUP_API_KEY)
            headers["x-api-key"] = JUP_API_KEY;
        const payload = {
            quoteResponse: quote,
            userPublicKey: opts.userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 10000, // ~0.00001 SOL
        };
        const { data } = await axios.post(swapUrl, payload, {
            headers,
            timeout: 15000,
        });
        if (!data?.swapTransaction) {
            throw new Error("Swap endpoint returned no swapTransaction.");
        }
        // 3️⃣ Decode: base64 → VersionedTransaction
        const tx = VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, "base64"));
        // 4️⃣ Server signs + sends to Solana
        const signature = await signAndSendVersionedTx(tx);
        return {
            success: true,
            signature,
            inputAmount: Number(quote.inAmount),
            outputAmount: Number(quote.outAmount),
            priceImpact: quote.priceImpactPct,
            data,
        };
    }
    catch (err) {
        log.error("❌ executeJupiterSwap failed:", err.message);
        return { success: false, error: err.message };
    }
}
//# sourceMappingURL=jupiter.service.js.map