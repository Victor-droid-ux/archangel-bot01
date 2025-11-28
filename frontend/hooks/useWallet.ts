"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { PublicKey } from "@solana/web3.js";

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export const useWallet = (): WalletState => {
  const [wallet, setWallet] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  /* -------------------------------------------------
     Detect wallet providers in browser
  ------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Phantom
    if ((window as any).solana?.isPhantom) {
      setWallet(new PhantomWalletAdapter());
      return;
    }

    // Solflare
    if ((window as any).solflare) {
      setWallet(new SolflareWalletAdapter());
      return;
    }

    // Torus fallback
    setWallet(new TorusWalletAdapter());
  }, []);

  /* -------------------------------------------------
     Connect
  ------------------------------------------------- */
  const connectWallet = useCallback(async () => {
    if (!wallet) {
      alert("No wallet detected. Install Phantom or Solflare.");
      return;
    }

    try {
      await wallet.connect();

      const pk: PublicKey | null = wallet.publicKey ?? null;

      if (pk) {
        setConnected(true);
        setPublicKey(pk.toString());
        console.log("✅ Wallet connected:", pk.toString());
      }

      // auto-handle wallet disconnects (Phantom, Solflare)
      wallet.on("disconnect", () => {
        setConnected(false);
        setPublicKey(null);
        console.log("👋 Wallet disconnected");
      });
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
    }
  }, [wallet]);

  /* -------------------------------------------------
     Disconnect
  ------------------------------------------------- */
  const disconnectWallet = useCallback(() => {
    if (wallet) {
      wallet.disconnect();
    }
    setConnected(false);
    setPublicKey(null);
    console.log("👋 Wallet disconnected by user");
  }, [wallet]);

  return {
    connected,
    publicKey,
    connectWallet,
    disconnectWallet,
  };
};
