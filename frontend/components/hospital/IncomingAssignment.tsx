"use client";

import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import type { Assignment } from "@/lib/store";

export default function IncomingAssignment() {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    socket.on("new_assignment", (data) => {
      setAssignment(data);
      setTimeLeft(15);
    });
  }, []);

  useEffect(() => {
    if (!assignment) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [assignment]);

  if (!assignment) return null;

  const percentage = (timeLeft / 15) * 100;

  return (
    <div className="bg-yellow-200 dark:bg-yellow-700 p-4 rounded shadow space-y-2">
      <h2 className="font-bold">Incoming Emergency</h2>
      <div className="w-full bg-gray-300 dark:bg-gray-600 h-2 rounded">
        <div
          className="bg-red-500 h-2 rounded"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm">Time Left: {timeLeft}s</p>

      <button
        onClick={() => socket.emit("confirm_assignment", assignment)}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Accept
      </button>
    </div>
  );
}