import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '@/store/useStore';

export function LiveMap({ className }: { className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { ambulances, hospitals } = useStore();
  const center: [number, number] = [13.0827, 80.2707];

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    // Ambulance markers
    ambulances
      .filter((a) => a.status !== 'offline')
      .forEach((amb) => {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:#22d3ee;width:28px;height:28px;border-radius:50%;border:3px solid #0e1526;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px rgba(34,211,238,0.5);">🚑</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([amb.location.lat, amb.location.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:monospace;font-size:11px;color:#0e1526"><strong>${amb.callSign}</strong><br/>Status: ${amb.status}<br/>Type: ${amb.vehicleType}${amb.eta ? `<br/>ETA: ${amb.eta} min` : ''}</div>`
          );
      });

    // Hospital markers
    hospitals.forEach((hosp) => {
      const color = hosp.status === 'full' ? '#ef4444' : '#10b981';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid #0e1526;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px ${color}80;">🏥</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([hosp.location.lat, hosp.location.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:monospace;font-size:11px;color:#0e1526"><strong>${hosp.name}</strong><br/>Beds: ${hosp.availableBeds}/${hosp.totalBeds}<br/>ICU: ${hosp.icuAvailable}/${hosp.icuBeds}<br/>Status: ${hosp.status}</div>`
        );
    });

    // Force a resize after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapRef} className={className} />;
}
