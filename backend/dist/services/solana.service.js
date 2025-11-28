import { Connection, Keypair, PublicKey, } from "@solana/web3.js";
import { getLogger } from "../utils/logger.js";
import { ENV } from "../utils/env.js";
const log = getLogger("solana.service");
const COMMITMENT = process.env.SOLANA_COMMITMENT ?? "confirmed";
let _connection = null;
/**
 * 🧠 Singleton Solana RPC connection
 */
export function getConnection() {
    if (!_connection) {
        _connection = new Connection(ENV.SOLANA_RPC_URL, COMMITMENT);
        log.info(`RPC connected → ${ENV.SOLANA_RPC_URL} (commitment=${COMMITMENT})`);
    }
    return _connection;
}
/**
 * Optional WebSocket connection
 */
let _wsConnection = null;
export function getWsConnection() {
    if (!_wsConnection && ENV.SOLANA_WS_URL) {
        _wsConnection = new Connection(ENV.SOLANA_WS_URL, COMMITMENT);
        log.info(`WS connected → ${ENV.SOLANA_WS_URL}`);
    }
    return _wsConnection;
}
/**
 * 🔐 Load backend signer from SECRET_KEY array in .env
 */
export function loadKeypairFromEnv() {
    const raw = ENV.SECRET_KEY;
    if (!raw)
        throw new Error("SECRET_KEY missing");
    let arr;
    try {
        arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    }
    catch {
        throw new Error("SECRET_KEY must be a JSON array of numbers");
    }
    if (!Array.isArray(arr) || arr.length < 8) {
        throw new Error("SECRET_KEY invalid format (must be array)");
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr));
}
/**
 * 🌐 Get wallet balance (in lamports)
 */
export async function getBalance(pubkey) {
    const conn = getConnection();
    const pk = new PublicKey(pubkey);
    return conn.getBalance(pk, COMMITMENT);
}
/**
 * 🚀 Safe Jupiter swap executor with retry & strong confirmation
 */
export async function signAndSendVersionedTx(tx, signer = loadKeypairFromEnv(), maxRetries = 3) {
    const conn = getConnection();
    tx.sign([signer]);
    const raw = tx.serialize();
    let signature = null;
    let attempt = 0;
    // retry sending transaction
    while (!signature && attempt < maxRetries) {
        try {
            signature = await conn.sendRawTransaction(raw, {
                skipPreflight: false,
            });
        }
        catch (err) {
            log.warn({ attempt, err: err.message }, "sendRawTransaction retry");
            attempt++;
            await new Promise((r) => setTimeout(r, 500 * attempt));
        }
    }
    if (!signature) {
        throw new Error("Failed to send transaction after retries");
    }
    const latest = await conn.getLatestBlockhash("confirmed");
    await conn.confirmTransaction({
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
    }, "confirmed");
    log.info({ signature }, "Txn confirmed");
    return signature;
}
//# sourceMappingURL=solana.service.js.map