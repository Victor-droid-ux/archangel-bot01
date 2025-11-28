import { TradeRecord } from "./db.service.js";
export declare function autoBuyToken(token: {
    symbol: string;
    mint: string;
    price: number;
}): Promise<{
    success: boolean;
    data: TradeRecord;
    error?: never;
} | {
    success: boolean;
    error: any;
    data?: never;
}>;
export declare function autoSellPosition({ tokenMint, amountSol, }: {
    tokenMint: string;
    amountSol: number;
}): Promise<{
    success: boolean;
    data: TradeRecord;
    error?: never;
} | {
    success: boolean;
    error: any;
    data?: never;
}>;
//# sourceMappingURL=auto-trader.d.ts.map