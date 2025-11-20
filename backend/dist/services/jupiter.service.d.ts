export declare function fetchTokenPrices(): Promise<any>;
export declare function getJupiterQuote(inputMint: string, outputMint: string, amount: number, slippage?: number): Promise<any>;
export declare function executeJupiterSwap(opts: {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
    slippage?: number;
    quoteResponse?: any;
}): Promise<{
    success: boolean;
    signature: string;
    inputAmount: number;
    outputAmount: number;
    priceImpact: any;
    data: any;
    error?: never;
} | {
    success: boolean;
    error: any;
    signature?: never;
    inputAmount?: never;
    outputAmount?: never;
    priceImpact?: never;
    data?: never;
}>;
//# sourceMappingURL=jupiter.service.d.ts.map