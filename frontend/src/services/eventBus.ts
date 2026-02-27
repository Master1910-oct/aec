import type { EngineEvent } from '@/types';

type EventListener = (event: EngineEvent) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();
  private eventLog: EngineEvent[] = [];

  emit(type: EngineEvent['type'], payload: Record<string, unknown>) {
    const event: EngineEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      timestamp: new Date(),
    };

    this.eventLog.push(event);
    if (this.eventLog.length > 200) this.eventLog.shift();

    console.log(`[EventBus] ${type}`, payload);

    // Notify type-specific listeners
    this.listeners.get(type)?.forEach((fn) => fn(event));
    // Notify global listeners
    this.globalListeners.forEach((fn) => fn(event));
  }

  on(type: EngineEvent['type'], listener: EventListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAll(listener: EventListener) {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  getLog(): EngineEvent[] {
    return [...this.eventLog];
  }

  getLogByType(type: EngineEvent['type']): EngineEvent[] {
    return this.eventLog.filter((e) => e.type === type);
  }
}

export const eventBus = new EventBus();
