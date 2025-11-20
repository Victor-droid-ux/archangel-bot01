import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
/**
 * Returns a singleton Solana RPC connection.
 * Uses ENV.SOLANA_RPC_URL by default.
 */
export declare function getConnection(): Connection;
export declare function getWsConnection(): Connection | null;
/**
 * Load server Keypair from SECRET_KEY in .env
 */
export declare function loadKeypairFromEnv(): Keypair;
/**
 * Get balance for a public key
 */
export declare function getBalance(pubkey: PublicKey | string): Promise<number>;
/**
 * Signs and sends a VersionedTransaction (e.g., from Jupiter swap)
 */
export declare function signAndSendVersionedTx(tx: VersionedTransaction, serverKeypair?: Keypair): Promise<string>;
//# sourceMappingURL=solana.service.d.ts.map