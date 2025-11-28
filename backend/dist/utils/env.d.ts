/** Helper to enforce required env only when needed */
declare const required: (key: string) => string;
export declare const ENV: {
    PORT: string;
    /** RPC */
    SOLANA_RPC_URL: string;
    SOLANA_WS_URL: string;
    /** Jupiter API */
    JUPITER_QUOTE_URL: string;
    JUPITER_SWAP_URL: string;
    /** Wallet + signing */
    USE_REAL_SWAP: boolean;
    /** SECRET_KEY only required for real swaps */
    SECRET_KEY: string | undefined;
    /** Server Public Wallet */
    SERVER_PUBLIC_KEY: string;
    /** Safety checks */
    ensureKeys(): void;
    /** Trading config */
    AUTO_BUY_AMOUNT_SOL: number;
    DEFAULT_SLIPPAGE_PCT: number;
    ENABLE_AUTO_BUY: boolean;
    TOKEN_WATCH_INTERVAL_MS: number;
    POSITION_MONITOR_INTERVAL_MS: number;
    DEFAULT_TAKE_PROFIT_PCT: number;
    DEFAULT_STOP_LOSS_PCT: number;
    /** Token filtering */
    MIN_TOKEN_MARKETCAP_USD: number;
    MIN_TOKEN_LIQUIDITY_USD: number;
    /** Frontend CORS */
    FRONTEND_URL: string;
};
export { required as requireEnv };
//# sourceMappingURL=env.d.ts.map