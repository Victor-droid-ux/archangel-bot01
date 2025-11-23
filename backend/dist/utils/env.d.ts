declare const requireEnv: (key: string) => string;
export declare const ENV: {
    PORT: string;
    SOLANA_RPC_URL: string;
    NEXT_PUBLIC_SOLANA_ENDPOINT: string;
    SOLANA_WS_URL: string;
    JUPITER_QUOTE_URL: string;
    NEXT_PUBLIC_JUPITER_ENDPOINT: string;
    JUPITER_SWAP_URL: string;
    SECRET_KEY: string;
    NEXT_PUBLIC_SECRET_KEY: string;
    USE_REAL_SWAP: boolean;
    FRONTEND_URL: string;
    ENABLE_AUTO_BUY: boolean;
    AUTO_BUY_AMOUNT_SOL: number;
    DEFAULT_SLIPPAGE: number;
    TOKEN_WATCH_INTERVAL_MS: number;
    MIN_TOKEN_MARKETCAP_USD: number;
    MIN_TOKEN_LIQUIDITY_USD: number;
    POSITION_MONITOR_INTERVAL_MS: number;
    DEFAULT_TAKE_PROFIT_PCT: number;
    DEFAULT_STOP_LOSS_PCT: number;
    SERVER_PUBLIC_KEY: string | undefined;
    DEFAULT_SERVER_WALLET: string;
};
export { requireEnv };
//# sourceMappingURL=env.d.ts.map