"use client";

import { useAESStore } from "@/lib/store";
import { useRef, useEffect } from "react";

export default function LogPanel() {
  const { logs } = useAESStore();

  // scroll to bottom whenever logs change
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="bg-black text-green-400 p-4 rounded h-48 overflow-y-auto font-mono text-sm"
    >
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}