/**
 * EventBus - Custom pub/sub event broadcasting system
 * Supports type-specific and global listeners
 * Maintains an event log (max 200 events)
 */

import type { EngineEvent, EventType } from '@/lib/types';

type EventListener = (event: EngineEvent) => void;
type GlobalListener = (event: EngineEvent) => void;

export class EventBus {
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private globalListeners: Set<GlobalListener> = new Set();
  private eventLog: EngineEvent[] = [];
  private maxLogSize = 200;

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType: EventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Subscribe to all events (global listener)
   */
  subscribeGlobal(listener: GlobalListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Emit an event
   */
  emit(event: EngineEvent): void {
    // Add to event log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Notify type-specific listeners
    this.listeners.get(event.type)?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });

    // Notify global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in global event listener:', error);
      }
    });
  }

  /**
   * Get event log (optionally filter by type)
   */
  getEventLog(eventType?: EventType): EngineEvent[] {
    if (!eventType) {
      return [...this.eventLog];
    }
    return this.eventLog.filter((e) => e.type === eventType);
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get number of listeners for a specific event type
   */
  getListenerCount(eventType: EventType): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  /**
   * Get total number of global listeners
   */
  getGlobalListenerCount(): number {
    return this.globalListeners.size;
  }
}

// Singleton instance
export const eventBus = new EventBus();
