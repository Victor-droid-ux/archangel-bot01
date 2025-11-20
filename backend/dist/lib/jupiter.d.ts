/**
 * Fetch best Jupiter quote for a swap
 */
export declare function getJupiterQuote(inputMint: string, outputMint: string, amount: number, slippage?: number): Promise<any>;
/**
 * Execute a real Jupiter swap (server-side only)
 */
export declare function executeJupiterSwap({ inputMint, outputMint, amount, userPublicKey, slippage, }: {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
    slippage?: number;
}): Promise<{
    success: boolean;
    signature: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    error?: never;
} | {
    success: boolean;
    error: any;
    signature?: never;
    inputMint?: never;
    outputMint?: never;
    amount?: never;
}>;
//# sourceMappingURL=jupiter.d.ts.map