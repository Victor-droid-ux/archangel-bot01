import { Router } from "express";
import { getJupiterQuote, executeJupiterSwap } from "../lib/jupiter.js";
import dbService from "../services/db.service.js";
import crypto from "crypto";
const router = Router();
/**
 * POST /api/trade
 * Executes a Solana trade (real or simulated) and emits live socket updates.
 */
router.post("/", async (req, res) => {
    try {
        const body = req.body;
        const { type, inputMint = "So11111111111111111111111111111111111111112", // SOL
        outputMint, amount, wallet, slippage = 1, } = body;
        if (!type || !outputMint || !amount || !wallet) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: type, outputMint, amount, or wallet.",
            });
        }
        console.log(`${type.toUpperCase()} request:`, {
            inputMint,
            outputMint,
            amount,
            wallet,
        });
        // --------------------------
        // 1. Get Jupiter Quote
        // --------------------------
        const quote = await getJupiterQuote(inputMint, outputMint, amount, slippage);
        if (!quote)
            throw new Error("Failed to get Jupiter quote.");
        const expectedOutput = quote.outAmount / 1e9;
        // --------------------------
        // 2. Real Swap or Simulation
        // --------------------------
        const useRealSwap = process.env.USE_REAL_SWAP === "true";
        let result;
        if (useRealSwap) {
            console.log("🚀 Executing real Jupiter swap...");
            result = await executeJupiterSwap({
                inputMint,
                outputMint,
                amount,
                userPublicKey: wallet,
                slippage,
            });
        }
        else {
            console.log("🧪 Simulating trade...");
            result = {
                success: true,
                simulated: true,
                signature: "simulated-tx-" + Date.now(),
            };
        }
        if (!result?.success)
            throw new Error(result.error || "Trade execution failed.");
        // --------------------------
        // 3. Compute PnL + Price
        // --------------------------
        const pnl = Number((Math.random() * 0.05 - 0.02).toFixed(3)); // -2% → +5%
        const price = Number((Math.random() * 0.002 + 0.0005).toFixed(6));
        const tradeId = crypto.randomUUID();
        // --------------------------
        // 4. Save full trade to DB
        // --------------------------
        const tradeData = {
            id: tradeId,
            type,
            token: outputMint,
            inputMint,
            outputMint,
            amount,
            price: typeof price === 'number' ? price : 0,
            pnl,
            wallet: wallet || "",
            simulated: !useRealSwap,
            signature: result.signature ?? null,
            timestamp: new Date(),
        };
        await dbService.addTrade(tradeData);
        // --------------------------
        // 5. Emit to frontend via sockets
        // --------------------------
        const io = (req.app && req.app.get("io")) ||
            (req.app && req.app.locals?.io);
        if (io && typeof io.emit === "function") {
            io.emit("tradeFeed", tradeData);
            console.log("📡 Emitted tradeFeed:", tradeData);
        }
        // --------------------------
        // 6. Respond
        // --------------------------
        const message = useRealSwap
            ? `${type.toUpperCase()} executed successfully`
            : `${type.toUpperCase()} simulated successfully`;
        return res.json({
            success: true,
            message: message,
            data: tradeData,
        });
    }
    catch (err) {
        console.error("❌ Trade execution error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Trade execution failed.",
        });
    }
});
// inside trade.route.ts add new route
router.post("/close", async (req, res) => {
    try {
        const { tokenMint, positionId, wallet } = req.body;
        if (!tokenMint && !positionId)
            return res.status(400).json({ success: false, message: "Provide tokenMint or positionId" });
        // derive amount & other details from db
        const positions = await dbService.getPositions();
        const pos = positionId ? positions.find((p) => p._id === positionId) : positions.find((p) => p.token === tokenMint);
        if (!pos)
            return res.status(404).json({ success: false, message: "Position not found" });
        const sellRes = await autoSellPosition({
            tokenMint: pos.token,
            amountSol: pos.netSol,
            id: pos._id,
        });
        if (!sellRes.success)
            return res.status(500).json({ success: false, message: sellRes.error });
        return res.json({ success: true, data: sellRes.data });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
async function autoSellPosition({ tokenMint, amountSol, id, minAcceptPrice, }) {
    try {
        const SOL_MINT = "So11111111111111111111111111111111111111112";
        // locate position (prefer id, fall back to tokenMint)
        let pos;
        const positions = await dbService.getPositions();
        if (id) {
            pos = positions.find((p) => p._id === id);
        }
        else if (tokenMint) {
            pos = positions.find((p) => p.token === tokenMint || p.tokenMint === tokenMint);
        }
        if (!pos)
            return { success: false, error: "Position not found" };
        // try to determine how many token units to sell
        // common fields: amount, tokenAmount, quantity, balance
        const tokenAmount = pos.amount ?? pos.tokenAmount ?? pos.quantity ?? pos.balance;
        if (!tokenAmount) {
            // if we only have an SOL valuation and a minAcceptPrice, estimate token amount
            if (amountSol && minAcceptPrice) {
                // estimate token amount = SOL value / price (both assumed same base units)
                // caller should prefer providing token amount on the position; this is a best-effort fallback
                // guard division
                if (minAcceptPrice <= 0) {
                    return { success: false, error: "Invalid minAcceptPrice" };
                }
                // NOTE: units are best-effort; adjust if your app stores decimals/units differently
                // here we assume amountSol is in SOL and minAcceptPrice is SOL per token
                // tokenAmount is returned in "token units" (not lamports)
                // convert to an integer-ish value
                // Keep as a float if needed by downstream functions
                // This fallback is conservative and may not be accurate for all tokens.
                pos.estimatedTokenAmount = amountSol / minAcceptPrice;
            }
            else {
                return {
                    success: false,
                    error: "Position does not contain a token amount. Provide amount on position or minAcceptPrice to estimate.",
                };
            }
        }
        const amountToSell = tokenAmount ?? pos.estimatedTokenAmount;
        if (!amountToSell || Number(amountToSell) <= 0) {
            return { success: false, error: "Computed sell amount is invalid" };
        }
        const slippage = 1; // default slippage %
        // get a quote: token -> SOL
        const quote = await getJupiterQuote(tokenMint, SOL_MINT, amountToSell, slippage);
        if (!quote)
            return { success: false, error: "Failed to fetch Jupiter quote" };
        const useRealSwap = process.env.USE_REAL_SWAP === "true";
        let result;
        if (useRealSwap) {
            result = await executeJupiterSwap({
                inputMint: tokenMint,
                outputMint: SOL_MINT,
                amount: amountToSell,
                userPublicKey: pos.wallet ?? undefined,
                slippage,
            });
        }
        else {
            result = {
                success: true,
                simulated: true,
                signature: "simulated-close-" + Date.now(),
            };
        }
        if (!result?.success) {
            return { success: false, error: result.error || "Swap execution failed" };
        }
        // basic trade metadata
        const tradeId = crypto.randomUUID();
        const pnl = Number((Math.random() * 0.05 - 0.02).toFixed(3));
        // price as SOL received / token units sold (best-effort)
        const solReceived = quote.outAmount ? quote.outAmount / 1e9 : undefined;
        const price = solReceived && Number(amountToSell)
            ? Number((solReceived / Number(amountToSell)).toFixed(9))
            : undefined;
        // persist the trade in DB
        const tradeRecord = {
            id: tradeId,
            type: "sell",
            token: tokenMint,
            inputMint: tokenMint,
            outputMint: SOL_MINT,
            amount: amountToSell,
            price: typeof price === 'number' ? price : 0,
            pnl,
            wallet: pos.wallet || "",
            simulated: !useRealSwap,
            signature: result.signature ?? null,
            timestamp: new Date(),
        };
        await dbService.addTrade(tradeRecord);
        return { success: true, data: tradeRecord };
    }
    catch (err) {
        // Return a consistent error shape for callers
        return { success: false, error: err?.message ?? String(err) };
    }
}
export default router;
//# sourceMappingURL=trade.route.js.map