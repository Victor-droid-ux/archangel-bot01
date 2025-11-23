export declare function autoBuyToken(token: {
    symbol: string;
    mint: string;
    price: number;
    marketCap?: number;
    liquidity?: number;
}): Promise<{
    success: boolean;
    error: any;
    data?: never;
} | {
    success: boolean;
    data: import("./db.service.js").TradeRecord;
    error?: never;
}>;
export declare function autoSellPosition(position: {
    tokenMint: string;
    amountSol: number;
    id?: string;
    minAcceptPrice?: number;
}): Promise<{
    success: boolean;
    data: import("./db.service.js").TradeRecord;
    error?: never;
} | {
    success: boolean;
    error: any;
    data?: never;
}>;
//# sourceMappingURL=auto-trader.d.ts.map