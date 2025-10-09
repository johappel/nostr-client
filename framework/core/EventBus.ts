// framework/core/EventBus.ts

import type { EventCallback, EventUnsubscriber, EventHandler } from '../types/index.js';

/**
 * Central event bus for framework-wide event handling
 * Implements observer pattern for decoupled communication
 */
export class EventBus {
  private _listeners = new Map<string, EventCallback[]>();
  private _debugMode = false;

  /**
   * Enable/disable debug logging
   * @param enabled Debug mode aktivieren/deaktivieren
   */
  setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Register event listener
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on<T = any>(event: string, callback: EventCallback<T>): EventUnsubscriber {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }

    this._listeners.get(event)!.push(callback);

    if (this._debugMode) {
      console.log(`[EventBus] Listener registered for "${event}"`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param callback Callback function
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      if (this._debugMode) {
        console.log(`[EventBus] Listener removed for "${event}"`);
      }
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Register one-time event listener
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  once<T = any>(event: string, callback: EventCallback<T>): EventUnsubscriber {
    const onceWrapper = (data: T) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Emit event to all listeners
   * @param event Event name
   * @param data Event data
   */
  emit<T = any>(event: string, data?: T): void {
    const listeners = this._listeners.get(event);

    if (this._debugMode) {
      console.log(`[EventBus] Emitting "${event}"`, data);
    }

    if (!listeners || listeners.length === 0) {
      if (this._debugMode) {
        console.log(`[EventBus] No listeners for "${event}"`);
      }
      return;
    }

    // Call all listeners with error handling
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
        this.emit('error', { event, error });
      }
    });
  }

  /**
   * Remove all listeners for an event
   * @param event Event name (optional, removes all if not provided)
   */
  clear(event?: string): void {
    if (event) {
      this._listeners.delete(event);
      if (this._debugMode) {
        console.log(`[EventBus] Cleared all listeners for "${event}"`);
      }
    } else {
      this._listeners.clear();
      if (this._debugMode) {
        console.log('[EventBus] Cleared all listeners');
      }
    }
  }

  /**
   * Get list of active event names
   * @returns Array of event names
   */
  getEvents(): string[] {
    return Array.from(this._listeners.keys());
  }

  /**
   * Get number of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  getListenerCount(event: string): number {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get total number of listeners across all events
   * @returns Total number of listeners
   */
  getTotalListeners(): number {
    let total = 0;
    for (const listeners of this._listeners.values()) {
      total += listeners.length;
    }
    return total;
  }
}