import { Server } from "socket.io";
/**
 * Stream prices over WebSocket
 * @param io socket server
 * @param tokens array of tokens: { mint, symbol }
 */
export declare function startPriceStreamer(io: Server, tokens?: {
    mint: string;
    symbol: string;
}[]): void;
//# sourceMappingURL=priceStreamer.service.d.ts.map