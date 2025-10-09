// framework/core/EventManager.ts

import { EventBus } from './EventBus.js';
import type {
  UnsignedEvent,
  SignedEvent,
  PublishResult,
  Subscription,
  EventCallback,
  EventUnsubscriber
} from '../types/index.js';

/**
 * Central event management system
 * Orchestrates event creation, signing, publishing, and subscription
 */
export class EventManager {
  private _eventBus: EventBus;
  private _templateEngine: any = null;
  private _signerManager: any = null;
  private _relayManager: any = null;
  private _eventCache = new Map<string, SignedEvent>();
  private _maxCacheSize: number;

  constructor(config: {
    eventBus?: EventBus;
    templateEngine?: any;
    signerManager?: any;
    relayManager?: any;
    maxCacheSize?: number;
  } = {}) {
    this._eventBus = config.eventBus || new EventBus();
    this._templateEngine = config.templateEngine || null;
    this._signerManager = config.signerManager || null;
    this._relayManager = config.relayManager || null;
    this._maxCacheSize = config.maxCacheSize || 1000;
  }

  /**
   * Set template engine
   * @param templateEngine TemplateEngine instance
   */
  setTemplateEngine(templateEngine: any): void {
    this._templateEngine = templateEngine;
    console.log('[EventManager] Template engine set');
  }

  /**
   * Set signer manager
   * @param signerManager SignerManager instance
   */
  setSignerManager(signerManager: any): void {
    this._signerManager = signerManager;
    console.log('[EventManager] Signer manager set');
  }

  /**
   * Set relay manager
   * @param relayManager RelayManager instance
   */
  setRelayManager(relayManager: any): void {
    this._relayManager = relayManager;
    console.log('[EventManager] Relay manager set');
  }

  /**
   * Create unsigned event from template
   * @param templateName Template identifier
   * @param data Event data
   * @returns Unsigned event
   */
  createUnsignedEvent(templateName: string, data: any): UnsignedEvent {
    this._ensureTemplateEngine();

    console.log(`[EventManager] Creating unsigned event from template "${templateName}"`);

    try {
      const event = this._templateEngine!.build(templateName, data);

      this._eventBus.emit('event:created', { templateName, event });

      return event;
    } catch (error) {
      console.error('[EventManager] Failed to create event:', error);
      this._eventBus.emit('event:error', { method: 'create', error });
      throw error;
    }
  }

  /**
   * Create and sign event
   * @param templateName Template identifier
   * @param data Event data
   * @param options Signing options
   * @returns Promise resolving to signed event
   */
  async createEvent(templateName: string, data: any, options: { timeout?: number } = {}): Promise<SignedEvent> {
    this._ensureSignerManager();

    const unsigned = this.createUnsignedEvent(templateName, data);

    console.log(`[EventManager] Signing event (kind ${unsigned.kind})...`);

    try {
      const signed = await this._signerManager!.signEvent(
        unsigned,
        options.timeout
      );

      console.log(`[EventManager] Event signed: ${signed.id}`);

      // Cache event
      this._cacheEvent(signed);

      this._eventBus.emit('event:signed', {
        templateName,
        event: signed
      });

      return signed;
    } catch (error) {
      console.error('[EventManager] Failed to sign event:', error);
      this._eventBus.emit('event:error', { method: 'sign', error });
      throw error;
    }
  }

  /**
   * Publish signed event to relays
   * @param event Signed event
   * @param options Publish options
   * @returns Promise resolving to publish result
   */
  async publishEvent(event: SignedEvent, options: {
    relays?: string[] | null;
    timeout?: number;
  } = {}): Promise<{
    success: boolean;
    event: SignedEvent;
    results: PublishResult[];
    successCount: number;
    totalCount: number;
  }> {
    this._ensureRelayManager();

    const {
      relays = null,
      timeout = 5000
    } = options;

    console.log(`[EventManager] Publishing event ${event.id}...`);

    try {
      const results = await this._relayManager!.publish(event, relays, timeout);

      const successCount = results.filter((r: PublishResult) => r.success).length;
      const success = successCount > 0;

      const result = {
        success,
        event,
        results,
        successCount,
        totalCount: results.length
      };

      console.log(`[EventManager] Published to ${successCount}/${results.length} relays`);

      this._eventBus.emit('event:published', result);
      this._eventBus.emit(`event:kind:${event.kind}`, { type: 'published', event });

      return result;
    } catch (error) {
      console.error('[EventManager] Failed to publish event:', error);
      this._eventBus.emit('event:error', { method: 'publish', error });
      throw error;
    }
  }

  /**
   * Create, sign and publish event in one call
   * @param templateName Template identifier
   * @param data Event data
   * @param options Options for signing and publishing
   * @returns Promise resolving to publish result
   */
  async createAndPublish(templateName: string, data: any, options: {
    timeout?: number;
    relays?: string[] | null;
  } = {}): Promise<{
    success: boolean;
    event: SignedEvent;
    results: PublishResult[];
    successCount: number;
    totalCount: number;
  }> {
    console.log(`[EventManager] Create and publish: ${templateName}`);

    const signed = await this.createEvent(templateName, data, options);
    const result = await this.publishEvent(signed, options);

    return result;
  }

