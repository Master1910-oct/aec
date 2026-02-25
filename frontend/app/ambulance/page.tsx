"use client";

import EmergencyForm from "@/components/ambulance/EmergencyForm";
import AssignmentCard from "@/components/ambulance/AssignmentCard";
import AESMap from "@/components/map/AESMap";

export default function AmbulancePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ambulance Dashboard</h1>

      <EmergencyForm />
      <AssignmentCard />
      <AESMap />
    </div>
  );
}