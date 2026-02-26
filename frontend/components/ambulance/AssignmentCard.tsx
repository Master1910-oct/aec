"use client";

import { useAESStore } from "@/lib/store";

export default function AssignmentCard() {
  const { assignment } = useAESStore();

  if (!assignment) return null;

  return (
    <div className="bg-green-200 dark:bg-green-900 p-4 rounded shadow">
      <h2 className="font-bold flex items-center">
        <span className="mr-2 text-xl">🏥</span> Assigned Hospital
      </h2>
      <p className="mt-1">{assignment.hospitalName}</p>
    </div>
  );
}