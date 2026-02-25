import { io } from "socket.io-client";
import { useAESStore } from "./store";

export const socket = io("http://127.0.0.1:5001", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  useAESStore.getState().setConnection(true);
  useAESStore.getState().addLog("Connected to server");
});

socket.on("disconnect", () => {
  useAESStore.getState().setConnection(false);
  useAESStore.getState().addLog("Disconnected from server");
});

socket.on("new_emergency", (data) => {
  useAESStore.getState().addEmergency(data);
});

socket.on("hospital_assignment", (data) => {
  useAESStore.getState().setAssignment(data);
});