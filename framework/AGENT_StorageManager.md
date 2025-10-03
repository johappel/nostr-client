# AGENT: StorageManager & NostrFramework

## Ziel
1. Implementierung des StorageManager für lokale Event-Persistenz
2. Zusammenführung aller Module im NostrFramework

## Dateipfade
- `framework/core/StorageManager.js`
- `framework/index.js` (Haupt-Export)

---

## Teil 1: StorageManager

### Schritt 1: Storage Plugin Interface

**Datei**: `framework/plugins/storage/StoragePlugin.js`

```javascript
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
```

---

### Schritt 2: LocalStorage Plugin (Simple Implementation)

**Datei**: `framework/plugins/storage/LocalStoragePlugin.js`

```javascript
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
```

---

### Schritt 3: StorageManager Implementierung

**Datei**: `framework/core/StorageManager.js`

```javascript
// framework/core/StorageManager.js

import { EventBus } from './EventBus.js';

/**
 * Manages local event storage
 */
export class StorageManager {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._plugin = null;
    this._syncEnabled = false;
    this._relayManager = null;
  }

  /**
   * Initialize with storage plugin
   * @param {StoragePlugin} plugin - Storage plugin instance
   */
  async initialize(plugin) {
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
   * @param {RelayManager} relayManager
   */
  setRelayManager(relayManager) {
    this._relayManager = relayManager;
    console.log('[StorageManager] RelayManager set');
  }

  /**
   * Save events to storage
   * @param {Event[]} events - Events to save
   * @returns {Promise<number>} Number of events saved
   */
  async save(events) {
    this._ensureInitialized();

    const eventArray = Array.isArray(events) ? events : [events];
    console.log(`[StorageManager] Saving ${eventArray.length} events...`);

    try {
      const count = await this._plugin.save(eventArray);
      
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
   * @param {Filter[]} filters - Nostr filters
   * @returns {Promise<Event[]>}
   */
  async query(filters) {
    this._ensureInitialized();

    console.log('[StorageManager] Querying local storage...', filters);

    try {
      const events = await this._plugin.query(filters);
      
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
   * @param {string[]} eventIds - Event IDs to delete
   * @returns {Promise<number>}
   */
  async delete(eventIds) {
    this._ensureInitialized();

    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    console.log(`[StorageManager] Deleting ${ids.length} events...`);

    try {
      const count = await this._plugin.delete(ids);
      
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
  async clear() {
    this._ensureInitialized();

    console.log('[StorageManager] Clearing all events...');

    try {
      await this._plugin.clear();
      
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
   * @returns {Promise<Object>}
   */
  async getStats() {
    this._ensureInitialized();

    try {
      const stats = await this._plugin.getStats();
      return stats;
    } catch (error) {
      console.error('[StorageManager] Get stats failed:', error);
      throw error;
    }
  }

  /**
   * Sync local events with relays
   * @param {Object} options - Sync options
   */
  async sync(options = {}) {
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
   * @param {boolean} enabled
   * @param {number} intervalMs - Sync interval in milliseconds
   */
  setAutoSync(enabled, intervalMs = 60000) {
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
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get last sync timestamp
   * @private
   */
  _getLastSyncTimestamp() {
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
  _setLastSyncTimestamp(timestamp) {
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
  _ensureInitialized() {
    if (!this._plugin || !this._plugin.isInitialized()) {
      throw new Error('StorageManager not initialized. Call initialize() first.');
    }
  }
}
```

---

## Teil 2: NostrFramework (Hauptklasse)

**Datei**: `framework/index.js`

