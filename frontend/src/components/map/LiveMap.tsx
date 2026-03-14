import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapAmbulance {
  ambulance_id: number;
  vehicle_number: string;
  driver_name: string | null;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'ON_CALL' | 'MAINTENANCE';
}

export interface MapHospital {
  hospital_id: number;
  name: string;
  available_beds: number;
  latitude: number;
  longitude: number;
  status: 'GREEN' | 'RED';
}

export interface MapEmergency {
  emergency_id: number;
  emergency_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  latitude: number;
  longitude: number;
  status: string;
  ambulance_id?: number | null;
}

interface LiveMapProps {
  ambulances?: MapAmbulance[];
  hospitals?: MapHospital[];
  emergencies?: MapEmergency[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const ambulanceSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.85" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><text x="20" y="26" text-anchor="middle" font-size="17">🚑</text></svg>`;
const hospitalSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.85" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><text x="20" y="26" text-anchor="middle" font-size="17">🏥</text></svg>`;
const emergencySvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.85" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><text x="20" y="26" text-anchor="middle" font-size="17">🚨</text></svg>`;

const makeIcon = (svg: string) => L.divIcon({
  html: svg,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

const AMBULANCE_COLOR: Record<string, string> = {
  AVAILABLE: '#22c55e',
  ON_CALL: '#f97316',
  MAINTENANCE: '#6b7280',
};

const EMERGENCY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// Utils
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LiveMap({ ambulances = [], hospitals = [], emergencies = [], center, zoom = 12, className = '' }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);

  const computeCenter = (): [number, number] => {
    if (center) return center;
    const all = [
      ...ambulances.map(a => [a.latitude, a.longitude] as [number, number]),
      ...hospitals.map(h => [h.latitude, h.longitude] as [number, number]),
      ...emergencies.map(e => [e.latitude, e.longitude] as [number, number]),
    ].filter(([lat, lng]) => lat && lng);
    if (all.length === 0) return [13.0827, 80.2707];
    return [all.reduce((s, c) => s + c[0], 0) / all.length, all.reduce((s, c) => s + c[1], 0) / all.length];
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: computeCenter(), zoom, zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // 1. Ambulances
    ambulances.forEach(a => {
      if (!a.latitude || !a.longitude) return;
      const color = AMBULANCE_COLOR[a.status] ?? '#6b7280';
      const m = L.marker([a.latitude, a.longitude], { icon: makeIcon(ambulanceSvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:#22d3ee">🚑 ${a.vehicle_number}</b><br/>Driver: ${a.driver_name ?? '—'}<br/>Status: <span style="color:${color}">${a.status}</span></div>`)
        .addTo(map);
      markersRef.current.push(m);
    });

    // 2. Hospitals
    hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const color = h.available_beds > 0 ? '#22c55e' : '#ef4444';
      const m = L.marker([h.latitude, h.longitude], { icon: makeIcon(hospitalSvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:${color}">🏥 ${h.name}</b><br/>Beds available: <b>${h.available_beds}</b><br/><span style="color:${color}">${h.available_beds > 0 ? 'Accepting Patients' : 'At Capacity'}</span></div>`)
        .addTo(map);
      markersRef.current.push(m);
    });

    // 3. Emergencies
    emergencies.forEach(e => {
      if (!e.latitude || !e.longitude) return;
      if (['completed', 'cancelled'].includes(e.status)) return;
      
      const color = EMERGENCY_COLOR[e.severity] ?? '#6b7280';
      const m = L.marker([e.latitude, e.longitude], { icon: makeIcon(emergencySvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:${color}">🚨 ${e.emergency_type}</b><br/>Status: <b>${e.status}</b><br/>Severity: <b style="color:${color}">${e.severity.toUpperCase()}</b></div>`)
        .addTo(map);
      markersRef.current.push(m);

      // Draw polyline if ambulance is assigned
      if (e.ambulance_id) {
        const amb = ambulances.find(a => a.ambulance_id === e.ambulance_id);
        if (amb && amb.latitude && amb.longitude) {
          const dist = getDistance(amb.latitude, amb.longitude, e.latitude, e.longitude);
          const line = L.polyline([[amb.latitude, amb.longitude], [e.latitude, e.longitude]], {
            color: color,
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10',
          })
          .bindTooltip(`Est. ${dist.toFixed(1)} km`, { permanent: true, direction: 'center', className: 'dist-tooltip' })
          .addTo(map);
          markersRef.current.push(line);
        }
      }
    });

    const allCoords: [number, number][] = [
      ...ambulances.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number]),
      ...hospitals.filter(h => h.latitude && h.longitude).map(h => [h.latitude, h.longitude] as [number, number]),
      ...emergencies.filter(e => e.latitude && e.longitude).map(e => [e.latitude, e.longitude] as [number, number]),
    ];
    if (allCoords.length > 1 && !center) {
      try { map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14 }); } catch {}
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], zoom);
    }
  }, [ambulances, hospitals, emergencies]);

  return (
    <>
      <style>{`
        .dist-tooltip {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-family: monospace;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
      <div ref={mapRef} className={className} style={{ background: '#0f172a', minHeight: '300px' }} />
    </>
  );
}
