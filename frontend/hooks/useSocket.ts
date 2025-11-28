"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

/**
 * ===========================================================
 *  🧠 useSocket()
 *  - Connects to backend socket
 *  - Supports live feed events: tokenFeed, tradeFeed, trade:update
 *  - Provides lastMessage as unified { event, payload }
 *  - Exposes sendMessage() for client-emitted events
 * ===========================================================
 */

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    /* -----------------------------------------
     * CONNECTION EVENTS
     * ---------------------------------------- */
    socket.on("connect", () => {
      setConnected(true);
      console.log("✅ Socket connected:", SOCKET_URL);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.warn("⚠ Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    /* -----------------------------------------
     * BACKEND EMITS THESE EVENTS:
     * 1. tokenFeed
     * 2. tradeFeed
     * 3. trade:update
     * ---------------------------------------- */

    const handle = (eventName: string, data: any) => {
      setLastMessage({
        event: eventName,
        payload: data?.payload ?? data, // unify payload shape
      });
    };

    socket.on("tokenFeed", (data) => handle("tokenFeed", data));
    socket.on("tradeFeed", (data) => handle("tradeFeed", data));
    socket.on("trade:update", (data) => handle("trade:update", data));

    return () => {
      socket.disconnect();
    };
  }, []);

  /* --------------------------------------------------
   * Emit messages from frontend to backend
   * -------------------------------------------------- */
  const sendMessage = useCallback(
    (event: string, payload?: any) => {
      if (!socketRef.current || !connected) return;
      socketRef.current.emit(event, payload);
    },
    [connected]
  );

  return {
    socket: socketRef.current,
    connected,
    lastMessage,
    sendMessage,
  };
}

export default useSocket;
