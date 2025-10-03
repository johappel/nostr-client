// framework/plugins/storage/LocalStoragePlugin.js

import { StoragePlugin } from './StoragePlugin.js';

/**
 * Simple localStorage-based storage plugin
 * Limited by localStorage size constraints (~5-10MB)
 */
export class LocalStoragePlugin extends StoragePlugin {
  constructor(config = {}) {
    super();
    this.name = 'localstorage';
    this._keyPrefix = config.keyPrefix || 'nostr_events_';
    this._indexKey = this._keyPrefix + 'index';
  }

  async initialize() {
    console.log('[LocalStoragePlugin] Initializing...');
    
    // Ensure index exists
    if (!localStorage.getItem(this._indexKey)) {
      localStorage.setItem(this._indexKey, JSON.stringify([]));
    }

    this._initialized = true;
    console.log('[LocalStoragePlugin] Initialized');
  }

  async save(events) {
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
        if (error.name === 'QuotaExceededError') {
          console.warn('[LocalStoragePlugin] Storage quota exceeded');
          break;
        }
      }
    }

    this._setIndex(index);
    console.log(`[LocalStoragePlugin] Saved ${saved}/${eventArray.length} events`);
    
    return saved;
  }

  async query(filters) {
    const index = this._getIndex();
    const events = [];

    for (const eventId of index) {
      try {
        const key = this._keyPrefix + eventId;
        const data = localStorage.getItem(key);
        
        if (data) {
          const event = JSON.parse(data);
          
          // Apply filters
          if (this._matchesFilters(event, filters)) {
            events.push(event);
          }
        }
      } catch (error) {
        console.error('[LocalStoragePlugin] Failed to load event:', eventId, error);
      }
    }

    console.log(`[LocalStoragePlugin] Query returned ${events.length} events`);
    return events;
  }

  async delete(eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    let deleted = 0;
    const index = this._getIndex();

    for (const eventId of ids) {
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
    console.log(`[LocalStoragePlugin] Deleted ${deleted}/${ids.length} events`);
    
    return deleted;
  }

  async clear() {
    const index = this._getIndex();

    for (const eventId of index) {
      const key = this._keyPrefix + eventId;
      localStorage.removeItem(key);
    }

    localStorage.setItem(this._indexKey, JSON.stringify([]));
    console.log('[LocalStoragePlugin] Cleared all events');
  }

  async getStats() {
    const index = this._getIndex();
    
    // Calculate approximate size
    let totalSize = 0;
    for (const eventId of index) {
      const key = this._keyPrefix + eventId;
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    }

    return {
      eventCount: index.length,
      approximateSizeBytes: totalSize,
      approximateSizeKB: Math.round(totalSize / 1024)
    };
  }

  /**
   * Get event index
   * @private
   */
  _getIndex() {
    try {
      const data = localStorage.getItem(this._indexKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocalStoragePlugin] Failed to get index:', error);
      return [];
    }
  }

  /**
   * Set event index
   * @private
   */
  _setIndex(index) {
    try {
      localStorage.setItem(this._indexKey, JSON.stringify(index));
    } catch (error) {
      console.error('[LocalStoragePlugin] Failed to set index:', error);
    }
  }

  /**
   * Check if event matches filters
   * @private
   */
  _matchesFilters(event, filters) {
    if (!filters || filters.length === 0) return true;

    return filters.some(filter => {
      // Check kinds
      if (filter.kinds && !filter.kinds.includes(event.kind)) {
        return false;
      }

      // Check authors
      if (filter.authors && !filter.authors.includes(event.pubkey)) {
        return false;
      }

      // Check IDs
      if (filter.ids && !filter.ids.includes(event.id)) {
        return false;
      }

      // Check since/until
      if (filter.since && event.created_at < filter.since) {
        return false;
      }

      if (filter.until && event.created_at > filter.until) {
        return false;
      }

      // Check tags (simplified)
      if (filter['#e']) {
        const eTags = event.tags.filter(t => t[0] === 'e').map(t => t[1]);
        if (!filter['#e'].some(id => eTags.includes(id))) {
          return false;
        }
      }

      if (filter['#p']) {
        const pTags = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
        if (!filter['#p'].some(pk => pTags.includes(pk))) {
          return false;
        }
      }

      return true;
    });
  }
}