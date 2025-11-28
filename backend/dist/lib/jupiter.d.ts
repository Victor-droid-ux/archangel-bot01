/**
 * Fetch best Jupiter quote for a swap.
 * `amount` is in raw units (e.g. lamports for SOL).
 * `slippage` is in percent (1 = 1%).
 */
export declare function getJupiterQuote(inputMint: string, outputMint: string, amount: number, slippage?: number): Promise<any>;
interface ExecuteSwapArgs {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
    slippage?: number;
}
/**
 * Execute a Jupiter swap (server-side only).
 * Respects USE_REAL_SWAP env:
 *  - if false → returns simulated success object (no on-chain tx).
 */
export declare function executeJupiterSwap({ inputMint, outputMint, amount, userPublicKey, slippage, }: ExecuteSwapArgs): Promise<{
    success: boolean;
    simulated: boolean;
    signature: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    error?: never;
} | {
    success: boolean;
    error: any;
    simulated?: never;
    signature?: never;
    inputMint?: never;
    outputMint?: never;
    amount?: never;
}>;
export {};
//# sourceMappingURL=jupiter.d.ts.map