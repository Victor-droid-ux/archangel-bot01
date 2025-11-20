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
        const tradeData = {
            id: tradeId,
            type,
            token: outputMint,
            inputMint,
            outputMint,
            amount,
            price,
            pnl,
            simulated: !useRealSwap,
            signature: result.signature || null,
            timestamp: new Date().toISOString(),
        };
        // --------------------------
        // 4. Save full trade to DB
        // --------------------------
        await dbService.addTrade({
            id: tradeId,
            type,
            token: outputMint,
            inputMint,
            outputMint,
            amount,
            price,
            pnl,
            wallet,
            simulated: !useRealSwap,
            signature: result.signature,
            timestamp: new Date(),
        });
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
export default router;
//# sourceMappingURL=trade.route.js.map