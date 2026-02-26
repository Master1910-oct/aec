"use client";

import AESMap from "@/components/map/AESMap";
import { useAESStore } from "@/lib/store";
import { useEffect } from "react";

export default function AmbulancePage() {
  const { assignment, emergencies } = useAESStore();

  useEffect(() => {
    if (navigator.geolocation) {
      const watcher = navigator.geolocation.watchPosition((pos) => {
        // Location tracking
      });
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, []);

  // Get the latest critical emergency
  const criticalEmergency = emergencies[0];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      {/* Alert Banner */}
      {criticalEmergency && (
        <div className="bg-red-900 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold">CRITICAL RESPONSE - {criticalEmergency.type.toUpperCase()}</p>
              <p className="text-sm text-red-200">Immediate action required</p>
            </div>
          </div>
        </div>
      )}

      {/* Ambulance Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="bg-cyan-500 text-gray-900 px-2 py-1 rounded">🚑</span>
              MEDIC-01
            </h1>
            <p className="text-gray-400 text-sm">AMS-001 • ALS</p>
          </div>
          <span className="bg-orange-500 text-black px-3 py-1 rounded font-bold text-sm">EN ROUTE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Crew on Duty */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Crew on Duty</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span>👨‍⚕️</span>
                <span>Dr. Sharma</span>
              </div>
              <div className="flex items-center gap-3">
                <span>👨‍⚕️</span>
                <span>EMT Patel</span>
              </div>
            </div>
          </div>

          {/* Current Position */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Current Position</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-cyan-400">
                <span>📍</span>
                <span className="font-mono">28.6139, 77.2090</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-400">
                <span>📡</span>
                <span>GPS ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Vehicle Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span>ALS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="bg-orange-500 text-black px-2 py-1 rounded text-xs font-bold">EN ROUTE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ETA</span>
                <span className="text-cyan-300 font-bold">8 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Active Assignment */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg border-l-4 border-red-500 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-red-400 font-bold uppercase tracking-wide text-sm">Active Assignment</h3>
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">CRITICAL</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-gray-400 text-xs uppercase">Assignment</p>
                <p className="text-xl font-bold">ASG-001</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">ETA</p>
                <p className="text-xl font-bold text-cyan-300">8 min</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Distance</p>
                <p className="text-xl font-bold">4.2 km</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Status</p>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">ACCEPTED</span>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-4">
              <div className="space-y-3">
                <p className="text-gray-400 text-xs uppercase font-bold">Patient Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Condition</span>
                    <p className="font-bold">Cardiac Arrest</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Age</span>
                    <p className="font-bold">45 yrs</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender</span>
                    <p className="font-bold">Male</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity</span>
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">CRITICAL</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-xs uppercase font-bold mb-3">Destination Hospital</p>
                <div className="flex items-center gap-3">
                  <span>✓</span>
                  <div>
                    <p className="font-bold">AIIMS Trauma Center</p>
                    <p className="text-gray-400 text-sm">AIIMS-TC • Beds: 34/120</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Map */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">Navigation Map</h3>
          <span className="text-green-400 text-xs">🟢 GPS LOCK</span>
        </div>
        <div className="w-full h-96">
          <AESMap />
        </div>
      </div>
    </div>
  );
}