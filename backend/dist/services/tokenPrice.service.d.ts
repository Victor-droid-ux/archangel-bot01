import { Server as SocketIOServer } from "socket.io";
export type JupiterToken = {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    tags?: string[];
};
export type TokenWithPrice = JupiterToken & {
    price: number | null;
    pnl: number | null;
    liquidity: number | null;
    marketCap: number | null;
};
export declare function initTokenPriceService(io: SocketIOServer): Promise<void>;
export declare function getLatestTokens(): TokenWithPrice[];
//# sourceMappingURL=tokenPrice.service.d.ts.map