// backend/src/routes/trade.route.ts
import { Router } from "express";
import crypto from "crypto";
import { getJupiterQuote, executeJupiterSwap, } from "../services/jupiter.service.js";
import dbService from "../services/db.service.js";
const router = Router();
const SOL_MINT = "So11111111111111111111111111111111111111112";
/* ------------------------------------------------------
    MAIN EXECUTE TRADE (Manual Buy/Sell from Frontend UI)
------------------------------------------------------- */
router.post("/", async (req, res) => {
    try {
        const { type, inputMint = SOL_MINT, outputMint, amount, wallet, slippage = 1, } = req.body;
        if (!type || !outputMint || !amount) {
            return res
                .status(400)
                .json({ success: false, message: "Missing trade parameters" });
        }
        // Wallet fallback for server-initiated trades
        const userPublicKey = wallet ||
            process.env.BACKEND_RECEIVER_WALLET ||
            process.env.SERVER_PUBLIC_KEY;
        if (!userPublicKey)
            throw new Error("User wallet missing (server wallet fallback required)");
        const quote = await getJupiterQuote(inputMint, outputMint, amount, slippage);
        if (!quote)
            throw new Error("Failed to fetch Jupiter quote");
        const useReal = process.env.USE_REAL_SWAP === "true";
        const swap = useReal
            ? await executeJupiterSwap({
                inputMint,
                outputMint,
                amount,
                userPublicKey,
                slippage,
            })
            : {
                success: true,
                simulated: true,
                signature: `sim-${Date.now()}`,
            };
        if (!swap.success)
            throw new Error(swap.error ?? "Swap failed");
        const trade = {
            id: crypto.randomUUID(),
            type,
            token: outputMint,
            inputMint,
            outputMint,
            amountLamports: amount,
            amountSol: amount / 1e9,
            price: Number((Math.random() * 0.002 + 0.0008).toFixed(6)),
            pnl: Number((Math.random() * 0.05 - 0.02).toFixed(3)),
            wallet: userPublicKey,
            simulated: !useReal,
            signature: swap.signature ?? null,
            timestamp: new Date(),
        };
        await dbService.addTrade(trade);
        req.app?.get("io")?.emit("tradeFeed", trade);
        return res.json({ success: true, data: trade });
    }
    catch (err) {
        console.error("Trade error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});
/* ------------------------------------------------------
    AUTO-SELL POSITION ENDPOINT (hit from UI)
------------------------------------------------------- */
router.post("/close", async (req, res) => {
    try {
        const { tokenMint } = req.body;
        if (!tokenMint)
            return res
                .status(400)
                .json({ success: false, message: "tokenMint required" });
        const positions = await dbService.getPositions();
        const pos = positions.find((p) => p.token === tokenMint);
        if (!pos || pos.netSol <= 0)
            return res.status(404).json({
                success: false,
                message: "No open position for that token",
            });
        const result = await autoSellPosition({
            tokenMint: pos.token,
            amountSol: pos.netSol,
            wallet: process.env.BACKEND_RECEIVER_WALLET ?? "",
        });
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }
        // emit socket update here
        const io = req.app?.get("io");
        if (io) {
            io.emit("tradeFeed", {
                ...result.data,
                auto: true,
                reason: "TP/SL",
            });
        }
        return result.success
            ? res.json({ success: true, data: result.data })
            : res.status(500).json({ success: false, message: result.error });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
/* ------------------------------------------------------
    INTERNAL — AUTO-SELL POSITION
------------------------------------------------------- */
async function autoSellPosition({ tokenMint, amountSol, wallet, }) {
    try {
        const lamportsToSell = Math.round(amountSol * 1e9);
        const userPublicKey = process.env.BACKEND_RECEIVER_WALLET || process.env.SERVER_PUBLIC_KEY;
        if (!userPublicKey)
            throw new Error("Server wallet missing for auto-sell swap");
        const useReal = process.env.USE_REAL_SWAP === "true";
        const swap = useReal
            ? await executeJupiterSwap({
                inputMint: tokenMint,
                outputMint: SOL_MINT,
                amount: lamportsToSell,
                userPublicKey,
                slippage: 1,
            })
            : {
                success: true,
                simulated: true,
                signature: `sim-close-${Date.now()}`,
            };
        if (!swap.success)
            throw new Error(swap.error);
        const trade = {
            id: crypto.randomUUID(),
            type: "sell",
            token: tokenMint,
            inputMint: tokenMint,
            outputMint: SOL_MINT,
            amountLamports: lamportsToSell,
            amountSol,
            //price: null,
            pnl: null,
            wallet: userPublicKey,
            simulated: !useReal,
            signature: swap.signature ?? null,
            timestamp: new Date(),
        };
        await dbService.addTrade(trade);
        return { success: true, data: trade };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
export default router;
//# sourceMappingURL=trade.route.js.map