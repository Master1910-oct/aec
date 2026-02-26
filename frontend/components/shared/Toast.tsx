"use client";

import { useAESStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Toast() {
  const { logs } = useAESStore();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (logs.length === 0) return;
    const last = logs[logs.length - 1];
    setMessage(last);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [logs]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
      {message}
    </div>
  );
}
