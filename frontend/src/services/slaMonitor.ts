import type { SLARecord } from '@/types';
import { eventBus } from './eventBus';

const SLA_THRESHOLD_MS = 15_000; // 15 seconds

class SLAMonitor {
  private records: Map<string, SLARecord> = new Map();

  startTracking(emergencyRequestId: string, hospitalId: string): SLARecord {
    const record: SLARecord = {
      id: `SLA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      emergencyRequestId,
      hospitalId,
      requestTime: new Date(),
      violated: false,
      threshold: SLA_THRESHOLD_MS,
    };
    this.records.set(emergencyRequestId, record);
    return record;
  }

  markAssigned(emergencyRequestId: string) {
    const record = this.records.get(emergencyRequestId);
    if (record) {
      record.assignmentTime = new Date();
      this.records.set(emergencyRequestId, record);
    }
  }

  markConfirmed(emergencyRequestId: string): SLARecord | null {
    const record = this.records.get(emergencyRequestId);
    if (!record) return null;

    record.confirmationTime = new Date();
    record.responseTimeMs = record.confirmationTime.getTime() - record.requestTime.getTime();
    record.violated = record.responseTimeMs > record.threshold;

    if (record.violated) {
      eventBus.emit('sla_warning', {
        emergencyRequestId,
        hospitalId: record.hospitalId,
        responseTimeMs: record.responseTimeMs,
        threshold: record.threshold,
      });
    }

    this.records.set(emergencyRequestId, record);
    return record;
  }

  markViolated(emergencyRequestId: string): SLARecord | null {
    const record = this.records.get(emergencyRequestId);
    if (!record) return null;
    record.violated = true;
    record.responseTimeMs = Date.now() - record.requestTime.getTime();
    this.records.set(emergencyRequestId, record);

    eventBus.emit('sla_warning', {
      emergencyRequestId,
      hospitalId: record.hospitalId,
      responseTimeMs: record.responseTimeMs,
      threshold: record.threshold,
      reason: 'timeout',
    });

    return record;
  }

  getRecord(emergencyRequestId: string): SLARecord | undefined {
    return this.records.get(emergencyRequestId);
  }

  getAllRecords(): SLARecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Compute new reliability score for a hospital based on SLA history.
   * Returns 0-1 (1 = perfect).
   */
  computeReliabilityScore(hospitalId: string): number {
    const hospitalRecords = Array.from(this.records.values()).filter(
      (r) => r.hospitalId === hospitalId && r.confirmationTime
    );
    if (hospitalRecords.length === 0) return 0.85; // default

    const compliant = hospitalRecords.filter((r) => !r.violated).length;
    return compliant / hospitalRecords.length;
  }
}

export const slaMonitor = new SLAMonitor();
