// framework/plugins/storage/LocalStoragePlugin.ts

import { StoragePlugin, StorageFilter } from './StoragePlugin.js';
import type { SignedEvent } from '../../types/index.js';

export interface LocalStorageConfig {
  keyPrefix?: string;
  maxEvents?: number;
}

/**
 * Simple localStorage-based storage plugin
 * Limited by localStorage size constraints (~5-10MB)
 */
export class LocalStoragePlugin extends StoragePlugin {
  private _keyPrefix: string;
  private _indexKey: string;
  private _maxEvents: number;

  constructor(config: LocalStorageConfig = {}) {
    super();
    this.name = 'localstorage';
    this._keyPrefix = config.keyPrefix || 'nostr_events_';
    this._indexKey = this._keyPrefix + 'index';
    this._maxEvents = config.maxEvents || 1000;
  }

  async initialize(): Promise<void> {
    console.log('[LocalStoragePlugin] Initializing...');
    
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      throw new Error('[LocalStoragePlugin] localStorage not available');
    }

    // Ensure index exists
    if (!localStorage.getItem(this._indexKey)) {
      localStorage.setItem(this._indexKey, JSON.stringify([]));
    }

    this._markInitialized();
    console.log('[LocalStoragePlugin] Initialized');
  }

  async save(events: SignedEvent[]): Promise<number> {
    const eventArray = Array.isArray(events) ? events : [events];
    let saved = 0;

    const index = this._getIndex();

    for (const event of eventArray) {
      try {
        const key = this._keyPrefix + event.id;
        localStorage.setItem(key, JSON.stringify(event));
        
        if (!index.includes(event.id)) {
          index.push(event.id);
        }
        
        saved++;
      } catch (error) {
        console.error('[LocalStoragePlugin] Failed to save event:', error);
        // Quota exceeded
        if ((error as Error).name === 'QuotaExceededError') {
          console.warn('[LocalStoragePlugin] Storage quota exceeded');
          // Try to free up space by removing oldest events
          await this._cleanup();
          break;
        }
      }
    }

    // Limit number of events
    if (index.length > this._maxEvents) {
      const toRemove = index.slice(0, index.length - this._maxEvents);
      await this.delete(toRemove);
    }

    this._setIndex(index);
    console.log(`[LocalStoragePlugin] Saved ${saved}/${eventArray.length} events`);
    
    return saved;
  }

  async query(filters: StorageFilter[]): Promise<SignedEvent[]> {
    const index = this._getIndex();
    const events: SignedEvent[] = [];

    for (const eventId of index) {
      try {
        const key = this._keyPrefix + eventId;
        const data = localStorage.getItem(key);
        
        if (data) {
          const event = JSON.parse(data) as SignedEvent;
          
          // Apply filters
          if (this._matchesFilters(event, filters)) {
            events.push(event);
          }
        }
      } catch (error) {
        console.error('[LocalStoragePlugin] Failed to load event:', eventId, error);
        // Remove broken event from index
        this._removeFromIndex(eventId);
      }
    }

    // Sort by created_at (newest first)
    events.sort((a, b) => b.created_at - a.created_at);

    return events;
  }

  async delete(eventIds: string[]): Promise<number> {
    let deleted = 0;
    const index = this._getIndex();

    for (const eventId of eventIds) {
      try {
        const key = this._keyPrefix + eventId;
        localStorage.removeItem(key);
        
        const indexPos = index.indexOf(eventId);
        if (indexPos > -1) {
          index.splice(indexPos, 1);
        }
        
        deleted++;
      } catch (error) {
        console.error('[LocalStoragePlugin] Failed to delete event:', eventId, error);
      }
    }

    this._setIndex(index);
    console.log(`[LocalStoragePlugin] Deleted ${deleted}/${eventIds.length} events`);
    
    return deleted;
  }

  async clear(): Promise<void> {
    console.log('[LocalStoragePlugin] Clearing all events...');
    
    const index = this._getIndex();
    
    for (const eventId of index) {
      const key = this._keyPrefix + eventId;
      localStorage.removeItem(key);
    }
    
    localStorage.setItem(this._indexKey, JSON.stringify([]));
    
    console.log('[LocalStoragePlugin] All events cleared');
  }

  async getStats(): Promise<{
    totalEvents: number;
    totalSize: number;
    oldestEvent?: number;
    newestEvent?: number;
  }> {
    const index = this._getIndex();
    let totalSize = 0;
    let oldestEvent: number | undefined;
    let newestEvent: number | undefined;

    for (const eventId of index) {
      try {
        const key = this._keyPrefix + eventId;
        const data = localStorage.getItem(key);
        
        if (data) {
          totalSize += data.length;
          const event = JSON.parse(data) as SignedEvent;
          
          if (!oldestEvent || event.created_at < oldestEvent) {
            oldestEvent = event.created_at;
          }
          if (!newestEvent || event.created_at > newestEvent) {
            newestEvent = event.created_at;
          }
        }
      } catch (error) {
        console.error('[LocalStoragePlugin] Error reading event for stats:', eventId);
      }
    }

    return {
      totalEvents: index.length,
      totalSize,
      oldestEvent,
      newestEvent
    };
  }

  /**
   * Get event index from localStorage
   */
  private _getIndex(): string[] {
    try {
      const data = localStorage.getItem(this._indexKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocalStoragePlugin] Failed to parse index, resetting:', error);
      return [];
    }
  }

  /**
   * Save event index to localStorage
   */
  private _setIndex(index: string[]): void {
    try {
      localStorage.setItem(this._indexKey, JSON.stringify(index));
    } catch (error) {
      console.error('[LocalStoragePlugin] Failed to save index:', error);
    }
  }

  /**
   * Remove event from index
   */
  private _removeFromIndex(eventId: string): void {
    const index = this._getIndex();
    const pos = index.indexOf(eventId);
    if (pos > -1) {
      index.splice(pos, 1);
      this._setIndex(index);
    }
  }

  /**
   * Clean up storage by removing oldest events
   */
  private async _cleanup(): Promise<void> {
    console.log('[LocalStoragePlugin] Running cleanup...');
    
    const events = await this.query([]);
    
    // Remove oldest 10% of events
    const toRemove = Math.floor(events.length * 0.1);
    const oldestEvents = events
      .sort((a, b) => a.created_at - b.created_at)
      .slice(0, toRemove)
      .map(e => e.id);
    
    if (oldestEvents.length > 0) {
      await this.delete(oldestEvents);
      console.log(`[LocalStoragePlugin] Cleaned up ${oldestEvents.length} old events`);
    }
  }

  /**
   * Check if event matches filters
   */
  private _matchesFilters(event: SignedEvent, filters: StorageFilter[]): boolean {
    if (!filters || filters.length === 0) {
      return true;
    }

    return filters.some(filter => {
      // Check IDs
      if (filter.ids && !filter.ids.includes(event.id)) {
        return false;
      }

      // Check authors
      if (filter.authors && !filter.authors.includes(event.pubkey)) {
        return false;
      }

      // Check kinds
      if (filter.kinds && !filter.kinds.includes(event.kind)) {
        return false;
      }

      // Check time range
      if (filter.since && event.created_at < filter.since) {
        return false;
      }
      
      if (filter.until && event.created_at > filter.until) {
        return false;
      }

      return true;
    });
  }
}