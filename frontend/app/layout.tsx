"use client";

import "../styles/globals.css";
import { useEffect } from "react";
import { socket } from "@/lib/socket";
import Navbar from "@/components/shared/Navbar";
import Toast from "@/components/shared/Toast";
import { useAESStore } from "@/lib/store";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useAESStore();

  useEffect(() => {
    socket.connect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <html lang="en">
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <Toast />
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}