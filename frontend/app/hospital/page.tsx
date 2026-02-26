"use client";

import { useAESStore } from "@/lib/store";
import { useState } from "react";

export default function HospitalPage() {
  const { emergencies } = useAESStore();
  const [readiness] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      {/* Hospital Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🏥</span>
            AIIMS Trauma Center
          </h1>
          <p className="text-gray-400 text-sm">AIIMS-TC • +91-11-26588500</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-green-400 text-xs uppercase font-bold">🟢 Available</p>
          </div>
          <div className="relative w-12 h-8 bg-gray-700 rounded-full cursor-pointer border border-gray-600">
            <div className={`absolute top-1 right-1 w-6 h-6 bg-blue-500 rounded-full transition-all ${readiness ? 'translate-x-0' : '-translate-x-6'}`}></div>
          </div>
        </div>
      </div>

      {/* Bed Availability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Beds */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">General Beds</h3>
            <span>🛏️</span>
          </div>
          <p className="text-4xl font-bold mb-2">34</p>
          <p className="text-gray-400 text-sm mb-4">of 120 available</p>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: '28%' }}></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold">−</button>
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold">+</button>
          </div>
        </div>

        {/* ICU Beds */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">ICU Beds</h3>
            <span>❤️</span>
          </div>
          <p className="text-4xl font-bold mb-2 text-green-400">5</p>
          <p className="text-gray-400 text-sm mb-4">of 20 available</p>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: '25%' }}></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold">−</button>
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold">+</button>
          </div>
        </div>

        {/* Emergency Room */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">Emergency Room</h3>
            <span>📱</span>
          </div>
          <p className="text-4xl font-bold mb-2 text-blue-400">18</p>
          <p className="text-gray-400 text-sm mb-4">of 30 occupied</p>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: '60%' }}></div>
          </div>
          <p className="text-gray-500 text-xs mt-4 text-center font-bold">60% CAPACITY</p>
        </div>
      </div>

      {/* Incoming Assignments & Specialties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Assignments */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Incoming Assignments</h3>

          {emergencies.length === 0 ? (
            <p className="text-gray-400">No incoming assignments</p>
          ) : (
            <div className="space-y-3">
              {emergencies.map((e) => (
                <div key={e.id} className="bg-gray-900 rounded p-4 border border-red-900 border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold">ASG-00{e.id}</p>
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">CRITICAL</span>
                  </div>
                  <p className="text-gray-300">{e.type}</p>
                  <p className="text-gray-500 text-sm mt-1">Patient: 450 • 🚑 MEDIC-01 • ETA: 8 min • 4.2 km</p>
                  <div className="flex gap-2 mt-3">
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">ACCEPTED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specialties */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wide text-sm mb-4">Specialities</h3>
          <div className="flex flex-wrap gap-3">
            {['Trauma', 'Cardiology', 'Neurology', 'Orthopedics', 'Burn Care'].map((specialty) => (
              <span
                key={specialty}
                className="bg-gray-700 text-cyan-400 px-3 py-2 rounded border border-gray-600 text-sm font-bold"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}