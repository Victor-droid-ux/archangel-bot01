export type JupiterSwapResponse = {
    success: true;
    signature: string;
    raw?: any;
    simulated?: boolean;
    error?: never;
} | {
    success: false;
    error: string;
    signature?: never;
    raw?: never;
    simulated?: never;
};
export declare const JUPITER_QUOTE_URL: string;
/**
 * Fetch best Jupiter quote for a swap.
 * returns parsed quote or null on failure.
 */
export declare function getJupiterQuote(inputMint: string, outputMint: string, amountLamports: number, slippagePercent?: number): Promise<any>;
/**
 * Request a swap transaction from Jupiter and execute it on-chain.
 * - quoteResponse: the object returned from getJupiterQuote (optional)
 * - userPublicKey: the wallet receiving the output tokens
 *
 * Returns { success, signature, raw } on success or { success: false, error } on failure.
 */
export declare function executeJupiterSwap(opts: {
    quoteResponse?: any;
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
    slippage?: number;
}): Promise<JupiterSwapResponse>;
/**
 * Fetch token list from jup ag token list (or fallback)
 */
export declare function fetchTokenList(): Promise<any>;
/**
 * Fetch simple prices for a list of mints using Jupiter price endpoint (price.jup.ag or your proxy).
 * Accepts array of mint addresses (max depends on endpoint).
 */
export declare function fetchPricesForMints(mints: string[]): Promise<any>;
/**
 * Fetch token prices merged with token metadata.
 * Returns array of tokens with price, liquidity, marketCap, etc.
 */
export declare function fetchTokenPrices(): Promise<any>;
//# sourceMappingURL=jupiter.service.d.ts.map