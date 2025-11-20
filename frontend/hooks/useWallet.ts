"use client";

import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";


interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export const useWallet = (): WalletState => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);

  // Setup Solana connection
  const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

  useEffect(() => {
    // Try Phantom first, fallback to Solflare or Backpack
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      // new BackpackWalletAdapter(), // enable if installed separately
    ];


    const availableWallet = adapters.find((w) => w.readyState === "Installed");
    if (availableWallet) {
      setWallet(availableWallet);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!wallet) {
      alert("No Solana wallet detected. Please install Phantom or Solflare.");
      return;
    }

    try {
      await wallet.connect();
      setConnected(true);
      setPublicKey(wallet.publicKey?.toString() || null);
      console.log("✅ Connected:", wallet.publicKey?.toString());
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
    }
  }, [wallet]);

  const disconnectWallet = useCallback(() => {
    if (wallet) {
      wallet.disconnect();
      setConnected(false);
      setPublicKey(null);
      console.log("👋 Wallet disconnected");
    }
  }, [wallet]);

  return { connected, publicKey, connectWallet, disconnectWallet };
};
