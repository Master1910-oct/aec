"use client";

import Link from "next/link";
import { useAESStore } from "@/lib/store";
import { useEffect } from "react";

export default function Navbar() {
  const { theme, toggleTheme, connected } = useAESStore();

  // sync class on document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-4 items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 dark:text-white">
              AES
            </Link>
            <Link href="/admin" className="text-gray-700 dark:text-gray-300 hover:underline">
              Admin
            </Link>
            <Link href="/ambulance" className="text-gray-700 dark:text-gray-300 hover:underline">
              Ambulance
            </Link>
            <Link href="/hospital" className="text-gray-700 dark:text-gray-300 hover:underline">
              Hospital
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span
              className={
                connected
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
              title={connected ? "connected" : "disconnected"}
            >
              ●
            </span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              {theme === "light" ? "🌞" : "🌙"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
