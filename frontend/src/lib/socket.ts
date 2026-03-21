import { io, Socket } from "socket.io-client";

// the same base URL used by fetch; use env var so we can override in prod
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

// ── Singleton socket with built-in exponential-backoff reconnection ─────────
export const socket: Socket = io(BASE, {
  transports: ["websocket"],
  // Reconnection settings — socket.io handles backoff internally
  reconnection: true,
  reconnectionAttempts: Infinity,   // keep trying forever
  reconnectionDelay: 1000,          // start at 1 s
  reconnectionDelayMax: 30000,      // cap at 30 s
  randomizationFactor: 0.5,         // jitter so clients don't pile up
  timeout: 10000,
  autoConnect: true,
});

// ── Connection lifecycle logging ─────────────────────────────────────────────
socket.on("connect", () => {
  console.debug("[socket] connected —", socket.id);
});

socket.on("disconnect", (reason) => {
  console.debug("[socket] disconnected —", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.debug(`[socket] reconnect attempt #${attempt}`);
});

socket.on("reconnect", (attempt) => {
  console.debug(`[socket] reconnected after ${attempt} attempt(s)`);
});

socket.on("reconnect_error", (err) => {
  console.debug("[socket] reconnect error —", err.message);
});

socket.on("reconnect_failed", () => {
  console.error("[socket] all reconnection attempts failed");
});
