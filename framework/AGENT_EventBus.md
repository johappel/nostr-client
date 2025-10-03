# AGENT: EventBus System

## Ziel
Implementierung eines zentralen Event-Bus Systems für Framework-interne Kommunikation und externe Event-Listener.

## Dateipfad
`framework/core/EventBus.js`

## Abhängigkeiten
Keine - dies ist das Basis-Modul

---

## Implementierungsschritte

### Schritt 1: Basis-Klasse erstellen

**Code**:
```javascript
// framework/core/EventBus.js

/**
 * Central event bus for framework-wide event handling
 * Implements observer pattern for decoupled communication
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
    this._debugMode = false;
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this._debugMode = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }

    this._listeners.get(event).push(callback);

    if (this._debugMode) {
      console.log(`[EventBus] Listener registered for "${event}"`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      if (this._debugMode) {
        console.log(`[EventBus] Listener removed for "${event}"`);
      }
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Register one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    
    if (this._debugMode) {
      console.log(`[EventBus] Emitting "${event}"`, data);
    }

    if (!listeners || listeners.length === 0) {
      if (this._debugMode) {
        console.log(`[EventBus] No listeners for "${event}"`);
      }
      return;
    }

    // Call all listeners with error handling
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
        this.emit('error', { event, error });
      }
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, removes all if not provided)
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
      if (this._debugMode) {
        console.log(`[EventBus] Cleared all listeners for "${event}"`);
      }
    } else {
      this._listeners.clear();
      if (this._debugMode) {
        console.log('[EventBus] Cleared all listeners');
      }
    }
  }

  /**
   * Get list of active event names
   * @returns {string[]}
   */
  getEvents() {
    return Array.from(this._listeners.keys());
  }

  /**
   * Get number of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  getListenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get total number of listeners across all events
   * @returns {number}
   */
  getTotalListeners() {
    let total = 0;
    for (const listeners of this._listeners.values()) {
      total += listeners.length;
    }
    return total;
  }
}
```

**Test in Browser Console**:
```javascript
// Test 1: Basis-Funktionalität
const bus = new EventBus();
bus.setDebugMode(true);

let testValue = 0;
bus.on('test-event', (data) => {
  testValue = data.value;
  console.log('Received:', data);
});

bus.emit('test-event', { value: 42 });
console.assert(testValue === 42, 'Event data should be received');
console.log('✓ Test 1 passed: Basic emit/on works');

// Test 2: Multiple Listeners
let count1 = 0, count2 = 0;
bus.on('multi-test', () => count1++);
bus.on('multi-test', () => count2++);

bus.emit('multi-test');
console.assert(count1 === 1 && count2 === 1, 'Both listeners should be called');
console.log('✓ Test 2 passed: Multiple listeners work');

// Test 3: Unsubscribe
let unsubCount = 0;
const unsub = bus.on('unsub-test', () => unsubCount++);
bus.emit('unsub-test');
unsub(); // Unsubscribe
bus.emit('unsub-test');
console.assert(unsubCount === 1, 'Should only be called once');
console.log('✓ Test 3 passed: Unsubscribe works');

// Test 4: Once
let onceCount = 0;
bus.once('once-test', () => onceCount++);
bus.emit('once-test');
bus.emit('once-test');
console.assert(onceCount === 1, 'Once listener should only fire once');
console.log('✓ Test 4 passed: Once works');

// Test 5: Error handling
bus.on('error-test', () => {
  throw new Error('Test error');
});
bus.emit('error-test'); // Should not crash
console.log('✓ Test 5 passed: Error handling works');

// Test 6: Stats
console.log('Active events:', bus.getEvents());
console.log('Total listeners:', bus.getTotalListeners());

// Cleanup
bus.clear();
console.log('✓ All EventBus tests passed!');
```

---

### Schritt 2: Test-Suite erweitern

**Datei**: `framework/core/EventBus.test.js`