  /**
   * Query events from relays
   * @param filters Nostr filters
   * @param options Query options
   * @returns Promise resolving to events
   */
  async queryEvents(filters: any[], options: {
    relays?: string[];
    timeout?: number;
    limit?: number | null;
  } = {}): Promise<SignedEvent[]> {
    this._ensureRelayManager();

    console.log('[EventManager] Querying events...', filters);

    try {
      const events = await this._relayManager!.query(filters, options);

      // Cache events
      events.forEach((event: SignedEvent) => this._cacheEvent(event));

      console.log(`[EventManager] Query returned ${events.length} events`);

      this._eventBus.emit('event:queried', { filters, count: events.length });

      return events;
    } catch (error) {
      console.error('[EventManager] Query failed:', error);
      this._eventBus.emit('event:error', { method: 'query', error });
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param filters Nostr filters
   * @param callback Event callback
   * @param options Subscription options
   * @returns Subscription object
   */
  subscribe(filters: any[], callback: (event: SignedEvent) => void, options: {
    relays?: string[];
    id?: string;
  } = {}): Subscription {
    this._ensureRelayManager();

    console.log('[EventManager] Creating subscription...', filters);

    const wrappedCallback = (event: SignedEvent) => {
      // Cache event
      this._cacheEvent(event);

      // Emit to event bus
      this._eventBus.emit('event:received', { event });
      this._eventBus.emit(`event:kind:${event.kind}`, { type: 'received', event });

      // Call user callback
      try {
        callback(event);
      } catch (error) {
        console.error('[EventManager] Error in subscription callback:', error);
      }
    };

    const sub = this._relayManager!.subscribe(filters, wrappedCallback, options);

    console.log('[EventManager] Subscription created:', sub.id);
    this._eventBus.emit('event:subscribed', { subscriptionId: sub.id, filters });

    return sub;
  }

  /**
   * Parse event using template
   * @param templateName Template identifier
   * @param event Event to parse
   * @returns Parsed data
   */
  parseEvent(templateName: string, event: SignedEvent): any {
    this._ensureTemplateEngine();

    try {
      const parsed = this._templateEngine!.parse(templateName, event);

      this._eventBus.emit('event:parsed', { templateName, event, parsed });

      return parsed;
    } catch (error) {
      console.error('[EventManager] Failed to parse event:', error);
      this._eventBus.emit('event:error', { method: 'parse', error });
      throw error;
    }
  }

  /**
   * Delete event (create kind 5 deletion event)
   * @param eventIds Event ID(s) to delete
   * @param reason Deletion reason
   * @param options Options
   * @returns Promise resolving to publish result
   */
  async deleteEvent(eventIds: string | string[], reason: string = '', options: {
    timeout?: number;
    relays?: string[] | null;
  } = {}): Promise<{
    success: boolean;
    event: SignedEvent;
    results: PublishResult[];
    successCount: number;
    totalCount: number;
  }> {
    console.log('[EventManager] Deleting event(s):', eventIds);

    return await this.createAndPublish('delete-event', {
      eventIds: Array.isArray(eventIds) ? eventIds : [eventIds],
      reason
    }, options);
  }

  /**
   * Get event from cache
   * @param eventId Event ID
   * @returns Event or null
   */
  getCachedEvent(eventId: string): SignedEvent | null {
    return this._eventCache.get(eventId) || null;
  }

  /**
   * Get all cached events
   * @returns Array of cached events
   */
  getAllCachedEvents(): SignedEvent[] {
    return Array.from(this._eventCache.values());
  }

  /**
   * Clear event cache
   */
  clearCache(): void {
    this._eventCache.clear();
    console.log('[EventManager] Cache cleared');
    this._eventBus.emit('event:cache-cleared', {});
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      size: this._eventCache.size,
      maxSize: this._maxCacheSize,
      utilizationPercent: (this._eventCache.size / this._maxCacheSize) * 100
    };
  }

  /**
   * Listen to event manager events
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Cache event (LRU-style)
   * @private
   */
  private _cacheEvent(event: SignedEvent): void {
    // Remove oldest if cache is full
    if (this._eventCache.size >= this._maxCacheSize) {
      const firstKey = this._eventCache.keys().next().value;
      if (firstKey) {
        this._eventCache.delete(firstKey);
      }
    }

    this._eventCache.set(event.id, event);
  }

  /**
   * Ensure template engine is set
   * @private
   */
  private _ensureTemplateEngine(): void {
    if (!this._templateEngine) {
      throw new Error('TemplateEngine not set. Call setTemplateEngine() first.');
    }
  }

  /**
   * Ensure signer manager is set
   * @private
   */
  private _ensureSignerManager(): void {
    if (!this._signerManager) {
      throw new Error('SignerManager not set. Call setSignerManager() first.');
    }
  }

  /**
   * Ensure relay manager is set
   * @private
   */
  private _ensureRelayManager(): void {
    if (!this._relayManager) {
      throw new Error('RelayManager not set. Call setRelayManager() first.');
    }
  }

  /**
   * Get event bus
   * @returns EventBus instance
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }
}