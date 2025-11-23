import { Router } from "express";
import dbService from "../services/db.service.js";
import axios from "axios";
const router = Router();
router.get("/", async (_, res) => {
    try {
        const positions = await dbService.getPositions();
        // fetch token prices from Jupiter
        const { data } = await axios.get("https://jupiter-quote-api.quiknode.pro/a3bcc32583d07f570c3b333ceda3c3ed10ff135f/");
        const enriched = positions.map((p) => {
            const match = data.find((x) => x.symbol === p.token || x.address === p.token);
            const price = match ? Number(match.price) : 0;
            return {
                ...p,
                currentPrice: price,
                unrealizedPnlSol: p.avgBuyPrice && price ? (price - p.avgBuyPrice) * p.netSol : 0,
                unrealizedPnlPct: p.avgBuyPrice && price ? (price - p.avgBuyPrice) / p.avgBuyPrice : 0,
            };
        });
        return res.json({ success: true, positions: enriched });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
export default router;
//# sourceMappingURL=positions.route.js.map