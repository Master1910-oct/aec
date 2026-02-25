"use client";

import { useAESStore } from "@/lib/store";

export default function LogPanel() {
  const { logs } = useAESStore();

  return (
    <div className="bg-black text-green-400 p-4 rounded h-48 overflow-y-scroll">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}