// framework/core/RelayManager.ts

import { EventBus } from './EventBus.js';
import { Config } from '../config.js';
import type {
  SignedEvent,
  EventCallback,
  EventUnsubscriber,
  PublishResult,
  Subscription,
  QueryOptions,
  SubscriptionOptions,
  RelayStatus
} from '../types/index.js';

/**
 * Manages relay connections and operations
 */
export class RelayManager {
  private _eventBus: EventBus;
  private _relays = new Set<string>();
  public _pool: any = null; // Made public for debugging
  private _poolModule: any = null;
  private _subscriptions = new Map<string, Subscription>();
  private _relayStatus = new Map<string, RelayStatus>();
  private _fastestRelay: string | null = null;
  private _fastestRelayTime = 0;
  private _fastestRelayTTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(eventBus: EventBus | null = null, config: { relays?: string[]; SimplePoolClass?: any } = {}) {
    this._eventBus = eventBus || new EventBus();
    this._relays = new Set(config.relays || []);
    this._SimplePoolClass = config.SimplePoolClass;
    
    console.log('[RelayManager] Constructor - received config:', config);
    console.log('[RelayManager] Constructor - relays set:', Array.from(this._relays));
  }

  private _SimplePoolClass: any = null;

  /**
   * Initialize relay pool
   */
  async initialize(): Promise<void> {
    if (this._pool) {
      console.warn('[RelayManager] Already initialized');
      return;
    }

    console.log('[RelayManager] Initializing relay pool...');

    try {
      // Dynamic import of nostr-tools
      await this._loadNostrTools();

      // Add relays if they were provided in constructor
      if (this._relays.size === 0) {
        console.warn('[RelayManager] No relays configured');
      }

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
  private async _loadNostrTools(): Promise<void> {
    try {
      // Use provided SimplePool class if available, otherwise import
      let SimplePool;
      
      if (this._SimplePoolClass) {
        SimplePool = this._SimplePoolClass;
        console.log('[RelayManager] Using provided SimplePool class');
      } else {
        // @ts-ignore - Module resolution issue with nostr-tools
        const module = await import('nostr-tools/pool');
        SimplePool = module.SimplePool;
        console.log('[RelayManager] Imported SimplePool from nostr-tools/pool');
      }
      
      if (!SimplePool) {
        throw new Error('SimplePool class not available');
      }

      this._pool = new SimplePool();
      console.log('[RelayManager] Successfully created SimplePool instance');
      return;
    } catch (error) {
      console.error('[RelayManager] Failed to load nostr-tools:', error);
      throw new Error(`Failed to load nostr-tools. Install it in your project with: npm install nostr-tools@^2.8.1. Error: ${(error as Error).message}`);
    }
  }

  /**
   * Add relays to the pool
   * @param relayUrls Relay URLs to add
   */
  addRelays(relayUrls: string | string[]): void {
    const urls = Array.isArray(relayUrls) ? relayUrls : [relayUrls];

    const validUrls = urls.filter(url => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
      } catch (error) {
        console.warn('[RelayManager] Invalid relay URL:', url);
        return false;
      }
    });

    validUrls.forEach(url => {
      this._relays.add(url);
      this._relayStatus.set(url, { status: 'disconnected', lastSeen: null });
    });

    console.log('[RelayManager] Added relays:', validUrls);
    if (validUrls.length !== urls.length) {
      console.warn('[RelayManager] Skipped invalid URLs:', urls.filter(url => !validUrls.includes(url)));
    }
    this._eventBus.emit('relay:added', { relays: validUrls });
  }

