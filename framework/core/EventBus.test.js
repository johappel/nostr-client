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