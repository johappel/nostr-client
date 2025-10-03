// framework/core/RelayManager.js

import { EventBus } from './EventBus.js';

/**
 * Manages relay connections and operations
 */
export class RelayManager {
  constructor(eventBus = null, config = {}) {
    this._eventBus = eventBus || new EventBus();
    this._relays = new Set(config.relays || []);
    this._pool = null;
    this._poolModule = null;
    this._subscriptions = new Map();
    this._relayStatus = new Map();
    this._fastestRelay = null;
    this._fastestRelayTime = 0;
    this._fastestRelayTTL = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Initialize relay pool
   */
  async initialize() {
    if (this._pool) {
      console.warn('[RelayManager] Already initialized');
      return;
    }

    console.log('[RelayManager] Initializing relay pool...');

    try {
      // Dynamic import of nostr-tools
      await this._loadNostrTools();
      
      console.log('[RelayManager] Initialized with relays:', Array.from(this._relays));
      this._eventBus.emit('relay:initialized', { relays: Array.from(this._relays) });
    } catch (error) {
      console.error('[RelayManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load nostr-tools library
   * @private
   */
  async _loadNostrTools() {
    const cdnUrls = [
      'https://esm.sh/nostr-tools@2.8.1/pool',
      'https://cdn.jsdelivr.net/npm/nostr-tools@2.8.1/+esm',
      'https://unpkg.com/nostr-tools@2.8.1/+esm'
    ];

    let lastError = null;

    for (const url of cdnUrls) {
      try {
        console.log(`[RelayManager] Trying to load from ${url}...`);
        this._poolModule = await import(url);
        
        // Try to find SimplePool class
        const SimplePool = this._poolModule.SimplePool || 
                          this._poolModule.default?.SimplePool ||
                          this._poolModule.Pool;
        
        if (!SimplePool) {
          throw new Error('SimplePool class not found in module');
        }

        this._pool = new SimplePool();
        console.log('[RelayManager] Successfully loaded nostr-tools from', url);
        return;
      } catch (error) {
        lastError = error;
        console.warn(`[RelayManager] Failed to load from ${url}:`, error.message);
      }
    }

    throw new Error(`Failed to load nostr-tools: ${lastError?.message}`);
  }

  /**
   * Add relays to the pool
   * @param {string[]} relayUrls - Relay URLs to add
   */
  addRelays(relayUrls) {
    const urls = Array.isArray(relayUrls) ? relayUrls : [relayUrls];
    
    urls.forEach(url => {
      this._relays.add(url);
      this._relayStatus.set(url, { status: 'disconnected', lastSeen: null });
    });

    console.log('[RelayManager] Added relays:', urls);
    this._eventBus.emit('relay:added', { relays: urls });
  }

  /**
   * Remove relays from the pool
   * @param {string[]} relayUrls - Relay URLs to remove
   */
  removeRelays(relayUrls) {
    const urls = Array.isArray(relayUrls) ? relayUrls : [relayUrls];
    
    urls.forEach(url => {
      this._relays.delete(url);
      this._relayStatus.delete(url);
    });

    console.log('[RelayManager] Removed relays:', urls);
    this._eventBus.emit('relay:removed', { relays: urls });
  }

  /**
   * Get list of configured relays
   * @returns {string[]}
   */
  getRelays() {
    return Array.from(this._relays);
  }

  /**
   * Publish event to relays
   * @param {SignedEvent} event - Event to publish
   * @param {string[]} relayUrls - Optional: specific relays (uses all if not specified)
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<PublishResult[]>}
   */
  async publish(event, relayUrls = null, timeout = 5000) {
    this._ensureInitialized();

    const targets = relayUrls || Array.from(this._relays);
    
    if (targets.length === 0) {
      throw new Error('No relays configured');
    }

    console.log(`[RelayManager] Publishing event ${event.id} to ${targets.length} relays...`);

    try {
      // pool.publish returns array of Promises
      const publishPromises = this._pool.publish(targets, event);
      const results = [];

      // Add timeout to each promise
      const promisesWithTimeout = publishPromises.map((promise, index) =>
        this._withTimeout(promise, timeout, `Publish timeout for ${targets[index]}`)
      );

      const settled = await Promise.allSettled(promisesWithTimeout);
      
      settled.forEach((result, index) => {
        const relay = targets[index];
        if (result.status === 'fulfilled') {
          results.push({ relay, success: true, ok: true });
          this._updateRelayStatus(relay, 'connected');
        } else {
          results.push({ relay, success: false, error: result.reason });
          this._updateRelayStatus(relay, 'error', result.reason);
        }
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`[RelayManager] Published to ${successCount}/${targets.length} relays`);
      
      this._eventBus.emit('relay:published', {
        eventId: event.id,
        results,
        successCount,
        totalCount: targets.length
      });

      return results;
    } catch (error) {
      console.error('[RelayManager] Publish failed:', error);
      this._eventBus.emit('relay:error', { method: 'publish', error });
      throw error;
    }
  }

  /**
   * Query events from relays
   * @param {Filter[]} filters - Nostr filters
   * @param {Object} options - Query options
   * @returns {Promise<Event[]>}
   */
  async query(filters, options = {}) {
    this._ensureInitialized();

    const {
      relays = Array.from(this._relays),
      timeout = 3500,
      limit = null
    } = options;

    console.log('[RelayManager] Querying events...', filters);

    try {
      // Try list() method first
      if (typeof this._pool.list === 'function') {
        const events = await this._withTimeout(
          this._pool.list(relays, filters),
          timeout,
          'Query timeout'
        );
        
        const result = limit ? events.slice(0, limit) : events;
        console.log(`[RelayManager] Query returned ${result.length} events`);
        
        this._eventBus.emit('relay:queried', { filters, count: result.length });
        
        return result;
      }

      // Fallback to subscribeMany
      return await this._queryWithSubscription(relays, filters, timeout, limit);
    } catch (error) {
      console.error('[RelayManager] Query failed:', error);
      this._eventBus.emit('relay:error', { method: 'query', error });
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param {Filter[]} filters - Nostr filters
   * @param {Function} onEvent - Event callback
   * @param {Object} options - Subscription options
   * @returns {Subscription}
   */
  subscribe(filters, onEvent, options = {}) {
    this._ensureInitialized();

    const {
      relays = Array.from(this._relays),
      id = this._generateSubscriptionId()
    } = options;

    console.log('[RelayManager] Creating subscription:', id);

    const sub = this._pool.subscribeMany(relays, filters, {
      onevent: (event) => {
        try {
          onEvent(event);
          this._eventBus.emit('relay:event', { subscriptionId: id, event });
        } catch (error) {
          console.error('[RelayManager] Error in event callback:', error);
        }
      },
      oneose: () => {
        console.log(`[RelayManager] EOSE for subscription ${id}`);
        this._eventBus.emit('relay:eose', { subscriptionId: id });
      }
    });

    // Wrap subscription with additional methods
    const wrappedSub = {
      id,
      close: () => {
        sub.close();
        this._subscriptions.delete(id);
        console.log('[RelayManager] Closed subscription:', id);
        this._eventBus.emit('relay:subscription-closed', { subscriptionId: id });
      },
      _internal: sub
    };

    this._subscriptions.set(id, wrappedSub);
    this._eventBus.emit('relay:subscribed', { subscriptionId: id, filters });

    return wrappedSub;
  }

  /**
   * Close all subscriptions
   */
  closeAllSubscriptions() {
    console.log(`[RelayManager] Closing ${this._subscriptions.size} subscriptions...`);
    
    for (const sub of this._subscriptions.values()) {
      try {
        sub.close();
      } catch (error) {
        console.error('[RelayManager] Error closing subscription:', error);
      }
    }

    this._subscriptions.clear();
  }

  /**
   * Get fastest relay (with caching)
   * @param {number} timeout - Timeout for speed test
   * @returns {Promise<string>}
   */
  async getFastestRelay(timeout = 1200) {
    const now = Date.now();
    
    // Return cached result if fresh
    if (this._fastestRelay && (now - this._fastestRelayTime) < this._fastestRelayTTL) {
      console.log('[RelayManager] Using cached fastest relay:', this._fastestRelay);
      return this._fastestRelay;
    }

    console.log('[RelayManager] Testing relay speeds...');

    const relays = Array.from(this._relays).slice(0, 5); // Test max 5 relays
    const races = relays.map(url => this._testRelaySpeed(url));

    const winner = await Promise.race([
      Promise.race(races),
      new Promise(resolve => setTimeout(() => resolve(relays[0]), timeout))
    ]);

    this._fastestRelay = winner;
    this._fastestRelayTime = now;

    console.log('[RelayManager] Fastest relay:', winner);
    this._eventBus.emit('relay:fastest-found', { relay: winner });

    return winner;
  }

  /**
   * Get relay status map
   * @returns {Map<string, Object>}
   */
  getRelayStatus() {
    return new Map(this._relayStatus);
  }

  /**
   * Get active subscription count
   * @returns {number}
   */
  getSubscriptionCount() {
    return this._subscriptions.size;
  }

  /**
   * Destroy relay manager and cleanup
   */
  destroy() {
    console.log('[RelayManager] Destroying...');
    
    this.closeAllSubscriptions();
    
    if (this._pool && typeof this._pool.close === 'function') {
      this._pool.close();
    }

    this._pool = null;
    this._eventBus.emit('relay:destroyed', {});
  }

  /**
   * Listen to relay events
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Test relay speed
   * @private
   */
  async _testRelaySpeed(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        ws.close();
        resolve(url);
      };
      
      ws.onerror = () => reject(new Error(`${url} failed`));
      
      setTimeout(() => {
        ws.close();
        reject(new Error(`${url} timeout`));
      }, 1000);
    });
  }

  /**
   * Query with subscription fallback
   * @private
   */
  async _queryWithSubscription(relays, filters, timeout, limit) {
    return new Promise((resolve, reject) => {
      const events = [];
      const seen = new Set();
      let eoseCount = 0;
      const targetEose = relays.length;

      const timer = setTimeout(() => {
        sub.close();
        resolve(events);
      }, timeout);

      const sub = this._pool.subscribeMany(relays, filters, {
        onevent: (event) => {
          if (!seen.has(event.id)) {
            seen.add(event.id);
            events.push(event);
            
            if (limit && events.length >= limit) {
              clearTimeout(timer);
              sub.close();
              resolve(events);
            }
          }
        },
        oneose: () => {
          eoseCount++;
          if (eoseCount >= targetEose) {
            clearTimeout(timer);
            sub.close();
            resolve(events);
          }
        }
      });
    });
  }

  /**
   * Update relay status
   * @private
   */
  _updateRelayStatus(relay, status, error = null) {
    this._relayStatus.set(relay, {
      status,
      lastSeen: Date.now(),
      error: error ? String(error) : null
    });
  }

  /**
   * Generate unique subscription ID
   * @private
   */
  _generateSubscriptionId() {
    return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Ensure pool is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this._pool) {
      throw new Error('RelayManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute promise with timeout
   * @private
   */
  async _withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }
}

/**
 * @typedef {Object} PublishResult
 * @property {string} relay - Relay URL
 * @property {boolean} success - Success status
 * @property {boolean} [ok] - Relay accepted the event
 * @property {Error} [error] - Error if failed
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription ID
 * @property {Function} close - Close subscription
 */