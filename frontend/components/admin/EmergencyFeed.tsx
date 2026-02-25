"use client";

import { useAESStore } from "@/lib/store";

export default function EmergencyFeed() {
  const { emergencies } = useAESStore();

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-bold">Live Emergencies</h2>

      {emergencies.map((e) => (
        <div key={e.id} className="border-b py-2">
          {e.type} - {e.status}
        </div>
      ))}
    </div>
  );
}