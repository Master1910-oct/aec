"use client";

import { useState } from "react";
import { createEmergency } from "@/lib/api";

export default function EmergencyForm() {
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!type) return;
    setLoading(true);
    try {
      await createEmergency({
        type,
        latitude: 13.0827,
        longitude: 80.2707,
      });
      setType("");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("failed to send");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-2">
      <label className="block">
        <span className="text-sm font-medium">Emergency Type</span>
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="e.g. fire, accident"
          className="mt-1 block w-full border rounded p-2 bg-white dark:bg-gray-700"
        />
      </label>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        disabled={loading || !type}
        onClick={submit}
        className="bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded"
      >
        {loading ? "Sending…" : "Send"}
      </button>
    </div>
  );
}