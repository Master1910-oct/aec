"use client";

import { useAESStore } from "@/lib/store";

export default function EmergencyFeed() {
  const { emergencies } = useAESStore();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h2 className="font-bold mb-2">Live Emergencies</h2>

      {emergencies.length === 0 && (
        <div className="text-gray-500">No active emergencies</div>
      )}

      {emergencies.map((e) => {
        let color = "text-gray-800";
        if (e.status === "pending") color = "text-yellow-600";
        else if (e.status === "assigned") color = "text-blue-600";
        else if (e.status === "resolved") color = "text-green-600";

        return (
          <div key={e.id} className="border-b py-2 flex justify-between">
            <span>{e.type}</span>
            <span className={color}>{e.status}</span>
          </div>
        );
      })}
    </div>
  );
}