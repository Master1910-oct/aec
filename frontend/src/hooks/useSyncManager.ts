/**
 * useSyncManager.ts
 * Custom hook that drains the offline GPS queue when connectivity is restored.
 *
 * Usage:
 *   const { triggerSync } = useSyncManager(ambulanceId)
 *
 * The hook registers a window 'online' listener on mount and removes it on
 * unmount.  triggerSync() can also be called imperatively (e.g. from the
 * goOnline handler in AmbulancePanel).
 *
 * Retry strategy: exponential back-off, max 6 attempts per batch.
 * Delays (ms): 1000 → 2000 → 4000 → 8000 → 16000 → 30000
 * If all retries fail the batch is skipped and an error is logged; the records
 * stay in IndexedDB with synced=false and will be retried on the next sync run.
 *
 * Testing (Chrome DevTools):
 *   1. Go offline (Network → Offline) — GPS records accumulate in IndexedDB
 *   2. Go online — this hook fires triggerSync() automatically
 *   3. Watch badge: amber SYNCING → green "All records synced"
 *   4. IndexedDB store should be empty after clearSynced()
 */

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import {
  getUnsyncedLocations,
  markAsSynced,
  clearSynced,
  type GPSRecord,
  getUnsyncedEmergencies,
  markEmergencySynced,
  clearSyncedEmergencies,
  getPendingEmergencyCount,
} from '@/lib/offlineStorage';

// ── Constants ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BatchResponse {
  processed: number;
  skipped: number;
}

/**
 * POST one batch to /api/v1/ambulance/location/batch.
 * Returns the processed record IDs from the batch on success.
 * Throws on failure so the caller can retry.
 */
async function postBatch(batch: GPSRecord[]): Promise<string[]> {
  await api.post<{ data: BatchResponse }>('/api/v1/ambulance/location/batch', {
    records: batch,
  });
  // All records in the batch were accepted; return their IDs for markAsSynced()
  return batch.map((r) => r.id);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSyncManager(ambulanceId: number) {
  const setSyncing = useStore((s) => s.setSyncing);
  const setSyncCount = useStore((s) => s.setSyncCount);
  const submitEmergency = useStore((s) => s.submitEmergency);
  const setPendingEmergencyCount = useStore(s => s.setPendingEmergencyCount);

  const triggerSync = useCallback(async () => {
    // 1. Read all pending records
    const unsynced = await getUnsyncedLocations(ambulanceId);
    const pendingEmergencies = await getUnsyncedEmergencies(ambulanceId);

    // 2. Nothing to do → return early
    if (unsynced.length === 0 && pendingEmergencies.length === 0) return;

    // 3. Mark syncing in Zustand
    setSyncing(true);

    // 4. Split into batches of 50
    const batches: GPSRecord[][] = [];
    for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
      batches.push(unsynced.slice(i, i + BATCH_SIZE));
    }

    // 5. For each batch: POST with exponential back-off
    for (const batch of batches) {
      let success = false;
      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
        try {
          const syncedIds = await postBatch(batch);
          await markAsSynced(ambulanceId, syncedIds);
          success = true;
          break;
        } catch (err) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn(
            `[useSyncManager] Batch failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}). ` +
            `Retrying in ${delay}ms…`,
            err,
          );
          await sleep(delay);
        }
      }
      if (!success) {
        console.error(
          '[useSyncManager] Batch permanently failed after max retries. ' +
          'Records remain in IndexedDB and will be retried on next sync.',
          batch,
        );
      }
    }

    // 6. Remove successfully synced records from IndexedDB
    await clearSynced(ambulanceId);

    // ── Phase 2: Emergency form sync ──────────────────────────────────────────
    async function syncForms() {
      const pending = await getUnsyncedEmergencies(ambulanceId);
      if (pending.length === 0) return 0;

      let synced = 0;

      for (const record of pending) {
        const { id, synced: _, timestamp, ...payload } = record;

        const backoff = [1000, 2000, 4000, 8000, 16000, 30000];

        for (let attempt = 0; attempt < backoff.length; attempt++) {
          try {
            // Use the EXACT same action and payload shape as the
            // existing submitEmergency
            await submitEmergency(payload);
            await markEmergencySynced(ambulanceId, [id]);
            synced++;
            break;
          } catch {
            if (attempt < backoff.length - 1) {
              await sleep(backoff[attempt]);
            } else {
              console.error(`Failed to sync emergency ${id} after max retries`);
            }
          }
        }
      }

      await clearSyncedEmergencies(ambulanceId);
      return synced;
    }

    const formsSynced = await syncForms();

    // 7. Reset Zustand sync state
    setSyncing(false);
    setSyncCount(0);
    setPendingEmergencyCount(0);

    // 8. Success toast (Sonner)
    const gpsSynced = unsynced.length; // Approximate total processed in Phase 1
    if (gpsSynced > 0 || formsSynced > 0) {
      toast.success(
        `All synced — ${gpsSynced} GPS point${gpsSynced !== 1 ? 's' : ''}` +
        (formsSynced > 0
          ? `, ${formsSynced} emergency${formsSynced !== 1 ? 's' : ''} submitted`
          : ''),
        { duration: 4000 }
      );
    }
  }, [ambulanceId, setSyncing, setSyncCount, submitEmergency, setPendingEmergencyCount]);

  // Register / remove the window 'online' listener
  useEffect(() => {
    window.addEventListener('online', triggerSync);
    return () => {
      window.removeEventListener('online', triggerSync);
    };
  }, [triggerSync, ambulanceId]);

  return { triggerSync };
}
