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
/**
 * Initialize the token price service
 */
export declare function initTokenPriceService(io: SocketIOServer): Promise<void>;
/**
 * Public getter for latest data
 */
export declare function getLatestTokens(): TokenWithPrice[];
//# sourceMappingURL=tokenPrice.service.d.ts.map