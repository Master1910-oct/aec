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
  // Optional: pass ambulance/hospital coords directly for routing
  ambulance_latitude?: number | null;
  ambulance_longitude?: number | null;
  hospital_latitude?: number | null;
  hospital_longitude?: number | null;
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

// ─────────────────────────────────────────
// Fetch real road route from OSRM (free, no API key)
// ─────────────────────────────────────────
async function fetchRoadRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) return [];

    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
  } catch {
    return [];
  }
}

// Haversine distance for tooltip label
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Draw a road route: shows faint placeholder immediately, replaces with real route
function drawRoute(
  map: L.Map,
  layerStore: L.Layer[],
  from: [number, number],
  to: [number, number],
  color: string,
  tooltipLabel: string,
) {
  const placeholder = L.polyline([from, to], {
    color, weight: 2, opacity: 0.2, dashArray: '6,8',
  }).addTo(map);
  layerStore.push(placeholder);

  fetchRoadRoute(from, to).then(coords => {
    if (map.hasLayer(placeholder)) map.removeLayer(placeholder);
    const idx = layerStore.indexOf(placeholder);
    if (idx > -1) layerStore.splice(idx, 1);

    if (coords.length === 0) return;

    const line = L.polyline(coords, {
      color,
      weight: 5,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
    })
      .bindTooltip(tooltipLabel, {
        permanent: true,
        direction: 'center',
        className: 'dist-tooltip',
      })
      .addTo(map);

    layerStore.push(line);
  });
}

export default function LiveMap({
  ambulances = [],
  hospitals = [],
  emergencies = [],
  center,
  zoom = 12,
  className = '',
}: LiveMapProps) {
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
    return [
      all.reduce((s, c) => s + c[0], 0) / all.length,
      all.reduce((s, c) => s + c[1], 0) / all.length,
    ];
  };

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: computeCenter(),
      zoom,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update markers + routes when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
    markersRef.current = [];

    // 1. Ambulance markers
    ambulances.forEach(a => {
      if (!a.latitude || !a.longitude) return;
      const color = AMBULANCE_COLOR[a.status] ?? '#6b7280';
      const m = L.marker([a.latitude, a.longitude], { icon: makeIcon(ambulanceSvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:#22d3ee">🚑 ${a.vehicle_number}</b><br/>Driver: ${a.driver_name ?? '—'}<br/>Status: <span style="color:${color}">${a.status}</span></div>`)
        .addTo(map);
      markersRef.current.push(m);
    });

    // 2. Hospital markers
    hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const color = h.available_beds > 0 ? '#22c55e' : '#ef4444';
      const m = L.marker([h.latitude, h.longitude], { icon: makeIcon(hospitalSvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:${color}">🏥 ${h.name}</b><br/>Beds: <b>${h.available_beds}</b><br/><span style="color:${color}">${h.available_beds > 0 ? 'Accepting Patients' : 'At Capacity'}</span></div>`)
        .addTo(map);
      markersRef.current.push(m);
    });

    // 3. Emergency markers + two-color road routes
    emergencies.forEach(e => {
      if (!e.latitude || !e.longitude) return;
      if (['completed', 'cancelled'].includes(e.status)) return;

      const color = EMERGENCY_COLOR[e.severity] ?? '#6b7280';
      const emergencyCoord: [number, number] = [e.latitude, e.longitude];

      // Emergency scene marker
      const m = L.marker(emergencyCoord, { icon: makeIcon(emergencySvg(color)) })
        .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px"><b style="color:${color}">🚨 ${e.emergency_type}</b><br/>Status: <b>${e.status}</b><br/>Severity: <b style="color:${color}">${e.severity.toUpperCase()}</b></div>`)
        .addTo(map);
      markersRef.current.push(m);

      // ── 🟠 Route 1: Ambulance → Emergency scene ──────────────────
      const amb = ambulances.find(a => a.ambulance_id === e.ambulance_id);
      const ambLat = amb?.latitude ?? e.ambulance_latitude ?? null;
      const ambLng = amb?.longitude ?? e.ambulance_longitude ?? null;

      if (ambLat && ambLng) {
        const dist1 = getDistance(ambLat, ambLng, e.latitude, e.longitude);
        drawRoute(
          map, markersRef.current,
          [ambLat, ambLng],
          emergencyCoord,
          '#f97316',                       // 🟠 orange
          `🚑→🚨  ${dist1.toFixed(1)} km`,
        );
      }

      // ── 🟢 Route 2: Emergency scene → Hospital ───────────────────
      const hosp = hospitals.find(h => h.hospital_id !== undefined);
      const hospLat = hosp?.latitude ?? e.hospital_latitude ?? null;
      const hospLng = hosp?.longitude ?? e.hospital_longitude ?? null;

      if (hospLat && hospLng) {
        const dist2 = getDistance(e.latitude, e.longitude, hospLat, hospLng);
        drawRoute(
          map, markersRef.current,
          emergencyCoord,
          [hospLat, hospLng],
          '#22c55e',                       // 🟢 green
          `🚨→🏥  ${dist2.toFixed(1)} km`,
        );
      }
    });

    // Fit all markers in view
    const allCoords: [number, number][] = [
      ...ambulances.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number]),
      ...hospitals.filter(h => h.latitude && h.longitude).map(h => [h.latitude, h.longitude] as [number, number]),
      ...emergencies.filter(e => e.latitude && e.longitude).map(e => [e.latitude, e.longitude] as [number, number]),
    ];
    if (allCoords.length > 1 && !center) {
      try { map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60], maxZoom: 14 }); } catch { }
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], zoom);
    }
  }, [ambulances, hospitals, emergencies]);

  return (
    <>
      <style>{`
        .dist-tooltip {
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          font-family: monospace;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
      `}</style>
      <div
        ref={mapRef}
        className={className}
        style={{ background: '#0f172a', minHeight: '300px' }}
      />
    </>
  );
}