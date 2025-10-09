// framework/core/StorageManager.ts

import { EventBus } from './EventBus.js';
import type {
  SignedEvent,
  StoragePlugin,
  StorageStats,
  EventCallback,
  EventUnsubscriber
} from '../types/index.js';

/**
 * Manages local event storage
 */
export class StorageManager {
  private _eventBus: EventBus;
  private _plugin: StoragePlugin | null = null;
  private _syncEnabled = false;
  private _relayManager: any = null;
  private _syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(eventBus: EventBus | null = null) {
    this._eventBus = eventBus || new EventBus();
  }

  /**
   * Initialize with storage plugin
   * @param plugin Storage plugin instance
   */
  async initialize(plugin: StoragePlugin): Promise<void> {
    if (!plugin) {
      throw new Error('Storage plugin is required');
    }

    console.log(`[StorageManager] Initializing with ${plugin.name}...`);

    this._plugin = plugin;

    if (!plugin.isInitialized()) {
      await plugin.initialize();
    }

    console.log('[StorageManager] Initialized');
    this._eventBus.emit('storage:initialized', { plugin: plugin.name });
  }

  /**
   * Set relay manager for sync operations
   * @param relayManager RelayManager instance
   */
  setRelayManager(relayManager: any): void {
    this._relayManager = relayManager;
    console.log('[StorageManager] RelayManager set');
  }

  /**
   * Save events to storage
   * @param events Events to save
   * @returns Promise resolving to number of events saved
   */
  async save(events: SignedEvent[] | SignedEvent): Promise<number> {
    this._ensureInitialized();

    const eventArray = Array.isArray(events) ? events : [events];
    console.log(`[StorageManager] Saving ${eventArray.length} events...`);

    try {
      const count = await this._plugin!.save(eventArray);

      console.log(`[StorageManager] Saved ${count} events`);
      this._eventBus.emit('storage:saved', { count, total: eventArray.length });

      return count;
    } catch (error) {
      console.error('[StorageManager] Save failed:', error);
      this._eventBus.emit('storage:error', { method: 'save', error });
      throw error;
    }
  }

  /**
   * Query events from storage
   * @param filters Nostr filters
   * @returns Promise resolving to events
   */
  async query(filters: any[]): Promise<SignedEvent[]> {
    this._ensureInitialized();

    console.log('[StorageManager] Querying local storage...', filters);

    try {
      const events = await this._plugin!.query(filters);

      console.log(`[StorageManager] Query returned ${events.length} events`);
      this._eventBus.emit('storage:queried', { filters, count: events.length });

      return events;
    } catch (error) {
      console.error('[StorageManager] Query failed:', error);
      this._eventBus.emit('storage:error', { method: 'query', error });
      throw error;
    }
  }

  /**
   * Delete events from storage
   * @param eventIds Event IDs to delete
   * @returns Promise resolving to number of events deleted
   */
  async delete(eventIds: string[] | string): Promise<number> {
    this._ensureInitialized();

    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    console.log(`[StorageManager] Deleting ${ids.length} events...`);

    try {
      const count = await this._plugin!.delete(ids);

      console.log(`[StorageManager] Deleted ${count} events`);
      this._eventBus.emit('storage:deleted', { count, total: ids.length });

      return count;
    } catch (error) {
      console.error('[StorageManager] Delete failed:', error);
      this._eventBus.emit('storage:error', { method: 'delete', error });
      throw error;
    }
  }

  /**
   * Clear all events from storage
   */
  async clear(): Promise<void> {
    this._ensureInitialized();

    console.log('[StorageManager] Clearing all events...');

    try {
      await this._plugin!.clear();

      console.log('[StorageManager] Storage cleared');
      this._eventBus.emit('storage:cleared', {});
    } catch (error) {
      console.error('[StorageManager] Clear failed:', error);
      this._eventBus.emit('storage:error', { method: 'clear', error });
      throw error;
    }
  }

  /**
   * Get storage statistics
   * @returns Promise resolving to storage stats
   */
  async getStats(): Promise<StorageStats> {
    this._ensureInitialized();

    try {
      const stats = await this._plugin!.getStats();
      return stats;
    } catch (error) {
      console.error('[StorageManager] Get stats failed:', error);
      throw error;
    }
  }

  /**
   * Sync local events with relays
   * @param options Sync options
   */
  async sync(options: {
    filters?: any[];
    since?: number | null;
    bidirectional?: boolean;
  } = {}): Promise<{ saved: number; total: number }> {
    this._ensureInitialized();

    if (!this._relayManager) {
      throw new Error('RelayManager not set. Call setRelayManager() first.');
    }

    const {
      filters = [{}],
      since = null,
      bidirectional = false
    } = options;

    console.log('[StorageManager] Starting sync...');

    try {
      // Fetch from relays
      const remoteEvents = await this._relayManager.query(filters, {
        since: since || this._getLastSyncTimestamp()
      });

      // Save to local storage
      const saved = await this.save(remoteEvents);

      // Optionally push local events to relays
      if (bidirectional) {
        // TODO: Implement bidirectional sync
        console.log('[StorageManager] Bidirectional sync not yet implemented');
      }

      // Update sync timestamp
      this._setLastSyncTimestamp(Date.now());

      console.log(`[StorageManager] Sync complete: ${saved} events synced`);
      this._eventBus.emit('storage:synced', { saved, total: remoteEvents.length });

      return { saved, total: remoteEvents.length };
    } catch (error) {
      console.error('[StorageManager] Sync failed:', error);
      this._eventBus.emit('storage:error', { method: 'sync', error });
      throw error;
    }
  }

  /**
   * Enable/disable auto-sync
   * @param enabled Whether to enable auto-sync
   * @param intervalMs Sync interval in milliseconds
   */
  setAutoSync(enabled: boolean, intervalMs: number = 60000): void {
    if (enabled && !this._syncEnabled) {
      this._syncEnabled = true;
      this._syncInterval = setInterval(() => {
        this.sync().catch(err =>
          console.error('[StorageManager] Auto-sync failed:', err)
        );
      }, intervalMs);

      console.log(`[StorageManager] Auto-sync enabled (${intervalMs}ms)`);
    } else if (!enabled && this._syncEnabled) {
      this._syncEnabled = false;
      if (this._syncInterval) {
        clearInterval(this._syncInterval);
        this._syncInterval = null;
      }

      console.log('[StorageManager] Auto-sync disabled');
    }
  }

  /**
   * Listen to storage events
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get last sync timestamp
   * @private
   */
  private _getLastSyncTimestamp(): number {
    try {
      const stored = localStorage.getItem('nostr_last_sync');
      return stored ? parseInt(stored, 10) : Math.floor(Date.now() / 1000) - 86400; // Default: 24h ago
    } catch {
      return Math.floor(Date.now() / 1000) - 86400;
    }
  }

  /**
   * Set last sync timestamp
   * @private
   */
  private _setLastSyncTimestamp(timestamp: number): void {
    try {
      localStorage.setItem('nostr_last_sync', String(Math.floor(timestamp / 1000)));
    } catch (error) {
      console.warn('[StorageManager] Failed to set last sync timestamp:', error);
    }
  }

  /**
   * Ensure storage is initialized
   * @private
   */
  private _ensureInitialized(): void {
    if (!this._plugin || !this._plugin.isInitialized()) {
      throw new Error('StorageManager not initialized. Call initialize() first.');
    }
  }
}