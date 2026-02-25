"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useAESStore } from "@/lib/store";

export default function MapInternal() {
  const { emergencies } = useAESStore();

  return (
    <MapContainer
      // Default to India center and country-level zoom
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {emergencies.map((e) => (
        <Marker
          key={e.id}
          position={[e.location.lat, e.location.lng]}
        >
          <Popup>{e.type}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}