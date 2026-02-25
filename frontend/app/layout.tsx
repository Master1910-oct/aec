"use client";

import "../styles/globals.css";
import { useEffect } from "react";
import { socket } from "@/lib/socket";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    socket.connect();
  }, []);

  return (
    <html>
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}