// backend/src/types/index.d.ts

import { Server as SocketIOServer } from "socket.io";

/* -------------------------------------------------------------------------- */
/*                               Trade Payload                                */
/* -------------------------------------------------------------------------- */

export interface TradeUpdate {
  id?: string;
  type: "buy" | "sell" | "info";
  amount?: number;
  price?: number;
  pnl?: number;
  message: string;
  timestamp?: number;
}

/* -------------------------------------------------------------------------- */
/*                               Stats Payload                                */
/* -------------------------------------------------------------------------- */

export interface StatsData {
  uptime: number;
  timestamp: number;
  active: number;
  totalProfit?: number;
  tradeVolume?: number;
}

/* -------------------------------------------------------------------------- */
/*                              Socket Message                                */
/* -------------------------------------------------------------------------- */

export interface SocketMessage {
  event: string;
  payload: any;
}

/* -------------------------------------------------------------------------- */
/*                           MongoDB Trade Schema                             */
/* -------------------------------------------------------------------------- */

export interface TradeDocument {
  _id?: string;
  type: "buy" | "sell" | "info";
  amount: number;
  price: number;
  pnl: number;
  message: string;
  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                 Extend Express Request & Application Types                 */
/* -------------------------------------------------------------------------- */

declare global {
  namespace Express {
    interface Application {
      locals: {
        io: SocketIOServer;
      };
      get: (name: "io") => SocketIOServer;
    }

    interface Request {
      io?: SocketIOServer;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      FRONTEND_URL: string;
      MONGO_URI: string;
      SOLANA_RPC_URL: string;
      RPC_URL: string;
      USE_REAL_SWAP?: string;
    }
  }
}

export {};