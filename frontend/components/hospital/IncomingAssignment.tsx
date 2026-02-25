"use client";

import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";

export default function IncomingAssignment() {
  const [assignment, setAssignment] = useState<any>(null);
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

  return (
    <div className="bg-yellow-200 p-4 rounded shadow">
      <h2>Incoming Emergency</h2>
      <p>Time Left: {timeLeft}s</p>

      <button
        onClick={() => socket.emit("confirm_assignment", assignment)}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Accept
      </button>
    </div>
  );
}