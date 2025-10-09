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
  private _pool: any = null;
  private _poolModule: any = null;
  private _subscriptions = new Map<string, Subscription>();
  private _relayStatus = new Map<string, RelayStatus>();
  private _fastestRelay: string | null = null;
  private _fastestRelayTime = 0;
  private _fastestRelayTTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(eventBus: EventBus | null = null, config: { relays?: string[] } = {}) {
    this._eventBus = eventBus || new EventBus();
    this._relays = new Set(config.relays || []);
  }

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
    // Try multiple import strategies
    const importStrategies = [
      // 1. Try as peer dependency (from parent application)
      {
        name: 'peer dependency',
        loader: async () => {
          try {
            // @ts-ignore - Dynamic import of peer dependency
            const module = await import('nostr-tools/pool');
            return module.SimplePool;
          } catch {
            throw new Error('Peer dependency import failed');
          }
        }
      },

      // 2. CDN fallback
      {
        name: 'CDN fallback',
        loader: async () => {
          const cdnUrl = Config.nostrToolsBaseUrl ?? 'https://esm.sh/nostr-tools@2.8.1';
          const module = await import(`${cdnUrl}/pool`);
          return module.SimplePool;
        }
      }
    ];

    let lastError: Error | null = null;

    for (const strategy of importStrategies) {
      try {
        console.log(`[RelayManager] Trying ${strategy.name}...`);
        const SimplePool = await strategy.loader();

        if (!SimplePool) {
          throw new Error('SimplePool class not found in module');
        }

        this._pool = new SimplePool();
        console.log(`[RelayManager] Successfully loaded nostr-tools from ${strategy.name}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[RelayManager] ${strategy.name} failed:`, (error as Error).message);
      }
    }

    throw new Error(`Failed to load nostr-tools. Install it in your project with: npm install nostr-tools@^2.8.1. Last error: ${lastError?.message}`);
  }

  /**
   * Add relays to the pool
   * @param relayUrls Relay URLs to add
   */
  addRelays(relayUrls: string | string[]): void {
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
        ) as SignedEvent[];

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
   * Destroy relay manager and cleanup
   */
  destroy(): void {
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
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Test relay speed
   * @private
   */
  private async _testRelaySpeed(url: string): Promise<string> {
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
  private async _queryWithSubscription(relays: string[], filters: any[], timeout: number, limit: number | null): Promise<SignedEvent[]> {
    return new Promise((resolve, reject) => {
      const events: SignedEvent[] = [];
      const seen = new Set<string>();
      let eoseCount = 0;
      const targetEose = relays.length;

      const timer = setTimeout(() => {
        if (sub && typeof sub.close === 'function') {
          sub.close();
        }
        resolve(events);
      }, timeout);

      const sub = this._pool.subscribeMany(relays, filters, {
        onevent: (event: SignedEvent) => {
          if (!seen.has(event.id)) {
            seen.add(event.id);
            events.push(event);

            if (limit && events.length >= limit) {
              clearTimeout(timer);
              if (sub && typeof sub.close === 'function') {
                sub.close();
              }
              resolve(events);
            }
          }
        },
        oneose: () => {
          eoseCount++;
          if (eoseCount >= targetEose) {
            clearTimeout(timer);
            if (sub && typeof sub.close === 'function') {
              sub.close();
            }
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