/**
 * offlineStorage.ts
 * Offline-first GPS queue backed by IndexedDB (via 'idb').
 *
 * Each ambulance gets its own object store: `gps_queue_<ambulanceId>`
 * so data is never shared across units even on a shared device.
 *
 * Testing (Chrome DevTools):
 *   1. DevTools → Network → Offline
 *   2. GPS records now accumulate here instead of hitting the API
 *   3. Application tab → IndexedDB → aes_offline → gps_queue_<id>
 *   4. Switch back to Online → useSyncManager drains the queue
 */

import { openDB, type IDBPDatabase } from 'idb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GPSRecord {
  id: string;           // UUID (crypto.randomUUID)
  ambulance_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;    // ISO 8601, device local time
  synced: boolean;      // false until successfully POSTed to backend
}

export interface PendingEmergency {
  id: string;
  ambulance_id: number;
  synced: boolean;
  timestamp: string;
  accident_description: string;
  emergency_type: string;
  severity: string;
  latitude: number;
  longitude: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME = 'aes_offline';
const DB_VERSION = 2;

// ── DB factory (one connection per ambulanceId call-site) ─────────────────────

function storeName(ambulanceId: number): string {
  return `gps_queue_${ambulanceId}`;
}

async function getDB(ambulanceId: number): Promise<IDBPDatabase> {
  const store = storeName(ambulanceId);
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('emergency_queue')) {
          db.createObjectStore('emergency_queue', { keyPath: 'id' });
        }
      }
    },
  });
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Save one GPS fix to the local queue.
 * Called when the device is offline (or network call fails).
 */
export async function saveLocation(
  ambulanceId: number,
  lat: number,
  lng: number,
): Promise<void> {
  const db = await getDB(ambulanceId);
  const record: GPSRecord = {
    id: crypto.randomUUID(),
    ambulance_id: ambulanceId,
    latitude: lat,
    longitude: lng,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  await db.put(storeName(ambulanceId), record);
}

/**
 * Return all records that haven't been successfully synced yet.
 * Used by useSyncManager to build the next batch payload.
 */
export async function getUnsyncedLocations(
  ambulanceId: number,
): Promise<GPSRecord[]> {
  const db = await getDB(ambulanceId);
  const all: GPSRecord[] = await db.getAll(storeName(ambulanceId));
  return all.filter((r) => !r.synced);
}

/**
 * Mark a set of records as synced=true (called after a successful batch POST).
 * Keeps them in IndexedDB until clearSynced() is called, so they can be
 * inspected in DevTools if needed.
 */
export async function markAsSynced(
  ambulanceId: number,
  ids: string[],
): Promise<void> {
  const db = await getDB(ambulanceId);
  const store = storeName(ambulanceId);
  const tx = db.transaction(store, 'readwrite');
  await Promise.all(
    ids.map(async (id) => {
      const record = await tx.store.get(id);
      if (record) {
        await tx.store.put({ ...record, synced: true });
      }
    }),
  );
  await tx.done;
}

/**
 * Delete all synced records from the local store.
 * Called once the entire sync run is complete.
 */
export async function clearSynced(ambulanceId: number): Promise<void> {
  const db = await getDB(ambulanceId);
  const store = storeName(ambulanceId);
  const tx = db.transaction(store, 'readwrite');
  const all: GPSRecord[] = await tx.store.getAll();
  await Promise.all(
    all.filter((r) => r.synced).map((r) => tx.store.delete(r.id)),
  );
  await tx.done;
}

/**
 * Return the count of unsynced records — used to drive the UI badge counter.
 */
export async function getPendingCount(ambulanceId: number): Promise<number> {
  const unsynced = await getUnsyncedLocations(ambulanceId);
  return unsynced.length;
}

// ── Emergency Form Offline Queue Functions ───────────────────────────────────

export async function saveEmergencyOffline(
  ambulanceId: number,
  formData: Omit<PendingEmergency, 'id' | 'synced' | 'timestamp'>
): Promise<void> {
  const db = await getDB(ambulanceId);
  const record: PendingEmergency = {
    ...formData,
    id: crypto.randomUUID(),
    synced: false,
    timestamp: new Date().toISOString(),
  };
  await db.put('emergency_queue', record);
}

export async function getUnsyncedEmergencies(
  ambulanceId: number
): Promise<PendingEmergency[]> {
  const db = await getDB(ambulanceId);
  const all: PendingEmergency[] = await db.getAll('emergency_queue');
  return all.filter((r) => r.ambulance_id === ambulanceId && !r.synced);
}

export async function markEmergencySynced(
  ambulanceId: number,
  ids: string[]
): Promise<void> {
  const db = await getDB(ambulanceId);
  const tx = db.transaction('emergency_queue', 'readwrite');
  await Promise.all(
    ids.map(async (id) => {
      const record = await tx.store.get(id);
      if (record && record.ambulance_id === ambulanceId) {
        await tx.store.put({ ...record, synced: true });
      }
    })
  );
  await tx.done;
}

export async function clearSyncedEmergencies(
  ambulanceId: number
): Promise<void> {
  const db = await getDB(ambulanceId);
  const tx = db.transaction('emergency_queue', 'readwrite');
  const all: PendingEmergency[] = await tx.store.getAll();
  await Promise.all(
    all
      .filter((r) => r.ambulance_id === ambulanceId && r.synced)
      .map((r) => tx.store.delete(r.id))
  );
  await tx.done;
}

export async function getPendingEmergencyCount(
  ambulanceId: number
): Promise<number> {
  const unsynced = await getUnsyncedEmergencies(ambulanceId);
  return unsynced.length;
}

