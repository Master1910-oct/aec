"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useAESStore } from "@/lib/store";

export default function MapInternal() {
  const { emergencies } = useAESStore();

  return (
    <MapContainer
      center={[13.0827, 80.2707]}
      zoom={13}
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