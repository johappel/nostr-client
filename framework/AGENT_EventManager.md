# AGENT: EventManager

## Ziel
Implementierung des zentralen Event-Management-Systems, das TemplateEngine, SignerManager und RelayManager orchestriert.

## Dateipfad
`framework/core/EventManager.js`

## Abhängigkeiten
- `EventBus`
- `TemplateEngine`
- `SignerManager`
- `RelayManager`

---

## Implementierungsschritte

### Schritt 1: EventManager Implementierung

**Datei**: `framework/core/EventManager.js`

```javascript
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
```

---

### Schritt 2: Browser Console Tests

```javascript
// Full Integration Test
import { EventManager } from './framework/core/EventManager.js';
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { SignerManager } from './framework/core/SignerManager.js';
import { RelayManager } from './framework/core/RelayManager.js';
import { MockSigner } from './framework/plugins/signer/MockSigner.js';
import { TextNoteTemplate, CalendarEventTemplate } from './framework/templates/index.js';

// Setup all managers
const templateEngine = new TemplateEngine();
templateEngine.register('text-note', new TextNoteTemplate());
templateEngine.register('calendar-event', new CalendarEventTemplate());

const signerManager = new SignerManager();
signerManager.setSigner(new MockSigner('test-pubkey-123'));

const relayManager = new RelayManager(null, {
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});
await relayManager.initialize();

const eventManager = new EventManager();
eventManager.setTemplateEngine(templateEngine);
eventManager.setSignerManager(signerManager);
eventManager.setRelayManager(relayManager);

// Test 1: Create unsigned event
const unsigned = eventManager.createUnsignedEvent('text-note', {
  content: 'Hello from EventManager!'
});
console.log('Unsigned event:', unsigned);
console.assert(unsigned.kind === 1, 'Kind should be 1');

// Test 2: Create signed event
const signed = await eventManager.createEvent('text-note', {
  content: 'Signed message'
});
console.log('Signed event:', signed);
console.assert(signed.id, 'Should have ID');
console.assert(signed.sig, 'Should have signature');

// Test 3: Publish event (will fail with mock signer and real relays)
try {
  const result = await eventManager.publishEvent(signed, { timeout: 2000 });
  console.log('Publish result:', result);
} catch (error) {
  console.log('Publish test (expected to fail with mock data):', error.message);
}

// Test 4: Create and publish in one call
try {
  const result = await eventManager.createAndPublish('text-note', {
    content: 'One-shot publish'
  }, { timeout: 2000 });
  console.log('Create and publish result:', result);
} catch (error) {
  console.log('One-shot test (expected to fail):', error.message);
}

// Test 5: Query events
const events = await eventManager.queryEvents([
  { kinds: [1], limit: 5 }
], { timeout: 5000 });
console.log(`Queried ${events.length} events`);

// Test 6: Subscribe to events
let subscriptionCount = 0;
const sub = eventManager.subscribe(
  [{ kinds: [1], limit: 3 }],
  (event) => {
    subscriptionCount++;
    console.log('Received event:', event.id);
  }
);

// Wait then close
setTimeout(() => {
  sub.close();
  console.log(`✓ Received ${subscriptionCount} events via subscription`);
}, 3000);

// Test 7: Parse event
if (events.length > 0) {
  const parsed = eventManager.parseEvent('text-note', events[0]);
  console.log('Parsed event:', parsed);
  console.assert(parsed.content, 'Should have content');
}

// Test 8: Event cache
const cached = eventManager.getCachedEvent(signed.id);
console.log('Cached event:', cached);
console.assert(cached?.id === signed.id, 'Should be in cache');

// Test 9: Cache stats
const stats = eventManager.getCacheStats();
console.log('Cache stats:', stats);

// Test 10: Events
eventManager.on('event:signed', (data) => {
  console.log('Event signed via event bus:', data.event.id);
});

eventManager.on('event:published', (data) => {
  console.log('Event published via event bus:', data.successCount);
});

// Test 11: Delete event
try {
  await eventManager.deleteEvent(signed.id, 'Test deletion');
  console.log('✓ Delete event created');
} catch (error) {
  console.log('Delete test (expected to fail):', error.message);
}

console.log('✓ All EventManager tests completed!');

// Expose globally
window.testEventManager = eventManager;
```

