// framework/core/EventManager.js

import { EventBus } from './EventBus.js';

/**
 * Central event management system
 * Orchestrates event creation, signing, publishing, and subscription
 */
export class EventManager {
  constructor(config = {}) {
    this._eventBus = config.eventBus || new EventBus();
    this._templateEngine = config.templateEngine;
    this._signerManager = config.signerManager;
    this._relayManager = config.relayManager;
    this._eventCache = new Map();
    this._maxCacheSize = config.maxCacheSize || 1000;
  }

  /**
   * Set template engine
   * @param {TemplateEngine} templateEngine
   */
  setTemplateEngine(templateEngine) {
    this._templateEngine = templateEngine;
    console.log('[EventManager] Template engine set');
  }

  /**
   * Set signer manager
   * @param {SignerManager} signerManager
   */
  setSignerManager(signerManager) {
    this._signerManager = signerManager;
    console.log('[EventManager] Signer manager set');
  }

  /**
   * Set relay manager
   * @param {RelayManager} relayManager
   */
  setRelayManager(relayManager) {
    this._relayManager = relayManager;
    console.log('[EventManager] Relay manager set');
  }

  /**
   * Create unsigned event from template
   * @param {string} templateName - Template identifier
   * @param {Object} data - Event data
   * @returns {UnsignedEvent}
   */
  createUnsignedEvent(templateName, data) {
    this._ensureTemplateEngine();

    console.log(`[EventManager] Creating unsigned event from template "${templateName}"`);

    try {
      const event = this._templateEngine.build(templateName, data);
      
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
   * @param {string} templateName - Template identifier
   * @param {Object} data - Event data
   * @param {Object} options - Signing options
   * @returns {Promise<SignedEvent>}
   */
  async createEvent(templateName, data, options = {}) {
    this._ensureSignerManager();

    const unsigned = this.createUnsignedEvent(templateName, data);
    
    console.log(`[EventManager] Signing event (kind ${unsigned.kind})...`);

    try {
      const signed = await this._signerManager.signEvent(
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
   * @param {SignedEvent} event - Signed event
   * @param {Object} options - Publish options
   * @returns {Promise<PublishResult>}
   */
  async publishEvent(event, options = {}) {
    this._ensureRelayManager();

    const {
      relays = null,
      timeout = 5000
    } = options;

    console.log(`[EventManager] Publishing event ${event.id}...`);

    try {
      const results = await this._relayManager.publish(event, relays, timeout);
      
      const successCount = results.filter(r => r.success).length;
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
   * @param {string} templateName - Template identifier
   * @param {Object} data - Event data
   * @param {Object} options - Options for signing and publishing
   * @returns {Promise<PublishResult>}
   */
  async createAndPublish(templateName, data, options = {}) {
    console.log(`[EventManager] Create and publish: ${templateName}`);

    const signed = await this.createEvent(templateName, data, options);
    const result = await this.publishEvent(signed, options);

    return result;
  }

  /**
   * Query events from relays
   * @param {Filter[]} filters - Nostr filters
   * @param {Object} options - Query options
   * @returns {Promise<Event[]>}
   */
  async queryEvents(filters, options = {}) {
    this._ensureRelayManager();

    console.log('[EventManager] Querying events...', filters);

    try {
      const events = await this._relayManager.query(filters, options);
      
      // Cache events
      events.forEach(event => this._cacheEvent(event));

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
   * @param {Filter[]} filters - Nostr filters
   * @param {Function} callback - Event callback
   * @param {Object} options - Subscription options
   * @returns {Subscription}
   */
  subscribe(filters, callback, options = {}) {
    this._ensureRelayManager();

    console.log('[EventManager] Creating subscription...', filters);

    const wrappedCallback = (event) => {
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

    const sub = this._relayManager.subscribe(filters, wrappedCallback, options);

    console.log('[EventManager] Subscription created:', sub.id);
    this._eventBus.emit('event:subscribed', { subscriptionId: sub.id, filters });

    return sub;
  }

  /**
   * Parse event using template
   * @param {string} templateName - Template identifier
   * @param {SignedEvent} event - Event to parse
   * @returns {Object}
   */
  parseEvent(templateName, event) {
    this._ensureTemplateEngine();

    try {
      const parsed = this._templateEngine.parse(templateName, event);
      
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
   * @param {string|string[]} eventIds - Event ID(s) to delete
   * @param {string} reason - Deletion reason
   * @param {Object} options - Options
   * @returns {Promise<PublishResult>}
   */
  async deleteEvent(eventIds, reason = '', options = {}) {
    console.log('[EventManager] Deleting event(s):', eventIds);

    return await this.createAndPublish('delete-event', {
      eventIds: Array.isArray(eventIds) ? eventIds : [eventIds],
      reason
    }, options);
  }

  /**
   * Get event from cache
   * @param {string} eventId - Event ID
   * @returns {Event|null}
   */
  getCachedEvent(eventId) {
    return this._eventCache.get(eventId) || null;
  }

  /**
   * Get all cached events
   * @returns {Event[]}
   */
  getAllCachedEvents() {
    return Array.from(this._eventCache.values());
  }

  /**
   * Clear event cache
   */
  clearCache() {
    this._eventCache.clear();
    console.log('[EventManager] Cache cleared');
    this._eventBus.emit('event:cache-cleared', {});
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this._eventCache.size,
      maxSize: this._maxCacheSize,
      utilizationPercent: (this._eventCache.size / this._maxCacheSize) * 100
    };
  }

  /**
   * Listen to event manager events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Cache event (LRU-style)
   * @private
   */
  _cacheEvent(event) {
    // Remove oldest if cache is full
    if (this._eventCache.size >= this._maxCacheSize) {
      const firstKey = this._eventCache.keys().next().value;
      this._eventCache.delete(firstKey);
    }

    this._eventCache.set(event.id, event);
  }

  /**
   * Ensure template engine is set
   * @private
   */
  _ensureTemplateEngine() {
    if (!this._templateEngine) {
      throw new Error('TemplateEngine not set. Call setTemplateEngine() first.');
    }
  }

  /**
   * Ensure signer manager is set
   * @private
   */
  _ensureSignerManager() {
    if (!this._signerManager) {
      throw new Error('SignerManager not set. Call setSignerManager() first.');
    }
  }

  /**
   * Ensure relay manager is set
   * @private
   */
  _ensureRelayManager() {
    if (!this._relayManager) {
      throw new Error('RelayManager not set. Call setRelayManager() first.');
    }
  }

  /**
   * Get event bus
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}