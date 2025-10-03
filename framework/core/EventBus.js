// framework/core/EventBus.js

/**
 * Central event bus for framework-wide event handling
 * Implements observer pattern for decoupled communication
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
    this._debugMode = false;
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this._debugMode = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }

    this._listeners.get(event).push(callback);

    if (this._debugMode) {
      console.log(`[EventBus] Listener registered for "${event}"`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
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
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
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
   * @param {string} event - Event name (optional, removes all if not provided)
   */
  clear(event) {
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
   * @returns {string[]}
   */
  getEvents() {
    return Array.from(this._listeners.keys());
  }

  /**
   * Get number of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  getListenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get total number of listeners across all events
   * @returns {number}
   */
  getTotalListeners() {
    let total = 0;
    for (const listeners of this._listeners.values()) {
      total += listeners.length;
    }
    return total;
  }
}