  /**
   * Remove relays from the pool
   * @param relayUrls Relay URLs to remove
   */
  removeRelays(relayUrls: string | string[]): void {
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
   * @returns Array of relay URLs
   */
  getRelays(): string[] {
    return Array.from(this._relays);
  }

  /**
   * Publish event to relays
   * @param event Event to publish
   * @param relayUrls Optional: specific relays (uses all if not specified)
   * @param timeout Timeout in ms
   * @returns Promise resolving to publish results
   */
  async publish(event: SignedEvent, relayUrls: string[] | null = null, timeout: number = 5000): Promise<PublishResult[]> {
    this._ensureInitialized();

    const targets = relayUrls || Array.from(this._relays);

    if (targets.length === 0) {
      throw new Error('No relays configured');
    }

    console.log(`[RelayManager] Publishing event ${event.id} to ${targets.length} relays...`);

    try {
      // pool.publish returns array of Promises
      const publishPromises = this._pool.publish(targets, event);
      const results: PublishResult[] = [];

      // Add timeout to each promise
      const promisesWithTimeout = publishPromises.map((promise: Promise<any>, index: number) =>
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
   * @param filters Nostr filters
   * @param options Query options
   * @returns Promise resolving to events
   */
  async query(filters: any[], options: QueryOptions = {}): Promise<SignedEvent[]> {
    this._ensureInitialized();

    const {
      relays = Array.from(this._relays),
      timeout = 5000, // Increased timeout for real relays
      limit = null
    } = options;

    if (relays.length === 0) {
      throw new Error('No relays available for query');
    }

    console.log('[RelayManager] Querying events from', relays.length, 'relays');
    console.log('[RelayManager] Original filters:', JSON.stringify(filters, null, 2));

    try {
      // Use original filters directly like in working tests - no cleaning
      const validFilters = filters.filter(filter => {
        if (!filter || typeof filter !== 'object') {
          console.warn('[RelayManager] Invalid filter (not object):', filter);
          return false;
        }
        if (Object.keys(filter).length === 0) {
          console.warn('[RelayManager] Empty filter detected');
          return false;
        }
        return true;
      });

      if (validFilters.length === 0) {
        console.warn('[RelayManager] No valid filters after validation');
        return [];
      }

      console.log('[RelayManager] Using original filters (no cleaning):', JSON.stringify(validFilters, null, 2));

      // Test relay connectivity before querying if we suspect connection issues
      const hasRecentFailures = Array.from(this._relayStatus.values())
        .some(status => status.status === 'error' && status.lastSeen && (Date.now() - status.lastSeen) < 30000);

      if (hasRecentFailures) {
        console.log('[RelayManager] Recent relay failures detected, testing connectivity...');
        const connectivityResults = await this.testRelayConnectivity();
        const workingRelays = connectivityResults
          .filter(result => result.connected)
          .map(result => result.relay);
        
        if (workingRelays.length > 0) {
          console.log('[RelayManager] Using', workingRelays.length, 'working relays for query');
          return await this._queryWithSubscription(workingRelays, validFilters, timeout, limit);
        }
      }

      // Use subscription-based query (pool.list doesn't exist in this version)
      return await this._queryWithSubscription(relays, validFilters, timeout, limit);

    } catch (error) {
      console.error('[RelayManager] Query failed:', error);
      console.error('[RelayManager] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        originalFilters: JSON.stringify(filters),
        relays,
        timeout
      });
      this._eventBus.emit('relay:error', { method: 'query', error, filters, relays });
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param filters Nostr filters
   * @param onEvent Event callback
   * @param options Subscription options
   * @returns Subscription object
   */
  subscribe(filters: any[], onEvent: (event: SignedEvent) => void, options: SubscriptionOptions = {}): Subscription {
    this._ensureInitialized();

    const {
      relays = Array.from(this._relays),
      id = this._generateSubscriptionId()
    } = options;

    console.log('[RelayManager] Creating subscription:', id);

    console.log('[RelayManager] Creating subscription with filters:', JSON.stringify(filters, null, 2));

    if (!filters || filters.length === 0) {
      throw new Error('No filters provided for subscription');
    }

    // Use original filters directly like in working tests - no cleaning
    console.log('[RelayManager] Using original filters (no cleaning) for subscription:', JSON.stringify(filters, null, 2));
    
    // subscribeMany expects an array of filters, not a single filter
    console.log('[RelayManager] Using original filters array for subscription:', JSON.stringify(filters, null, 2));
    
    const sub = this._pool.subscribeMany(relays, filters, {
      onevent: (event: SignedEvent) => {
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
    const wrappedSub: Subscription = {
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
  closeAllSubscriptions(): void {
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
   * @param timeout Timeout for speed test
   * @returns Promise resolving to fastest relay URL
   */
  async getFastestRelay(timeout: number = 1200): Promise<string> {
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
      new Promise<string>(resolve => setTimeout(() => resolve(relays[0]), timeout))
    ]);

    this._fastestRelay = winner;
    this._fastestRelayTime = now;

    console.log('[RelayManager] Fastest relay:', winner);
    this._eventBus.emit('relay:fastest-found', { relay: winner });

    return winner;
  }

  /**
   * Get relay status map
   * @returns Map of relay statuses
   */
  getRelayStatus(): Map<string, RelayStatus> {
    return new Map(this._relayStatus);
  }

  /**
   * Get active subscription count
   * @returns Number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this._subscriptions.size;
  }

  /**
   * Test relay connectivity
   * @param relayUrl Optional specific relay to test (tests all if not provided)
   * @returns Promise resolving to connectivity results
   */
  async testRelayConnectivity(relayUrl?: string): Promise<{ relay: string, connected: boolean, latency?: number, error?: string }[]> {
    const relaysToTest = relayUrl ? [relayUrl] : Array.from(this._relays);
    
    console.log('[RelayManager] Testing connectivity for', relaysToTest.length, 'relays sequentially');
    
    // Test sequentially to avoid overwhelming the browser with parallel WebSocket connections
    const results: { relay: string, connected: boolean, latency?: number, error?: string }[] = [];
    
    for (const url of relaysToTest) {
      const startTime = Date.now();
      try {
        console.log(`[RelayManager] Testing ${url}...`);
        await this._testRelaySpeed(url);
        const latency = Date.now() - startTime;
        this._updateRelayStatus(url, 'connected');
        results.push({ relay: url, connected: true, latency });
        console.log(`[RelayManager] ✅ ${url} connected in ${latency}ms`);
      } catch (error) {
        this._updateRelayStatus(url, 'error', (error as Error).message);
        results.push({ relay: url, connected: false, error: (error as Error).message });
        console.log(`[RelayManager] ❌ ${url} failed: ${(error as Error).message}`);
      }
      
      // Small delay between tests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Destroy relay manager and cleanup
   */
  destroy(): void {
    console.log('[RelayManager] Destroying...');

    this.closeAllSubscriptions();

    if (this._pool && typeof this._pool.close === 'function') {
      try {
        this._pool.close();
      } catch (error) {
        console.warn('[RelayManager] Error closing pool:', error);
        // Continue with cleanup even if pool.close() fails
      }
    }

    this._pool = null;
    this._eventBus.emit('relay:destroyed', {});
  }

  /**
   * Listen to relay events
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Test relay speed
   * @private
   */
  private async _testRelaySpeed(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      let ws: WebSocket;

      const timeout = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        try {
          if (ws && ws.readyState !== WebSocket.CLOSED) {
            ws.close();
          }
        } catch (e) {
          // Ignore close errors
        }
        reject(new Error(`${url} timeout`));
      }, 10000); // Increased timeout to 10 seconds

      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          
          // Give more time for connection to stabilize
          setTimeout(() => {
            try {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
            } catch (e) {
              // Ignore close errors
            }
          }, 500); // Increased delay
          
          resolve(url);
        };

        ws.onerror = () => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          reject(new Error(`${url} connection failed`));
        };

        ws.onclose = (event) => {
          if (isResolved) return;
          // Only reject if it's an unexpected close and we haven't resolved yet
          if (!event.wasClean && event.code !== 1000) {
            isResolved = true;
            clearTimeout(timeout);
            reject(new Error(`${url} connection closed with code ${event.code}`));
          }
        };
      } catch (error) {
        isResolved = true;
        clearTimeout(timeout);
        reject(new Error(`${url} WebSocket creation failed: ${error}`));
      }
    });
  }

  /**
   * Query with subscription fallback
   * @private
   */
  private async _queryWithSubscription(relays: string[], filters: any[], timeout: number, limit: number | null): Promise<SignedEvent[]> {
    return new Promise((resolve, reject) => {
      const events: SignedEvent[] = [];
      const seen = new Set<string>();
      let eoseCount = 0;
      const connectedRelays = new Set<string>();
      let isResolved = false;
      let sub: any = null;

      const cleanup = () => {
        if (sub && typeof sub.close === 'function') {
          try {
            sub.close();
          } catch (error) {
            console.warn('[RelayManager] Error closing subscription:', error);
          }
        }
      };

      const resolveOnce = (result: SignedEvent[]) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        console.log(`[RelayManager] Query completed: ${result.length} events from ${connectedRelays.size}/${relays.length} relays`);
        this._eventBus.emit('relay:queried', { filters, count: result.length, relays: Array.from(connectedRelays) });
        resolve(result);
      };

      const rejectOnce = (error: Error) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(error);
      };

      // Set up timeout
      const timer = setTimeout(() => {
        if (!isResolved) {
          console.log(`[RelayManager] Query timeout after ${timeout}ms, returning ${events.length} events`);
          resolveOnce([...events]);
        }
      }, timeout);

      console.log('[RelayManager] Starting subscription query on', relays.length, 'relays');
      console.log('[RelayManager] Query filters:', JSON.stringify(filters, null, 2));

      if (!filters || filters.length === 0) {
        rejectOnce(new Error('No filters provided'));
        return;
      }

      console.log('[RelayManager] Using original filters directly (no cleaning):', JSON.stringify(filters, null, 2));

      try {
        // subscribeMany expects an array of filters
        console.log('[RelayManager] Using original filters array:', JSON.stringify(filters));
        
        sub = this._pool.subscribeMany(relays, filters, {
          onevent: (event: SignedEvent) => {
            if (isResolved) return;

            try {
              // Validate event has required fields
              if (!event || !event.id || !event.pubkey) {
                console.warn('[RelayManager] Invalid event received:', event);
                return;
              }

              if (!seen.has(event.id)) {
                seen.add(event.id);
                events.push(event);
                
                console.log(`[RelayManager] Added event ${event.id} (${events.length} total)`);

                // Update relay status for successful event
                for (const relay of relays) {
                  this._updateRelayStatus(relay, 'connected');
                }

                // Check if we've reached the limit
                if (limit && events.length >= limit) {
                  console.log(`[RelayManager] Reached limit of ${limit} events`);
                  clearTimeout(timer);
                  resolveOnce([...events]);
                }
              }
            } catch (error) {
              console.error('[RelayManager] Error processing event:', error);
            }
          },
          
          oneose: () => {
            if (isResolved) return;
            
            eoseCount++;
            console.log(`[RelayManager] EOSE ${eoseCount}/${relays.length}`);
            
            // Consider a relay connected if we got EOSE
            if (eoseCount <= relays.length) {
              connectedRelays.add(`relay-${eoseCount}`); // We don't know which specific relay, but track count
            }

            // If all relays have sent EOSE or we have enough results, complete
            if (eoseCount >= relays.length) {
              console.log('[RelayManager] All relays sent EOSE');
              clearTimeout(timer);
              resolveOnce([...events]);
            }
          },
          
          onclose: (reason: any) => {
            console.log('[RelayManager] Subscription closed:', reason);
            // Don't auto-resolve on close, let timeout handle it
          }
        });

        // Handle case where subscribeMany fails immediately
        if (!sub) {
          throw new Error('Failed to create subscription');
        }

        // For very short timeouts or when no relays respond, resolve early if we have some events
        if (timeout < 2000) {
          setTimeout(() => {
            if (!isResolved && events.length > 0) {
              console.log('[RelayManager] Short timeout, resolving with partial results');
              resolveOnce([...events]);
            }
          }, Math.min(1000, timeout / 2));
        }

      } catch (error) {
        console.error('[RelayManager] Subscription creation failed:', error);
        clearTimeout(timer);
        rejectOnce(error instanceof Error ? error : new Error('Subscription failed'));
      }
    });
  }

  /**
   * Update relay status
   * @private
   */
  private _updateRelayStatus(relay: string, status: RelayStatus['status'], error: string | null = null): void {
    this._relayStatus.set(relay, {
      status,
      lastSeen: Date.now(),
      error: error
    });
  }

  /**
   * Generate unique subscription ID
   * @private
   */
  private _generateSubscriptionId(): string {
    return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate and clean nostr filters
   * @private
   */
  private _validateFilters(filters: any[]): any[] {
    return filters.map(filter => {
      if (!filter || typeof filter !== 'object') {
        console.warn('[RelayManager] Invalid filter (not object):', filter);
        return null;
      }

      // Create a simple copy without excessive validation that might break things
      const cleanFilter: Record<string, any> = {};
      
      // Copy basic properties with minimal validation
      if (filter.kinds !== undefined && Array.isArray(filter.kinds)) {
        cleanFilter.kinds = filter.kinds;
      }
      
      if (filter.authors !== undefined && Array.isArray(filter.authors)) {
        cleanFilter.authors = filter.authors;
      }
      
      if (filter.ids !== undefined && Array.isArray(filter.ids)) {
        cleanFilter.ids = filter.ids;
      }
      
      if (filter.since !== undefined && typeof filter.since === 'number') {
        cleanFilter.since = filter.since;
      }
      
      if (filter.until !== undefined && typeof filter.until === 'number') {
        cleanFilter.until = filter.until;
      }
      
      if (filter.limit !== undefined && typeof filter.limit === 'number') {
        cleanFilter.limit = filter.limit;
      }
      
      // Copy tag filters
      Object.keys(filter).forEach(key => {
        if (key.startsWith('#')) {
          cleanFilter[key] = filter[key];
        }
      });
      
      // Return the filter if it has any properties
      return Object.keys(cleanFilter).length > 0 ? cleanFilter : null;
    }).filter(filter => filter !== null);
  }

  /**
   * Ensure pool is initialized
   * @private
   */
  private _ensureInitialized(): void {
    if (!this._pool) {
      throw new Error('RelayManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute promise with timeout
   * @private
   */
  private async _withTimeout<T>(promise: Promise<T>, timeout: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }
}