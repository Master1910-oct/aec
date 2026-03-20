import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Marker Cluster (loaded from CDN in useEffect) ─────────────────────────────
// We load leaflet.markercluster dynamically to avoid SSR issues

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

// ── SVG icons ────────────────────────────────────────────────────────────────
const ambulanceSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="${color}" fill-opacity="0.9" stroke="#fff" stroke-width="2"/>
    <text x="18" y="24" text-anchor="middle" font-size="16">🚑</text>
  </svg>`;

const hospitalSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.85" stroke="#fff" stroke-width="1.5"/>
    <text x="16" y="21" text-anchor="middle" font-size="13">🏥</text>
  </svg>`;

const emergencySvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="${color}" fill-opacity="0.9" stroke="#fff" stroke-width="2"/>
    <text x="18" y="24" text-anchor="middle" font-size="16">🚨</text>
  </svg>`;

const makeIcon = (svg: string, size: number) => L.divIcon({
  html: svg,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -(size / 2) - 4],
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

// ── OSRM road routing ─────────────────────────────────────────────────────────
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
  } catch { return []; }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function drawRoute(
  map: L.Map, layerStore: L.Layer[],
  from: [number, number], to: [number, number],
  color: string, label: string
) {
  const placeholder = L.polyline([from, to], { color, weight: 2, opacity: 0.2, dashArray: '6,8' }).addTo(map);
  layerStore.push(placeholder);

  fetchRoadRoute(from, to).then(coords => {
    if (map.hasLayer(placeholder)) map.removeLayer(placeholder);
    const idx = layerStore.indexOf(placeholder);
    if (idx > -1) layerStore.splice(idx, 1);
    if (!coords.length) return;

    const line = L.polyline(coords, { color, weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' })
      .bindTooltip(label, { permanent: true, direction: 'center', className: 'dist-tooltip' })
      .addTo(map);
    layerStore.push(line);
  });
}

// ── Inject cluster CSS + script once ─────────────────────────────────────────
function ensureClusterAssets(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).__clusterLoaded) { resolve(); return; }

    // CSS
    if (!document.getElementById('cluster-css')) {
      const link = document.createElement('link');
      link.id = 'cluster-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.min.css';
      document.head.appendChild(link);

      const link2 = document.createElement('link');
      link2.id = 'cluster-css2';
      link2.rel = 'stylesheet';
      link2.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.min.css';
      document.head.appendChild(link2);
    }

    // JS
    if (!document.getElementById('cluster-js')) {
      const script = document.createElement('script');
      script.id = 'cluster-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js';
      script.onload = () => { (window as any).__clusterLoaded = true; resolve(); };
      script.onerror = () => resolve(); // fallback gracefully
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveMap({
  ambulances = [],
  hospitals = [],
  emergencies = [],
  center,
  zoom = 7,
  className = '',
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const computeCenter = (): [number, number] => {
    if (center) return center;
    const all = [
      ...ambulances.map(a => [a.latitude, a.longitude] as [number, number]),
      ...hospitals.map(h => [h.latitude, h.longitude] as [number, number]),
      ...emergencies.map(e => [e.latitude, e.longitude] as [number, number]),
    ].filter(([lat, lng]) => lat && lng);
    if (!all.length) return [11.0, 78.5]; // Tamil Nadu center
    return [
      all.reduce((s, c) => s + c[0], 0) / all.length,
      all.reduce((s, c) => s + c[1], 0) / all.length,
    ];
  };

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: computeCenter(), zoom, zoomControl: true, attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    ensureClusterAssets().then(() => {
      // Clear old layers
      layersRef.current.forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
      layersRef.current = [];

      const MC = (window as any).L?.markerClusterGroup;

      // ── Ambulance cluster ──────────────────────────────────────────────────
      const ambCluster = MC ? MC({
        maxClusterRadius: 60,
        iconCreateFunction: (cluster: any) => L.divIcon({
          html: `<div class="cluster-icon cluster-amb">${cluster.getChildCount()}</div>`,
          className: '', iconSize: [40, 40],
        }),
      }) : null;

      ambulances.forEach(a => {
        if (!a.latitude || !a.longitude) return;
        const color = AMBULANCE_COLOR[a.status] ?? '#6b7280';
        const m = L.marker([a.latitude, a.longitude], { icon: makeIcon(ambulanceSvg(color), 36) })
          .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px">
            <b style="color:#22d3ee">🚑 ${a.vehicle_number}</b><br/>
            Driver: ${a.driver_name ?? '—'}<br/>
            Status: <span style="color:${color}">${a.status}</span>
          </div>`);
        ambCluster ? ambCluster.addLayer(m) : m.addTo(map);
      });
      if (ambCluster) { map.addLayer(ambCluster); layersRef.current.push(ambCluster); }

      // ── Hospital cluster ───────────────────────────────────────────────────
      const hospCluster = MC ? MC({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => L.divIcon({
          html: `<div class="cluster-icon cluster-hosp">${cluster.getChildCount()}</div>`,
          className: '', iconSize: [36, 36],
        }),
      }) : null;

      hospitals.forEach(h => {
        if (!h.latitude || !h.longitude) return;
        const color = h.available_beds > 0 ? '#22c55e' : '#ef4444';
        const m = L.marker([h.latitude, h.longitude], { icon: makeIcon(hospitalSvg(color), 32) })
          .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px">
            <b style="color:${color}">🏥 ${h.name}</b><br/>
            Beds: <b>${h.available_beds}</b><br/>
            <span style="color:${color}">${h.available_beds > 0 ? 'Accepting Patients' : 'At Capacity'}</span>
          </div>`);
        hospCluster ? hospCluster.addLayer(m) : m.addTo(map);
      });
      if (hospCluster) { map.addLayer(hospCluster); layersRef.current.push(hospCluster); }

      // ── Emergencies + routes (never clustered — always visible) ───────────
      emergencies.forEach(e => {
        if (!e.latitude || !e.longitude) return;
        if (['completed', 'cancelled'].includes(e.status)) return;

        const color = EMERGENCY_COLOR[e.severity] ?? '#6b7280';
        const emergencyCoord: [number, number] = [e.latitude, e.longitude];

        const m = L.marker(emergencyCoord, { icon: makeIcon(emergencySvg(color), 36), zIndexOffset: 1000 })
          .bindPopup(`<div style="font:12px monospace;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;min-width:150px">
            <b style="color:${color}">🚨 ${e.emergency_type}</b><br/>
            Status: <b>${e.status}</b><br/>
            Severity: <b style="color:${color}">${e.severity.toUpperCase()}</b>
          </div>`)
          .addTo(map);
        layersRef.current.push(m);

        // 🟠 Ambulance → Scene
        const amb = ambulances.find(a => a.ambulance_id === e.ambulance_id);
        const ambLat = amb?.latitude ?? e.ambulance_latitude ?? null;
        const ambLng = amb?.longitude ?? e.ambulance_longitude ?? null;
        if (ambLat && ambLng) {
          const d = getDistance(ambLat, ambLng, e.latitude, e.longitude);
          drawRoute(map, layersRef.current, [ambLat, ambLng], emergencyCoord, '#f97316', `🚑→🚨 ${d.toFixed(1)} km`);
        }

        // 🟢 Scene → Hospital
        const hosp = hospitals.find(h => h.hospital_id !== undefined);
        const hospLat = hosp?.latitude ?? e.hospital_latitude ?? null;
        const hospLng = hosp?.longitude ?? e.hospital_longitude ?? null;
        if (hospLat && hospLng) {
          const d = getDistance(e.latitude, e.longitude, hospLat, hospLng);
          drawRoute(map, layersRef.current, emergencyCoord, [hospLat, hospLng], '#22c55e', `🚨→🏥 ${d.toFixed(1)} km`);
        }
      });

      // Fit all coords
      const allCoords: [number, number][] = [
        ...ambulances.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number]),
        ...hospitals.filter(h => h.latitude && h.longitude).map(h => [h.latitude, h.longitude] as [number, number]),
        ...emergencies.filter(e => e.latitude && e.longitude).map(e => [e.latitude, e.longitude] as [number, number]),
      ];
      if (allCoords.length > 1 && !center) {
        try { map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40], maxZoom: 13 }); } catch { }
      } else if (allCoords.length === 1) {
        map.setView(allCoords[0], zoom);
      }
    });
  }, [ambulances, hospitals, emergencies]);

  return (
    <>
      <style>{`
        .dist-tooltip {
          background: rgba(15,23,42,0.88);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          font-family: monospace;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-family: monospace;
          font-weight: bold;
          font-size: 13px;
          color: #fff;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(255,255,255,0.4);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .cluster-amb  { background: radial-gradient(circle, #16a34a, #15803d); }
        .cluster-hosp { background: radial-gradient(circle, #2563eb, #1d4ed8); }
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large { background: transparent !important; border: none !important; box-shadow: none !important; }
        .marker-cluster-small div,
        .marker-cluster-medium div,
        .marker-cluster-large div { display: none; }
      `}</style>
      <div ref={mapRef} className={className} style={{ background: '#0f172a', minHeight: '300px' }} />
    </>
  );
}