---

### Schritt 3: Test-Suite

**Datei**: `framework/core/EventManager.test.js`

```javascript
// framework/core/EventManager.test.js

import { EventManager } from './EventManager.js';
import { TemplateEngine } from './TemplateEngine.js';
import { SignerManager } from './SignerManager.js';
import { MockSigner } from '../plugins/signer/MockSigner.js';
import { TextNoteTemplate } from '../templates/nip01.js';

export function runEventManagerTests() {
  console.group('EventManager Tests');
  
  const results = { passed: 0, failed: 0, tests: [] };

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  (async () => {
    // Setup
    const templateEngine = new TemplateEngine();
    templateEngine.register('text-note', new TextNoteTemplate());

    const signerManager = new SignerManager();
    signerManager.setSigner(new MockSigner());

    const eventManager = new EventManager();
    eventManager.setTemplateEngine(templateEngine);
    eventManager.setSignerManager(signerManager);

    await asyncTest('createUnsignedEvent() creates event', async () => {
      const event = eventManager.createUnsignedEvent('text-note', {
        content: 'Test'
      });
      if (!event.kind || !event.content) {
        throw new Error('Invalid event structure');
      }
    });

    await asyncTest('createEvent() signs event', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Test'
      });
      if (!event.id || !event.sig) {
        throw new Error('Event not signed');
      }
    });

    await asyncTest('parseEvent() parses event', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Parse me'
      });
      const parsed = eventManager.parseEvent('text-note', event);
      if (parsed.content !== 'Parse me') {
        throw new Error('Parsing failed');
      }
    });

    await asyncTest('Cache stores events', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Cache test'
      });
      const cached = eventManager.getCachedEvent(event.id);
      if (!cached || cached.id !== event.id) {
        throw new Error('Event not cached');
      }
    });

    await asyncTest('Cache stats work', async () => {
      const stats = eventManager.getCacheStats();
      if (typeof stats.size !== 'number') {
        throw new Error('Invalid stats');
      }
    });

    await asyncTest('Clear cache works', async () => {
      await eventManager.createEvent('text-note', { content: 'Test' });
      eventManager.clearCache();
      if (eventManager.getCacheStats().size !== 0) {
        throw new Error('Cache not cleared');
      }
    });

    await asyncTest('Events fire correctly', async () => {
      let eventFired = false;
      eventManager.on('event:signed', () => eventFired = true);
      
      await eventManager.createEvent('text-note', { content: 'Test' });
      
      if (!eventFired) throw new Error('Event not fired');
    });

    console.groupEnd();
    console.log('\n📊 Test Results:');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Total: ${results.passed + results.failed}`);
    
    return results;
  })();
}

if (typeof window !== 'undefined') {
  window.runEventManagerTests = runEventManagerTests;
  console.log('💡 Run tests with: runEventManagerTests()');
}
```

---

## Akzeptanzkriterien

- [ ] EventManager implementiert
- [ ] Event-Erstellung funktioniert
- [ ] Event-Signierung funktioniert
- [ ] Event-Publishing funktioniert (mit real Relays)
- [ ] Event-Queries funktionieren
- [ ] Subscriptions funktionieren
- [ ] Event-Parsing funktioniert
- [ ] Event-Cache funktioniert
- [ ] Event-Deletion funktioniert
- [ ] Alle Events werden gefeuert
- [ ] Alle Tests bestehen

---

## Nächste Schritte

1. ✅ EventBus implementiert
2. ✅ IdentityManager implementiert
3. ✅ SignerManager implementiert
4. ✅ TemplateEngine implementiert
5. ✅ RelayManager implementiert
6. ✅ EventManager implementiert
7. ➡️ Weiter mit `AGENT_StorageManager.md`
