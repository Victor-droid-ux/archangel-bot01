import { Db } from "mongodb";
export type TradeRecord = {
    id: string;
    type: "buy" | "sell";
    token: string;
    inputMint?: string;
    outputMint?: string;
    amountLamports: number;
    amountSol: number;
    price?: number;
    pnl?: number;
    pnlSol?: number;
    wallet?: string;
    simulated?: boolean;
    signature?: string | null;
    timestamp: Date;
};
export type StatsDoc = {
    _id?: string;
    portfolioValue: number;
    totalProfitSol: number;
    totalProfitPercent: number;
    openTrades: number;
    tradeVolumeSol: number;
    winRate: number;
    lastUpdated: Date;
};
declare function connect(): Promise<Db>;
declare function addTrade(input: {
    id?: string;
    type: "buy" | "sell";
    token: string;
    inputMint?: string;
    outputMint?: string;
    amountLamports: number;
    price?: number;
    pnl?: number;
    wallet?: string;
    simulated?: boolean;
    signature?: string | null;
    timestamp?: Date | string;
}): Promise<TradeRecord>;
declare function getTrades(limit?: number): Promise<import("mongodb").WithId<TradeRecord>[]>;
declare function getStats(): Promise<import("mongodb").WithId<StatsDoc>>;
declare function getPositions(): Promise<Array<{
    token: string;
    netSol: number;
    avgBuyPrice?: number;
}>>;
declare function updateStats(updates: Partial<StatsDoc>): Promise<import("mongodb").WithId<StatsDoc>>;
declare function close(): Promise<void>;
declare const _default: {
    connect: typeof connect;
    addTrade: typeof addTrade;
    getTrades: typeof getTrades;
    getStats: typeof getStats;
    getPositions: typeof getPositions;
    updateStats: typeof updateStats;
    close: typeof close;
};
export default _default;
//# sourceMappingURL=db.service.d.ts.map