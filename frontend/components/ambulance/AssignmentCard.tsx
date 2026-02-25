"use client";

import { useAESStore } from "@/lib/store";

export default function AssignmentCard() {
  const { assignment } = useAESStore();

  if (!assignment) return null;

  return (
    <div className="bg-green-200 p-4 rounded shadow">
      <h2 className="font-bold">Assigned Hospital</h2>
      <p>{assignment.hospitalName}</p>
    </div>
  );
}