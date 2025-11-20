"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

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

    socket.on("connect", () => {
      setConnected(true);
      console.log("✅ Socket connected:", SOCKET_URL);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.warn("⚠️ Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    // ✅ Receive live trade updates from backend
    socket.on("trade:update", (data) => {
      console.log("📡 Trade Update:", data);
      setLastMessage(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /**
   * ✅ Emit trade events in correct format
   */
  const sendTradeUpdate = useCallback(
    (payload: any) => {
      if (!socketRef.current || !connected) return;
      socketRef.current.emit("trade:emit", payload);
    },
    [connected]
  );

  /**
   * Generic emitter for client-side code (event name + payload)
   */
  const sendMessage = useCallback(
    (event: string, payload?: any) => {
      if (!socketRef.current || !connected) return;
      socketRef.current.emit(event, payload);
    },
    [connected]
  );

  return { connected, lastMessage, sendTradeUpdate, sendMessage };
}

export default useSocket;
