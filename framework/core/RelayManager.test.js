// framework/core/RelayManager.test.js

import { RelayManager } from './RelayManager.js';
import { EventBus } from './EventBus.js';

/**
 * RelayManager Test Suite
 */
export async function runRelayManagerTests() {
  console.log('🧪 Starting RelayManager Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: '❌ FAIL', error: error.message });
      console.error(`❌ ${name}:`, error.message);
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: '❌ FAIL', error: error.message });
      console.error(`❌ ${name}:`, error.message);
    }
  }

  // Test 1: Constructor
  test('Constructor creates instance', () => {
    const manager = new RelayManager();
    if (!manager) throw new Error('Failed to create instance');
    if (!manager._eventBus) throw new Error('EventBus not initialized');
    if (!(manager._relays instanceof Set)) throw new Error('Relays not initialized');
  });

  // Test 2: Constructor with config
  test('Constructor accepts config', () => {
    const eventBus = new EventBus();
    const config = {
      relays: ['wss://relay1.test', 'wss://relay2.test']
    };
    const manager = new RelayManager(eventBus, config);
    
    if (manager._eventBus !== eventBus) throw new Error('EventBus not set');
    if (manager._relays.size !== 2) throw new Error('Relays not added');
  });

  // Test 3: Add relays
  test('addRelays adds single relay', () => {
    const manager = new RelayManager();
    manager.addRelays('wss://relay.test');
    
    if (!manager._relays.has('wss://relay.test')) {
      throw new Error('Relay not added');
    }
  });

  // Test 4: Add multiple relays
  test('addRelays adds multiple relays', () => {
    const manager = new RelayManager();
    manager.addRelays(['wss://relay1.test', 'wss://relay2.test']);
    
    if (manager._relays.size !== 2) {
      throw new Error('Not all relays added');
    }
  });

  // Test 5: Remove relays
  test('removeRelays removes relay', () => {
    const manager = new RelayManager(null, {
      relays: ['wss://relay1.test', 'wss://relay2.test']
    });
    
    manager.removeRelays('wss://relay1.test');
    
    if (manager._relays.has('wss://relay1.test')) {
      throw new Error('Relay not removed');
    }
    if (manager._relays.size !== 1) {
      throw new Error('Wrong relay count');
    }
  });

  // Test 6: Get relays
  test('getRelays returns array', () => {
    const manager = new RelayManager(null, {
      relays: ['wss://relay1.test', 'wss://relay2.test']
    });
    
    const relays = manager.getRelays();
    if (!Array.isArray(relays)) throw new Error('Not an array');
    if (relays.length !== 2) throw new Error('Wrong count');
  });

  // Test 7: Relay status initialization
  test('Relay status is tracked on add', () => {
    const manager = new RelayManager();
    manager.addRelays('wss://relay.test');
    
    const status = manager._relayStatus.get('wss://relay.test');
    if (!status) throw new Error('Status not tracked');
    if (status.status !== 'disconnected') throw new Error('Wrong initial status');
  });

  // Test 8: Event emission on add
  test('Events emitted on addRelays', () => {
    const eventBus = new EventBus();
    const manager = new RelayManager(eventBus);
    
    let emitted = false;
    eventBus.on('relay:added', () => { emitted = true; });
    
    manager.addRelays('wss://relay.test');
    
    if (!emitted) throw new Error('Event not emitted');
  });

  // Test 9: Event emission on remove
  test('Events emitted on removeRelays', () => {
    const eventBus = new EventBus();
    const manager = new RelayManager(eventBus, {
      relays: ['wss://relay.test']
    });
    
    let emitted = false;
    eventBus.on('relay:removed', () => { emitted = true; });
    
    manager.removeRelays('wss://relay.test');
    
    if (!emitted) throw new Error('Event not emitted');
  });

  // Test 10: Subscription ID generation
  test('Subscription IDs are unique', () => {
    const manager = new RelayManager();
    const id1 = manager._generateSubscriptionId();
    const id2 = manager._generateSubscriptionId();
    
    if (id1 === id2) throw new Error('IDs not unique');
    if (!id1.startsWith('sub_')) throw new Error('Invalid ID format');
  });

  // Test 11: Get relay status
  test('getRelayStatus returns Map', () => {
    const manager = new RelayManager(null, {
      relays: ['wss://relay.test']
    });
    
    const status = manager.getRelayStatus();
    if (!(status instanceof Map)) throw new Error('Not a Map');
    if (status.size !== 1) throw new Error('Wrong size');
  });

  // Test 12: Get subscription count
  test('getSubscriptionCount returns number', () => {
    const manager = new RelayManager();
    const count = manager.getSubscriptionCount();
    
    if (typeof count !== 'number') throw new Error('Not a number');
    if (count !== 0) throw new Error('Should be 0');
  });

  // Test 13: Update relay status
  test('_updateRelayStatus updates correctly', () => {
    const manager = new RelayManager();
    manager.addRelays('wss://relay.test');
    
    manager._updateRelayStatus('wss://relay.test', 'connected');
    
    const status = manager._relayStatus.get('wss://relay.test');
    if (status.status !== 'connected') throw new Error('Status not updated');
    if (!status.lastSeen) throw new Error('lastSeen not set');
  });

  // Test 14: Update relay status with error
  test('_updateRelayStatus handles errors', () => {
    const manager = new RelayManager();
    manager.addRelays('wss://relay.test');
    
    const error = new Error('Test error');
    manager._updateRelayStatus('wss://relay.test', 'error', error);
    
    const status = manager._relayStatus.get('wss://relay.test');
    if (status.status !== 'error') throw new Error('Status not updated');
    if (!status.error) throw new Error('Error not stored');
  });

  // Test 15: Ensure initialized throws when not initialized
  test('_ensureInitialized throws before initialize', () => {
    const manager = new RelayManager();
    
    try {
      manager._ensureInitialized();
      throw new Error('Should have thrown');
    } catch (error) {
      if (!error.message.includes('not initialized')) {
        throw new Error('Wrong error message');
      }
    }
  });

  // Test 16: On method delegates to EventBus
  test('on() delegates to EventBus', () => {
    const manager = new RelayManager();
    let called = false;
    
    manager.on('test', () => { called = true; });
    manager._eventBus.emit('test', {});
    
    if (!called) throw new Error('Callback not called');
  });

  // Test 17: Close all subscriptions
  test('closeAllSubscriptions clears map', () => {
    const manager = new RelayManager();
    
    // Mock subscriptions
    manager._subscriptions.set('sub1', { close: () => {} });
    manager._subscriptions.set('sub2', { close: () => {} });
    
    manager.closeAllSubscriptions();
    
    if (manager._subscriptions.size !== 0) {
      throw new Error('Subscriptions not cleared');
    }
  });

  // Test 18: Destroy cleanup
  test('destroy() performs cleanup', () => {
    const manager = new RelayManager();
    
    // Add mock data
    manager._subscriptions.set('sub1', { close: () => {} });
    manager._pool = { close: () => {} };
    
    manager.destroy();
    
    if (manager._subscriptions.size !== 0) throw new Error('Subscriptions not cleared');
    if (manager._pool !== null) throw new Error('Pool not cleared');
  });

  // Test 19: WithTimeout helper
  await testAsync('_withTimeout resolves fast promise', async () => {
    const manager = new RelayManager();
    
    const fastPromise = Promise.resolve('fast');
    const result = await manager._withTimeout(fastPromise, 1000, 'Timeout');
    
    if (result !== 'fast') throw new Error('Wrong result');
  });

  // Test 20: WithTimeout helper timeout
  await testAsync('_withTimeout rejects slow promise', async () => {
    const manager = new RelayManager();
    
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 2000));
    
    try {
      await manager._withTimeout(slowPromise, 100, 'Timeout error');
      throw new Error('Should have timed out');
    } catch (error) {
      if (error.message !== 'Timeout error') {
        throw new Error('Wrong error message');
      }
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  return results;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
  window.runRelayManagerTests = runRelayManagerTests;
}