```javascript
// framework/index.js

import { EventBus } from './core/EventBus.js';
import { IdentityManager } from './core/IdentityManager.js';
import { SignerManager } from './core/SignerManager.js';
import { TemplateEngine } from './core/TemplateEngine.js';
import { EventManager } from './core/EventManager.js';
import { RelayManager } from './core/RelayManager.js';
import { StorageManager } from './core/StorageManager.js';
import { registerStandardTemplates } from './templates/index.js';

/**
 * Main Nostr Framework class
 * Orchestrates all subsystems
 */
export class NostrFramework {
  constructor(config = {}) {
    console.log('[NostrFramework] Initializing...');

    // Shared event bus
    this._eventBus = new EventBus();
    if (config.debug) {
      this._eventBus.setDebugMode(true);
    }

    // Initialize managers
    this.identity = new IdentityManager(this._eventBus);
    this.signer = new SignerManager(this._eventBus);
    this.templates = new TemplateEngine(this._eventBus);
    this.relay = new RelayManager(this._eventBus, {
      relays: config.relays || []
    });
    this.storage = new StorageManager(this._eventBus);
    this.events = new EventManager({
      eventBus: this._eventBus,
      templateEngine: this.templates,
      signerManager: this.signer,
      relayManager: this.relay
    });

    this._config = config;
    this._initialized = false;
  }

  /**
   * Initialize the framework
   */
  async initialize() {
    if (this._initialized) {
      console.warn('[NostrFramework] Already initialized');
      return;
    }

    console.log('[NostrFramework] Starting initialization...');

    try {
      // Initialize relay manager
      await this.relay.initialize();

      // Initialize identity manager
      await this.identity.initialize();

      // Register standard templates
      if (this._config.standardTemplates !== false) {
        await registerStandardTemplates(this.templates);
      }

      // Initialize storage if configured
      if (this._config.storage) {
        await this.storage.initialize(this._config.storage);
        this.storage.setRelayManager(this.relay);
      }

      // Set up identity -> signer connection
      this.identity.on('identity:changed', (identity) => {
        if (identity) {
          const plugin = this.identity.getCurrentPlugin();
          if (plugin) {
            const signer = plugin.getSigner();
            this.signer.setSigner(signer);
            console.log('[NostrFramework] Signer updated from identity');
          }
        } else {
          this.signer.clearSigner();
          console.log('[NostrFramework] Signer cleared');
        }
      });

      this._initialized = true;
      console.log('[NostrFramework] Initialization complete');
      this._eventBus.emit('framework:initialized', {});
    } catch (error) {
      console.error('[NostrFramework] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if framework is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Destroy framework and cleanup
   */
  async destroy() {
    console.log('[NostrFramework] Destroying...');

    this.relay.destroy();
    this.relay.closeAllSubscriptions();
    
    if (this.storage._syncInterval) {
      this.storage.setAutoSync(false);
    }

    await this.identity.logout().catch(() => {});

    this._initialized = false;
    this._eventBus.emit('framework:destroyed', {});
    
    console.log('[NostrFramework] Destroyed');
  }

  /**
   * Listen to framework events
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}

// Export all core classes and plugins
export { EventBus } from './core/EventBus.js';
export { IdentityManager } from './core/IdentityManager.js';
export { SignerManager } from './core/SignerManager.js';
export { TemplateEngine } from './core/TemplateEngine.js';
export { EventManager } from './core/EventManager.js';
export { RelayManager } from './core/RelayManager.js';
export { StorageManager } from './core/StorageManager.js';

// Export plugins
export { AuthPlugin } from './plugins/auth/AuthPlugin.js';
export { SignerPlugin } from './plugins/signer/SignerPlugin.js';
export { StoragePlugin } from './plugins/storage/StoragePlugin.js';
export { LocalStoragePlugin } from './plugins/storage/LocalStoragePlugin.js';

// Export templates
export * from './templates/index.js';
```

---

## Browser Console Tests

```javascript
// Complete Framework Test
import { NostrFramework } from './framework/index.js';
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

// Create framework instance
const nostr = new NostrFramework({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ],
  storage: new LocalStoragePlugin(),
  debug: true
});

// Initialize
await nostr.initialize();
console.log('✓ Framework initialized');

// Test storage
const events = await nostr.relay.query([{ kinds: [1], limit: 10 }]);
await nostr.storage.save(events);
console.log(`✓ Saved ${events.length} events to storage`);

const stored = await nostr.storage.query([{ kinds: [1] }]);
console.log(`✓ Retrieved ${stored.length} events from storage`);

const stats = await nostr.storage.getStats();
console.log('Storage stats:', stats);

// Test complete workflow (if authenticated)
// Note: Requires real auth plugin
/*
await nostr.identity.authenticate('nip07');
const result = await nostr.events.createAndPublish('text-note', {
  content: 'Hello from Nostr Framework!'
});
console.log('Published:', result);
*/

console.log('✓ All framework tests completed!');

// Expose globally
window.nostr = nostr;
```

---

## Akzeptanzkriterien

- [ ] StoragePlugin Interface definiert
- [ ] LocalStoragePlugin implementiert
- [ ] StorageManager implementiert
- [ ] NostrFramework Hauptklasse implementiert
- [ ] Alle Module integriert
- [ ] Storage funktioniert
- [ ] Sync funktioniert
- [ ] Framework-Initialisierung funktioniert
- [ ] Alle Tests bestehen

---

## Nächste Schritte

Nach vollständiger Implementierung:
1. ✅ Alle Core-Module implementiert
2. ➡️ Implementierung echter Auth-Plugins (NIP-07, NIP-46, etc.)
3. ➡️ SQLite-Plugin für größere Storage-Kapazität
4. ➡️ Beispiel-Anwendungen erstellen
