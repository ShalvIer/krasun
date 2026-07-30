import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@krasun/shared-socket-events";
import { API_URL, getAccessToken } from "./api";
import { useAuth } from "../features/auth/AuthContext";

type KrasunSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const SocketContext = createContext<KrasunSocket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socket = useMemo(() => io(API_URL, { autoConnect: false, auth: (callback) => callback({ token: getAccessToken() }) }), []);
  useEffect(() => { if (user) socket.connect(); else socket.disconnect(); return () => { socket.disconnect(); }; }, [socket, user]);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() { const socket = useContext(SocketContext); if (!socket) throw new Error("SocketProvider is missing"); return socket; }
