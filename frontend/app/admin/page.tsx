"use client";

import dynamic from "next/dynamic";
import { useAESStore } from "@/lib/store";
import { useState, useEffect } from "react";

const AESMap = dynamic(
  () => import("@/components/map/AESMap"),
  { ssr: false }
);

export default function AdminPage() {
  const { emergencies } = useAESStore();
  const [criticalCount] = useState(2);

  // Mock data for fleet and charts
  const fleet = [
    { callSign: "MEDIC-01", type: "ALS", status: "EN ROUTE", crew: "Dr. Sharma, EMT Patel", eta: "8 min", position: "28.6139, 77.2090" },
    { callSign: "MEDIC-02", type: "BLS", status: "AVAILABLE", crew: "Dr. Kumar, EMT Singh", eta: "-", position: "28.6280, 77.2335" },
    { callSign: "MEDIC-03", type: "ALS", status: "TRANSPORTING", crew: "Dr. Gupta, EMT Verma", eta: "12 min", position: "28.6353, 77.2250" },
    { callSign: "RESCUE-01", type: "CCT", status: "AT SCENE", crew: "Dr. Reddy, EMT Das", eta: "5 min", position: "28.6106, 77.2300" },
    { callSign: "RESCUE-02", type: "BLS", status: "AVAILABLE", crew: "Dr. Joshi, EMT Khan", eta: "-", position: "28.6450, 77.2100" },
    { callSign: "MEDIC-04", type: "ALS", status: "OFFLINE", crew: "Dr. Mehta, EMT Rao", eta: "-", position: "28.6200, 77.2400" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div className="bg-red-900 border-l-4 border-red-500 p-4 rounded">
          <p className="font-bold">⚠️ {criticalCount} CRITICAL ASSIGNMENT(S) ACTIVE - IMMEDIATE RESPONSE REQUIRED</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Units */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wide">Active Units</h3>
            <span>🚑</span>
          </div>
          <p className="text-3xl font-bold">4</p>
          <p className="text-gray-500 text-sm mt-1">of 6 total</p>
        </div>

        {/* Available Hospitals */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wide">Available Hospitals</h3>
            <span>🏥</span>
          </div>
          <p className="text-3xl font-bold">2</p>
          <p className="text-gray-500 text-sm mt-1">of 4 total</p>
        </div>

        {/* Avg Response */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wide">Avg Response</h3>
            <span>⏱️</span>
          </div>
          <p className="text-3xl font-bold text-cyan-300">8.4m</p>
          <p className="text-green-500 text-sm mt-1">Target: &lt; 8 min</p>
        </div>

        {/* Critical Alerts */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wide">Critical Alerts</h3>
            <span>⚠️</span>
          </div>
          <p className="text-3xl font-bold text-red-500">{criticalCount}</p>
          <p className="text-red-600 text-sm mt-1">Requires attention</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Tracking Map - Spans 2 columns */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">Live Tracking</h3>
            <span className="text-cyan-400 text-xs font-bold">● LIVE</span>
          </div>
          <div className="w-full h-96">
            <AESMap />
          </div>
        </div>

        {/* Active Assignments */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 bg-gray-900">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">Active Assignments</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {emergencies.length === 0 ? (
              <p className="text-gray-400 text-sm">No active assignments</p>
            ) : (
              emergencies.map((e) => (
                <div
                  key={e.id}
                  className="bg-gray-900 rounded-lg p-3 border border-gray-700 border-l-4 border-l-red-500"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm">ASG-00{e.id}</p>
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">CRITICAL</span>
                  </div>
                  <p className="text-gray-300 text-sm">{e.type}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <span className="bg-gray-800 text-cyan-400 px-2 py-0.5 rounded text-xs">MEDIC-01</span>
                    <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">AIIMS-TC</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">ACCEPTED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex justify-between items-center">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">Fleet Overview</h3>
            <span className="text-gray-400 text-xs">6 UNITS</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">Call Sign</th>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">Type</th>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">Status</th>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">Crew</th>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">ETA</th>
                <th className="px-4 py-3 text-left text-gray-400 font-bold uppercase">Position</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((unit) => (
                <tr key={unit.callSign} className="border-b border-gray-700 hover:bg-gray-900 transition">
                  <td className="px-4 py-3 font-bold text-cyan-400">{unit.callSign}</td>
                  <td className="px-4 py-3">{unit.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        unit.status === "EN ROUTE"
                          ? "bg-orange-600 text-white"
                          : unit.status === "AVAILABLE"
                          ? "bg-green-600 text-white"
                          : unit.status === "TRANSPORTING"
                          ? "bg-purple-600 text-white"
                          : unit.status === "AT SCENE"
                          ? "bg-blue-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {unit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{unit.crew}</td>
                  <td className="px-4 py-3 text-cyan-300 font-bold">{unit.eta}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{unit.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Response Time Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Response Time (24H)</h3>
          <div className="h-48 flex items-end justify-around">
            {[7, 5, 6, 8, 10, 9, 11].map((value, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className="w-6 bg-cyan-500 rounded-t"
                  style={{ height: `${(value / 12) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"][i] || ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Assignments Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Weekly Assignments</h3>
          <div className="h-48 flex items-end justify-around">
            {[12, 15, 14, 18, 22, 18, 15].map((value, i) => (
              <div key={i} className="flex flex-col items-center flex-1 mx-1">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(value / 25) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Severity Distribution</h3>
          <div className="flex justify-center h-48">
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-transparent" style={{
                  borderTopColor: "#ef4444",
                  borderRightColor: "#f97316",
                  borderBottomColor: "#3b82f6",
                  transform: "rotate(0deg)"
                }}></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">38%</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}