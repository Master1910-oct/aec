"use client";

import { useState } from "react";
import { createEmergency } from "@/lib/api";

export default function EmergencyForm() {
  const [type, setType] = useState("");

  const submit = async () => {
    await createEmergency({
      type,
      latitude: 13.0827,
      longitude: 80.2707,
    });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Emergency Type"
        className="border p-2 mr-2"
      />
      <button
        onClick={submit}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Send
      </button>
    </div>
  );
}