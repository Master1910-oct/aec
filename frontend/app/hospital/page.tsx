"use client";

import IncomingAssignment from "@/components/hospital/IncomingAssignment";

export default function HospitalPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Hospital Dashboard</h1>
      <IncomingAssignment />
    </div>
  );
}