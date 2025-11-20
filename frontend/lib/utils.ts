// frontend/lib/utils.ts

/**
 * 🧠 Unified fetcher utility for backend & external APIs
 * - Auto-prefixes backend routes with NEXT_PUBLIC_BACKEND_URL
 * - Automatically throws if response is not OK
 */
export const fetcher = async (url: string, options: RequestInit = {}) => {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const finalUrl = url.startsWith("http") ? url : `${base}${url}`;

  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Fetch failed: ${res.status} — ${errorText}`);
  }

  return res.json();
};

/**
 * 🧩 Tailwind className combiner
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 💰 Format large numbers (balances, token prices, etc.)
 */
export const formatNumber = (num: number) =>
  Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);

/**
 * 🔗 Shorten Solana addresses
 */
export const truncateAddress = (address: string) =>
  address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

/**
 * ⏰ Format timestamps in HH:mm:ss (24h)
 */
export const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour12: false });