```javascript
// framework/core/EventBus.test.js
import { EventBus } from './EventBus.js';

/**
 * Manual test suite for EventBus
 * Run in browser console after importing EventBus
 */
export function runEventBusTests() {
  console.group('EventBus Tests');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  // Test Suite
  test('EventBus constructor', () => {
    const bus = new EventBus();
    if (!bus._listeners) throw new Error('Listeners map not initialized');
  });

  test('on() registers listener', () => {
    const bus = new EventBus();
    let called = false;
    bus.on('test', () => called = true);
    bus.emit('test');
    if (!called) throw new Error('Listener not called');
  });

  test('emit() passes data correctly', () => {
    const bus = new EventBus();
    let received = null;
    bus.on('test', (data) => received = data);
    bus.emit('test', { foo: 'bar' });
    if (received?.foo !== 'bar') throw new Error('Data not passed correctly');
  });

  test('off() removes listener', () => {
    const bus = new EventBus();
    let count = 0;
    const callback = () => count++;
    bus.on('test', callback);
    bus.emit('test');
    bus.off('test', callback);
    bus.emit('test');
    if (count !== 1) throw new Error('Listener not removed');
  });

  test('once() fires only once', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('test', () => count++);
    bus.emit('test');
    bus.emit('test');
    if (count !== 1) throw new Error('Once fired multiple times');
  });

  test('unsubscribe function works', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on('test', () => count++);
    bus.emit('test');
    unsub();
    bus.emit('test');
    if (count !== 1) throw new Error('Unsubscribe failed');
  });

  test('multiple listeners for same event', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('test', () => count++);
    bus.on('test', () => count++);
    bus.on('test', () => count++);
    bus.emit('test');
    if (count !== 3) throw new Error('Not all listeners called');
  });

  test('error handling in listeners', () => {
    const bus = new EventBus();
    let errorEmitted = false;
    bus.on('error', () => errorEmitted = true);
    bus.on('test', () => { throw new Error('Test error'); });
    bus.emit('test');
    if (!errorEmitted) throw new Error('Error not handled');
  });

  test('clear() removes all listeners', () => {
    const bus = new EventBus();
    bus.on('test1', () => {});
    bus.on('test2', () => {});
    bus.clear();
    if (bus.getTotalListeners() !== 0) throw new Error('Listeners not cleared');
  });

  test('getEvents() returns event names', () => {
    const bus = new EventBus();
    bus.on('event1', () => {});
    bus.on('event2', () => {});
    const events = bus.getEvents();
    if (!events.includes('event1') || !events.includes('event2')) {
      throw new Error('Event names not returned');
    }
  });

  test('getListenerCount() returns correct count', () => {
    const bus = new EventBus();
    bus.on('test', () => {});
    bus.on('test', () => {});
    if (bus.getListenerCount('test') !== 2) {
      throw new Error('Listener count incorrect');
    }
  });

  test('debug mode logs events', () => {
    const bus = new EventBus();
    bus.setDebugMode(true);
    // Visual check in console
    bus.on('test', () => {});
    bus.emit('test', { debug: true });
    bus.setDebugMode(false);
  });

  console.groupEnd();
  console.log('\n📊 Test Results:');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  
  return results;
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.runEventBusTests = runEventBusTests;
  console.log('💡 Run tests with: runEventBusTests()');
}
```

**Browser Console Test**:
```javascript
// Nach Import der Test-Datei:
const results = runEventBusTests();
console.table(results.tests);
```

---

### Schritt 3: Integration in Framework

**Datei**: `framework/index.js` (Teil-Update)

```javascript
// framework/index.js
export { EventBus } from './core/EventBus.js';

// Quick test export
export { runEventBusTests } from './core/EventBus.test.js';
```

**Browser Console Test (nach Integration)**:
```javascript
// Test: Framework-Import
import { EventBus, runEventBusTests } from './framework/index.js';

const bus = new EventBus();
console.log('EventBus instance:', bus);

// Run test suite
runEventBusTests();

// Expose globally für weitere Tests
window.NostrFramework = { EventBus };
console.log('✓ EventBus ready for use');
```

---

## Akzeptanzkriterien

- [ ] EventBus-Klasse exportiert und importierbar
- [ ] Alle 12 Tests in runEventBusTests() bestehen
- [ ] Debug-Modus funktioniert
- [ ] Error-Handling verhindert Crashes
- [ ] Unsubscribe-Funktion funktioniert
- [ ] Memory-Leaks vermieden (leere Listener-Arrays werden entfernt)

---

## Nächste Schritte

Nach erfolgreichem Test:
1. ✅ EventBus ist implementiert
2. ➡️ Weiter mit `AGENT_IdentityManager.md`
3. EventBus wird in allen Managern genutzt

---

## Debugging-Tipps

**Problem**: Events werden nicht gefeuert
```javascript
bus.setDebugMode(true);
bus.emit('my-event', { test: 123 });
// Check console for debug output
```

**Problem**: Memory-Leak durch Listener
```javascript
// Prüfe aktive Listener
console.log('Total listeners:', bus.getTotalListeners());
console.log('Events:', bus.getEvents());

// Cleanup
bus.clear();
```

**Problem**: Listener wird nicht ausgeführt
```javascript
// Prüfe ob Listener registriert ist
console.log('Listeners for "my-event":', bus.getListenerCount('my-event'));

// Teste direkt
bus.on('test', (data) => console.log('Received:', data));
bus.emit('test', { foo: 'bar' });
```
