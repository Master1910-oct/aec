"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAESStore } from "@/lib/store";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

export default function AESMap() {
  const { ambulanceLocation, assignment } = useAESStore();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Load leaflet only in browser
    const L = require("leaflet");

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="w-full min-h-[360px] h-full relative">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <div className="text-gray-700">Loading map…</div>
        </div>
      )}

      <MapContainer
        center={[ambulanceLocation.lat, ambulanceLocation.lng]}
        // Use a country-level zoom by default so India is visible
        zoom={5}
        className="w-full h-full"
        whenCreated={(map) => {
          setMapReady(true);
          try {
            if (assignment?.hospitalLocation) {
              const bounds = [
                [ambulanceLocation.lat, ambulanceLocation.lng],
                assignment.hospitalLocation,
              ];
              // @ts-ignore fitBounds exists on leaflet map
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          } catch (e) {
            // ignore
          }
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={ambulanceLocation}>
          <Popup>You</Popup>
        </Marker>

        {assignment && (
          <>
            <Marker position={assignment.hospitalLocation}>
              <Popup>Hospital</Popup>
            </Marker>
            <Polyline
              positions={[ambulanceLocation, assignment.hospitalLocation]}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}