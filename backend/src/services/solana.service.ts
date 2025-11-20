import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { getLogger } from "../utils/logger.js";
import { ENV } from "../utils/env.js";

const log = getLogger("solana.service");

const COMMITMENT: Commitment =
  (process.env.SOLANA_COMMITMENT as Commitment) ?? "confirmed";

let _connection: Connection | null = null;

/**
 * Returns a singleton Solana RPC connection.
 * Uses ENV.SOLANA_RPC_URL by default.
 */
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(ENV.SOLANA_RPC_URL, COMMITMENT);
    log.info(
      `Solana RPC connection established -> ${ENV.SOLANA_RPC_URL} (commitment=${COMMITMENT})`
    );
  }
  return _connection;
}

/**
 * Optionally, you could add a WebSocket connection for subscriptions:
 */
let _wsConnection: Connection | null = null;
export function getWsConnection(): Connection | null {
  if (!_wsConnection && ENV.SOLANA_WS_URL) {
    _wsConnection = new Connection(ENV.SOLANA_WS_URL, COMMITMENT);
    log.info(`Solana WS connection established -> ${ENV.SOLANA_WS_URL}`);
  }
  return _wsConnection;
}

/**
 * Load server Keypair from SECRET_KEY in .env
 */
export function loadKeypairFromEnv(): Keypair {
  const raw = ENV.SECRET_KEY;
  if (!raw) throw new Error("SECRET_KEY not set in environment");
  const arr =
    typeof raw === "string" && raw.trim().startsWith("[")
      ? JSON.parse(raw)
      : raw;
  const secret = Uint8Array.from(arr as number[]);
  return Keypair.fromSecretKey(secret);
}

/**
 * Get balance for a public key
 */
export async function getBalance(pubkey: PublicKey | string) {
  const conn = getConnection();
  const pk = typeof pubkey === "string" ? new PublicKey(pubkey) : pubkey;
  const bal = await conn.getBalance(pk, COMMITMENT);
  return bal;
}

/**
 * Signs and sends a VersionedTransaction (e.g., from Jupiter swap)
 */
export async function signAndSendVersionedTx(
  tx: VersionedTransaction,
  serverKeypair = loadKeypairFromEnv()
) {
  const conn = getConnection();
  tx.sign([serverKeypair]);
  const raw = tx.serialize();
  const sig = await conn.sendRawTransaction(raw, { skipPreflight: false });
  await conn.confirmTransaction(sig, COMMITMENT);
  log.info({ sig }, "Transaction confirmed");
  return sig;
}
