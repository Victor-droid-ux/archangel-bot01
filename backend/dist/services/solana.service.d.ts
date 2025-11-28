import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
/**
 * 🧠 Singleton Solana RPC connection
 */
export declare function getConnection(): Connection;
export declare function getWsConnection(): Connection | null;
/**
 * 🔐 Load backend signer from SECRET_KEY array in .env
 */
export declare function loadKeypairFromEnv(): Keypair;
/**
 * 🌐 Get wallet balance (in lamports)
 */
export declare function getBalance(pubkey: PublicKey | string): Promise<number>;
/**
 * 🚀 Safe Jupiter swap executor with retry & strong confirmation
 */
export declare function signAndSendVersionedTx(tx: VersionedTransaction, signer?: Keypair, maxRetries?: number): Promise<string>;
//# sourceMappingURL=solana.service.d.ts.map