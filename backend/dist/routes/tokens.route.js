// backend/src/routes/tokens.route.ts
import express from "express";
import logger from "../utils/logger.js";
import { fetchTokenPrices } from "../services/jupiter.service.js";
const router = express.Router();
/**
 * GET /api/tokens
 * Returns REAL token list with:
 *  - symbol
 *  - mint address
 *  - current price
 *  - 24h change (pnl)
 *  - liquidity (optional future support)
 *  - marketCap (optional future support)
 */
router.get("/", async (_req, res) => {
    try {
        const tokens = await fetchTokenPrices(); // ⬅ REAL data, no mock
        return res.json({
            success: true,
            tokens,
        });
    }
    catch (err) {
        logger.error("❌ Failed to load tokens:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to load token list.",
        });
    }
});
export default router;
//# sourceMappingURL=tokens.route.js.map