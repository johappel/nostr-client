// framework/core/StorageManager.test.js

import { StorageManager } from './StorageManager.js';
import { EventBus } from './EventBus.js';
import { LocalStoragePlugin } from '../plugins/storage/LocalStoragePlugin.js';

/**
 * Test suite for StorageManager
 */
export function runStorageManagerTests() {
  console.log('=== StorageManager Tests ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: '✓ PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: '✗ FAIL', error: error.message });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  // Test 1: Constructor
  test('Constructor creates instance with EventBus', () => {
    const manager = new StorageManager();
    assert(manager._eventBus instanceof EventBus, 'Should have EventBus');
    assert(manager._plugin === null, 'Should not have plugin initially');
  });

  // Test 2: Initialize with plugin
  test('Initialize with LocalStoragePlugin', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_' });
    
    await manager.initialize(plugin);
    assert(manager._plugin === plugin, 'Should have plugin set');
    assert(plugin.isInitialized(), 'Plugin should be initialized');
  });

  // Test 3: Save events
  test('Save events to storage', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_save_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'test1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Test 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'test2',
        kind: 1,
        pubkey: 'def456',
        content: 'Test 2',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    const count = await manager.save(events);
    assert(count === 2, `Should save 2 events, saved ${count}`);
    
    // Cleanup
    await manager.clear();
  });

  // Test 4: Query events
  test('Query events from storage', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_query_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'query1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Query Test 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'query2',
        kind: 3,
        pubkey: 'def456',
        content: 'Query Test 2',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    
    const result = await manager.query([{ kinds: [1] }]);
    assert(result.length === 1, `Should find 1 event, found ${result.length}`);
    assert(result[0].id === 'query1', 'Should find correct event');
    
    // Cleanup
    await manager.clear();
  });

  // Test 5: Delete events
  test('Delete events from storage', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_delete_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'delete1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Delete Test 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'delete2',
        kind: 1,
        pubkey: 'def456',
        content: 'Delete Test 2',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    
    const deleted = await manager.delete(['delete1']);
    assert(deleted === 1, `Should delete 1 event, deleted ${deleted}`);
    
    const remaining = await manager.query([]);
    assert(remaining.length === 1, `Should have 1 event left, has ${remaining.length}`);
    assert(remaining[0].id === 'delete2', 'Should have correct event remaining');
    
    // Cleanup
    await manager.clear();
  });

  // Test 6: Clear storage
  test('Clear all events from storage', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_clear_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'clear1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Clear Test 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'clear2',
        kind: 1,
        pubkey: 'def456',
        content: 'Clear Test 2',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    await manager.clear();
    
    const remaining = await manager.query([]);
    assert(remaining.length === 0, `Should have 0 events, has ${remaining.length}`);
  });

  // Test 7: Get stats
  test('Get storage statistics', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_stats_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'stats1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Stats Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    
    const stats = await manager.getStats();
    assert(stats.eventCount === 1, `Should have 1 event, has ${stats.eventCount}`);
    assert(stats.approximateSizeBytes > 0, 'Should have size > 0');
    
    // Cleanup
    await manager.clear();
  });

  // Test 8: Event listeners
  test('Event listeners work', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_events_' });
    await manager.initialize(plugin);
    
    let savedCalled = false;
    manager.on('storage:saved', () => {
      savedCalled = true;
    });
    
    const events = [
      {
        id: 'event1',
        kind: 1,
        pubkey: 'abc123',
        content: 'Event Test',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    
    // Small delay for async event
    await new Promise(resolve => setTimeout(resolve, 10));
    
    assert(savedCalled, 'storage:saved event should be called');
    
    // Cleanup
    await manager.clear();
  });

  // Test 9: Error handling - no initialization
  test('Error when not initialized', async () => {
    const manager = new StorageManager();
    
    let errorThrown = false;
    try {
      await manager.save([]);
    } catch (error) {
      errorThrown = true;
      assert(error.message.includes('not initialized'), 'Should throw initialization error');
    }
    
    assert(errorThrown, 'Should throw error when not initialized');
  });

  // Test 10: Filter matching
  test('Query with multiple filters', async () => {
    const manager = new StorageManager();
    const plugin = new LocalStoragePlugin({ keyPrefix: 'test_filter_' });
    await manager.initialize(plugin);
    
    const events = [
      {
        id: 'filter1',
        kind: 1,
        pubkey: 'author1',
        content: 'Filter Test 1',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'filter2',
        kind: 1,
        pubkey: 'author2',
        content: 'Filter Test 2',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'filter3',
        kind: 3,
        pubkey: 'author1',
        content: 'Filter Test 3',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
    
    await manager.save(events);
    
    // Test author filter
    const byAuthor = await manager.query([{ authors: ['author1'] }]);
    assert(byAuthor.length === 2, `Should find 2 events by author1, found ${byAuthor.length}`);
    
    // Test kind filter
    const byKind = await manager.query([{ kinds: [1] }]);
    assert(byKind.length === 2, `Should find 2 events of kind 1, found ${byKind.length}`);
    
    // Test combined filters
    const combined = await manager.query([{ kinds: [1], authors: ['author1'] }]);
    assert(combined.length === 1, `Should find 1 event matching both, found ${combined.length}`);
    
    // Cleanup
    await manager.clear();
  });

  console.log(`\n=== Results: ${results.passed} passed, ${results.failed} failed ===\n`);
  
  return results;
}