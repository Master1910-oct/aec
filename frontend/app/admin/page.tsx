"use client";

import dynamic from "next/dynamic";

const AESMap = dynamic(
  () => import("@/components/map/AESMap"),
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Admin Control Panel
      </h1>

      <div className="w-full h-[70vh] border rounded-xl overflow-hidden">
        <AESMap />
      </div>
    </div>
  );
}