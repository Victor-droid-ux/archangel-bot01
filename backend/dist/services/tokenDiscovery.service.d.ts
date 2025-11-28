import { Server } from "socket.io";
export type CandidateToken = {
    symbol?: string;
    mint: string;
    name?: string;
    priceSol: number | null;
    liquidity: number | null;
    marketCapSol: number | null;
};
export declare function fetchJupiterTokenList(): Promise<any>;
/**
 * Start token watcher
 * - polls token list/prices every intervalMs
 * - emits tokenFeed via socket when list changes
 * - triggers auto-buy for tokens that meet criteria via autoBuyer.register
 */
export declare function startTokenWatcher(io: Server, opts?: {
    intervalMs?: number;
}): () => void;
declare const _default: {
    startTokenWatcher: typeof startTokenWatcher;
};
export default _default;
//# sourceMappingURL=tokenDiscovery.service.d.ts.map