import { Connection, Keypair, PublicKey, } from "@solana/web3.js";
import { getLogger } from "../utils/logger.js";
import { ENV } from "../utils/env.js";
const log = getLogger("solana.service");
const COMMITMENT = process.env.SOLANA_COMMITMENT ?? "confirmed";
let _connection = null;
/**
 * Returns a singleton Solana RPC connection.
 * Uses ENV.SOLANA_RPC_URL by default.
 */
export function getConnection() {
    if (!_connection) {
        _connection = new Connection(ENV.SOLANA_RPC_URL, COMMITMENT);
        log.info(`Solana RPC connection established -> ${ENV.SOLANA_RPC_URL} (commitment=${COMMITMENT})`);
    }
    return _connection;
}
/**
 * Optionally, you could add a WebSocket connection for subscriptions:
 */
let _wsConnection = null;
export function getWsConnection() {
    if (!_wsConnection && ENV.SOLANA_WS_URL) {
        _wsConnection = new Connection(ENV.SOLANA_WS_URL, COMMITMENT);
        log.info(`Solana WS connection established -> ${ENV.SOLANA_WS_URL}`);
    }
    return _wsConnection;
}
/**
 * Load server Keypair from SECRET_KEY in .env
 */
export function loadKeypairFromEnv() {
    const raw = ENV.SECRET_KEY;
    if (!raw)
        throw new Error("SECRET_KEY not set in environment");
    const arr = typeof raw === "string" && raw.trim().startsWith("[")
        ? JSON.parse(raw)
        : raw;
    const secret = Uint8Array.from(arr);
    return Keypair.fromSecretKey(secret);
}
/**
 * Get balance for a public key
 */
export async function getBalance(pubkey) {
    const conn = getConnection();
    const pk = typeof pubkey === "string" ? new PublicKey(pubkey) : pubkey;
    const bal = await conn.getBalance(pk, COMMITMENT);
    return bal;
}
/**
 * Signs and sends a VersionedTransaction (e.g., from Jupiter swap)
 */
export async function signAndSendVersionedTx(tx, serverKeypair = loadKeypairFromEnv()) {
    const conn = getConnection();
    tx.sign([serverKeypair]);
    const raw = tx.serialize();
    const sig = await conn.sendRawTransaction(raw, { skipPreflight: false });
    await conn.confirmTransaction(sig, COMMITMENT);
    log.info({ sig }, "Transaction confirmed");
    return sig;
}
//# sourceMappingURL=solana.service.js.map