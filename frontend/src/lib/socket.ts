import { io, Socket } from "socket.io-client";

// the same base URL used by fetch; use env var so we can override in prod
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

// create a singleton socket connection; pages/components can import and listen
export const socket: Socket = io(BASE, {
  transports: ["websocket"],
  // path and other options can be adjusted if your server is mounted differently
});

socket.on("connect", () => {
  console.debug("socket connected", socket.id);
});

socket.on("disconnect", () => {
  console.debug("socket disconnected");
});
