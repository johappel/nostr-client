// framework/plugins/storage/StoragePlugin.js

/**
 * Base interface for storage plugins
 */
export class StoragePlugin {
  constructor() {
    this.name = 'base';
    this._initialized = false;
  }

  /**
   * Initialize storage
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error(`${this.name}: initialize() must be implemented`);
  }

  /**
   * Save events
   * @param {Event[]} events - Events to save
   * @returns {Promise<number>} Number of events saved
   */
  async save(events) {
    throw new Error(`${this.name}: save() must be implemented`);
  }

  /**
   * Query events
   * @param {Filter[]} filters - Nostr filters
   * @returns {Promise<Event[]>}
   */
  async query(filters) {
    throw new Error(`${this.name}: query() must be implemented`);
  }

  /**
   * Delete events
   * @param {string[]} eventIds - Event IDs to delete
   * @returns {Promise<number>} Number of events deleted
   */
  async delete(eventIds) {
    throw new Error(`${this.name}: delete() must be implemented`);
  }

  /**
   * Clear all events
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error(`${this.name}: clear() must be implemented`);
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    throw new Error(`${this.name}: getStats() must be implemented`);
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
}