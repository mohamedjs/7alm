"use client";

import { io, type Socket } from "socket.io-client";

/**
 * One socket.io connection per tab, authenticated with the admin token.
 * In production the api is on the same origin (Caddy routes /socket.io);
 * in development NEXT_PUBLIC_API_WS_URL points straight at the api.
 */
let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  if (socket && currentToken === token) return socket;
  socket?.disconnect();
  currentToken = token;
  const url = process.env.NEXT_PUBLIC_API_WS_URL || undefined;
  socket = io(url as string, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
    withCredentials: true,
    reconnectionDelayMax: 10_000,
  });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}
