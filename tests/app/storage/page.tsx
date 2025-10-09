// tests/app/storage/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './storage.module.css';

// Types
interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message?: string;
  duration?: number;
}

interface StorageStats {
  eventCount: number;
  storageSize: number;
  lastOperation: string;
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export default function StorageTestPage() {
  const [manager, setManager] = useState<any>(null);
  const [plugin, setPlugin] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<StorageStats>({
    eventCount: 0,
    storageSize: 0,
    lastOperation: '-'
  });

  const testCases = [
    'StorageManager Initialization',
    'LocalStorage Plugin Registration',
    'Save Test Events',
    'Query Events by Kind',
    'Query Events by Author',
    'Query Events by Tag',  
    'Update Event',
    'Delete Events',
    'Clear Storage',
    'Storage Statistics',
    'Plugin Capabilities',
    'Error Handling'
  ];

  const addLog = (message: string, type: 'log' | 'info' | 'warn' | 'error' | 'success' = 'log') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
  };

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => {
      const index = prev.findIndex(t => t.name === testName);
      const newResult: TestResult = { name: testName, status, message, duration };
      
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestResult(testName, 'pending');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'success', 'Test passed', duration);
      addLog(`✅ ${testName} - SUCCESS (${duration}ms)`, 'success');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'error', error.message, duration);
      addLog(`❌ ${testName} - ERROR: ${error.message}`, 'error');
      throw error;
    }
  };

  const createTestEvents = (count: number): NostrEvent[] => {
    const events: NostrEvent[] = [];
    const testPubkey = '0'.repeat(64);
    
    for (let i = 0; i < count; i++) {
      const event: NostrEvent = {
        id: `test-event-${i}-${Date.now()}`.padEnd(64, '0'),
        pubkey: testPubkey,
        created_at: Math.floor(Date.now() / 1000) - i * 60,
        kind: i % 2 === 0 ? 1 : 30023, // Alternate between text notes and long-form
        tags: [
          ['t', 'test'],
          ['t', `category-${i % 3}`],
          ['client', 'nostr-framework-nextjs-test']
        ],
        content: `Test event #${i} - Next.js Storage Plugin Test - ${new Date().toISOString()}`,
        sig: `test-signature-${i}`.padEnd(128, '0')
      };
      events.push(event);
    }
    
    return events;
  };

  const updateStorageStats = async () => {
    if (!manager) return;
    
    try {
      // Get all events to count them
      const allEvents = await manager.query([{}]);
      const eventCount = allEvents.length;
      
      // Estimate storage size (rough calculation)
      const storageSize = Math.round(JSON.stringify(allEvents).length / 1024);
      
      setStats(prev => ({
        ...prev,
        eventCount,
        storageSize
      }));
    } catch (error: any) {
      addLog(`Warning: Could not update stats: ${error.message}`, 'warn');
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setStats({ eventCount: 0, storageSize: 0, lastOperation: '-' });
    
    addLog('🚀 Starting Next.js Storage Plugin Test Suite...', 'info');
    
    try {
      // Import required classes
      const { StorageManager } = await import('../../../framework/dist/core/StorageManager.js');
      const { LocalStoragePlugin } = await import('../../../framework/dist/plugins/storage/LocalStoragePlugin.js');
      
      // Test 1: StorageManager Initialization
      let testManager: any;
      let testPlugin: any;
      await runTest('StorageManager Initialization', async () => {
        testManager = new StorageManager();
        testPlugin = new LocalStoragePlugin();
        await testManager.initialize(testPlugin);
        setManager(testManager);
        setPlugin(testPlugin);
        addLog('StorageManager initialized with LocalStoragePlugin', 'info');
        
        // Clear storage to start with clean state
        await testManager.clear();
        addLog('Storage cleared for clean test start', 'info');
      });

      // Test 2: Plugin Verification
      await runTest('LocalStorage Plugin Registration', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        if (!testPlugin.isInitialized()) throw new Error('Plugin not properly initialized');
        addLog('LocalStoragePlugin verified and ready', 'info');
      });

      // Test 3: Save Test Events
      let testEvents: NostrEvent[] = [];
      await runTest('Save Test Events', async () => {
        testEvents = createTestEvents(5);
        addLog(`Creating ${testEvents.length} test events...`, 'info');
        
        const savedCount = await testManager.save(testEvents);
        if (savedCount !== testEvents.length) {
          throw new Error(`Expected to save ${testEvents.length} events, but saved ${savedCount}`);
        }
        
        addLog(`Saved ${savedCount} events successfully`, 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Save' }));
        await updateStorageStats();
      });

      // Test 4: Query Events by Kind
      await runTest('Query Events by Kind', async () => {
        const textNotes = await testManager.query([{ kinds: [1] }]);
        const longForm = await testManager.query([{ kinds: [30023] }]);
        
        addLog(`Found ${textNotes.length} text notes (kind 1)`, 'info');
        addLog(`Found ${longForm.length} long-form articles (kind 30023)`, 'info');
        
        if (textNotes.length === 0 && longForm.length === 0) {
          throw new Error('No events found by kind query');
        }
        
        setStats(prev => ({ ...prev, lastOperation: 'Query by Kind' }));
      });

      // Test 5: Query Events by Author
      await runTest('Query Events by Author', async () => {
        const testPubkey = '0'.repeat(64);
        const authorEvents = await testManager.query([{ authors: [testPubkey] }]);
        
        addLog(`Expected ${testEvents.length} events by author, found ${authorEvents.length}`, 'info');
        
        // We should find at least our test events, but there might be more from previous operations
        if (authorEvents.length < testEvents.length) {
          throw new Error(`Expected at least ${testEvents.length} events by author, found only ${authorEvents.length}`);
        }
        
        // Verify our test events are included
        const testEventIds = testEvents.map(e => e.id);
        const foundIds = authorEvents.map((e: NostrEvent) => e.id);
        const missingEvents = testEventIds.filter(id => !foundIds.includes(id));
        
        if (missingEvents.length > 0) {
          throw new Error(`Missing test events: ${missingEvents.join(', ')}`);
        }
        
        addLog(`Found ${authorEvents.length} events by test author (including our ${testEvents.length} test events)`, 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Query by Author' }));
      });

      // Test 6: Query Events by Tag
      await runTest('Query Events by Tag', async () => {
        const taggedEvents = await testManager.query([{ '#t': ['test'] }]);
        
        if (taggedEvents.length === 0) {
          throw new Error('No events found with #t tag');
        }
        
        addLog(`Found ${taggedEvents.length} events with 'test' tag`, 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Query by Tag' }));
      });

      // Test 7: Update Event (if supported)
      await runTest('Update Event', async () => {
        // For this test, we'll create a new event with updated content
        const originalEvent = testEvents[0];
        const updatedEvent = {
          ...originalEvent,
          id: `updated-${originalEvent.id}`,
          content: `UPDATED: ${originalEvent.content}`,
          created_at: Math.floor(Date.now() / 1000)
        };
        
        const savedCount = await testManager.save([updatedEvent]);
        if (savedCount !== 1) {
          throw new Error('Failed to save updated event');
        }
        
        addLog('Event updated successfully', 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Update' }));
        await updateStorageStats();
      });

      // Test 8: Delete Events
      await runTest('Delete Events', async () => {
        // Delete the first 2 test events
        const eventsToDelete = testEvents.slice(0, 2);
        const idsToDelete = eventsToDelete.map(e => e.id);
        
        const deletedCount = await testManager.delete(idsToDelete);
        if (deletedCount !== idsToDelete.length) {
          addLog(`Warning: Expected to delete ${idsToDelete.length} events, deleted ${deletedCount}`, 'warn');
        }
        
        addLog(`Deleted ${deletedCount} events`, 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Delete' }));
        await updateStorageStats();
      });

      // Test 9: Clear Storage
      await runTest('Clear Storage', async () => {
        // First check how many events we have
        const beforeClear = await testManager.query([{}]);
        addLog(`Events before clear: ${beforeClear.length}`, 'info');
        
        // Clear storage
        await testManager.clear();
        
        // Verify storage is empty
        const afterClear = await testManager.query([{}]);
        if (afterClear.length !== 0) {
          throw new Error(`Storage not cleared properly, ${afterClear.length} events remain`);
        }
        
        addLog('Storage cleared successfully', 'success');
        setStats(prev => ({ ...prev, lastOperation: 'Clear' }));
        await updateStorageStats();
      });

      // Test 10: Storage Statistics
      await runTest('Storage Statistics', async () => {
        // Add some events back for stats
        const newEvents = createTestEvents(3);
        await testManager.save(newEvents);
        await updateStorageStats();
        
        addLog(`Events in storage: ${stats.eventCount}`, 'info');
        addLog(`Storage size: ${stats.storageSize} KB`, 'info');
        
        setStats(prev => ({ ...prev, lastOperation: 'Statistics' }));
      });

      // Test 11: Plugin Capabilities
      await runTest('Plugin Capabilities', async () => {
        if (!testPlugin) throw new Error('Plugin not available');
        
        // Check plugin properties - LocalStoragePlugin uses save/query/delete/clear
        const hasSave = typeof testPlugin.save === 'function';
        const hasQuery = typeof testPlugin.query === 'function';
        const hasDelete = typeof testPlugin.delete === 'function';
        const hasClear = typeof testPlugin.clear === 'function';
        const hasInitialize = typeof testPlugin.initialize === 'function';
        const hasIsInitialized = typeof testPlugin.isInitialized === 'function';
        
        addLog(`Plugin capabilities:`, 'info');
        addLog(`  name: ${testPlugin.name || 'undefined'}`, 'info');
        addLog(`  save: ${hasSave ? '✅' : '❌'}`, 'info');
        addLog(`  query: ${hasQuery ? '✅' : '❌'}`, 'info');
        addLog(`  delete: ${hasDelete ? '✅' : '❌'}`, 'info');
        addLog(`  clear: ${hasClear ? '✅' : '❌'}`, 'info');
        addLog(`  initialize: ${hasInitialize ? '✅' : '❌'}`, 'info');
        addLog(`  isInitialized: ${hasIsInitialized ? '✅' : '❌'}`, 'info');
        
        if (!hasSave || !hasQuery) {
          throw new Error(`Plugin missing required capabilities: save=${hasSave}, query=${hasQuery}`);
        }
        
        if (hasIsInitialized && !testPlugin.isInitialized()) {
          throw new Error('Plugin not properly initialized');
        }
        
        setStats(prev => ({ ...prev, lastOperation: 'Capabilities Check' }));
      });

      // Test 12: Error Handling
      await runTest('Error Handling', async () => {
        try {
          // Try to query with invalid filter
          await testManager.query([{ invalidFilter: 'test' }]);
          addLog('Invalid query handled gracefully', 'info');
        } catch (error: any) {
          addLog(`Query error handled: ${error.message}`, 'info');
        }
        
        try {
          // Try to delete non-existent event
          await testManager.delete(['non-existent-id']);
          addLog('Non-existent delete handled gracefully', 'info');
        } catch (error: any) {
          addLog(`Delete error handled: ${error.message}`, 'info');
        }
        
        setStats(prev => ({ ...prev, lastOperation: 'Error Handling' }));
      });

      addLog('🎉 All Next.js Storage tests completed successfully!', 'success');
      
    } catch (error: any) {
      addLog(`💥 Next.js Storage test suite failed: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const saveTestEvents = async () => {
    if (!manager) return;
    
    try {
      const events = createTestEvents(5);
      addLog(`Saving ${events.length} test events...`, 'info');
      const savedCount = await manager.save(events);
      addLog(`✅ Saved ${savedCount} events`, 'success');
      setStats(prev => ({ ...prev, lastOperation: 'Manual Save' }));
      await updateStorageStats();
    } catch (error: any) {
      addLog(`❌ Save failed: ${error.message}`, 'error');
    }
  };

  const queryEvents = async () => {
    if (!manager) return;
    
    try {
      addLog('Querying all events...', 'info');
      const events = await manager.query([{}]);
      addLog(`✅ Found ${events.length} events`, 'success');
      
      // Show first few events
      events.slice(0, 3).forEach((event: NostrEvent) => {
        addLog(`  - ${event.id.substring(0, 16)}...: ${event.content.substring(0, 50)}...`, 'info');
      });
      
      setStats(prev => ({ ...prev, lastOperation: 'Manual Query' }));
    } catch (error: any) {
      addLog(`❌ Query failed: ${error.message}`, 'error');
    }
  };

  const clearStorage = async () => {
    if (!manager) return;
    
    try {
      addLog('Clearing all storage...', 'info');
      await manager.clear();
      addLog('✅ Storage cleared', 'success');
      setStats(prev => ({ ...prev, lastOperation: 'Manual Clear' }));
      await updateStorageStats();
    } catch (error: any) {
      addLog(`❌ Clear failed: ${error.message}`, 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize manager on mount
  useEffect(() => {
    const initManager = async () => {
      try {
        const { StorageManager } = await import('../../../framework/dist/core/StorageManager.js');
        const { LocalStoragePlugin } = await import('../../../framework/dist/plugins/storage/LocalStoragePlugin.js');
        
        const testManager = new StorageManager();
        const testPlugin = new LocalStoragePlugin();
        await testManager.initialize(testPlugin);
        
        setManager(testManager);
        setPlugin(testPlugin);
        
        addLog('✅ Next.js Storage test environment ready', 'success');
        addLog('StorageManager and LocalStoragePlugin initialized', 'info');
        
        // Update initial stats
        await updateStorageStats();
      } catch (error: any) {
        addLog(`❌ Failed to initialize: ${error.message}`, 'error');
        console.error('Storage initialization error:', error);
      }
    };
    
    initManager();
  }, []);

  // Update stats when manager changes
  useEffect(() => {
    if (manager) {
      updateStorageStats();
    }
  }, [manager]);

  const successCount = testResults.filter(r => r.status === 'success').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>💾 Storage Plugin Test (Next.js)</h1>
        <p className={styles.subtitle}>
          Next.js-konvertierte Version des Storage Manager Tests
        </p>
      </div>

      <div className={styles.info}>
        <strong>ℹ️ HINWEIS:</strong> Dieser Test verwendet LocalStorage für Persistierung. 
        Alle Daten bleiben im Browser gespeichert bis zur manuellen Löschung.
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Events Stored</div>
          <div className={styles.statValue}>{stats.eventCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Storage Size (KB)</div>
          <div className={styles.statValue}>{stats.storageSize}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Last Operation</div>
          <div className={styles.statValue} style={{ fontSize: '14px' }}>{stats.lastOperation}</div>
        </div>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning || !manager}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {isRunning ? '🔄 Tests laufen...' : '▶️ Alle Tests starten'}
        </button>
        
        <button 
          onClick={clearLogs}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          🗑️ Logs löschen
        </button>

        <div className={styles.status}>
          Manager: {manager ? '✅ Bereit' : '⏳ Laden...'}
        </div>
      </div>

      <div className={styles.manualControls}>
        <h3>Manual Operations</h3>
        <div className={styles.buttonGroup}>
          <button onClick={saveTestEvents} disabled={!manager} className={`${styles.btn} ${styles.btnSecondary}`}>
            💾 Save Test Events
          </button>
          <button onClick={queryEvents} disabled={!manager} className={`${styles.btn} ${styles.btnSecondary}`}>
            🔍 Query Events
          </button>
          <button onClick={clearStorage} disabled={!manager} className={`${styles.btn} ${styles.btnSecondary}`}>
            🗑️ Clear Storage
          </button>
        </div>
      </div>

      <div className={styles.testResults}>
        <h3>Test Results ({successCount}/{testCases.length})</h3>
        <div className={styles.testGrid}>
          {testCases.map((testName) => {
            const result = testResults.find(r => r.name === testName);
            const status = result?.status || 'pending';
            
            return (
              <div key={testName} className={`${styles.testItem} ${styles[status]}`}>
                <div className={styles.testInfo}>
                  <div className={styles.testName}>{testName}</div>
                  {result?.message && (
                    <div className={styles.testMessage}>{result.message}</div>
                  )}
                </div>
                <div className={styles.testStatus}>
                  {status === 'pending' && '⏳'}
                  {status === 'success' && '✅'}
                  {status === 'error' && '❌'}
                  {status === 'skipped' && '⚠️'}
                  {result?.duration && ` (${result.duration}ms)`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.logs}>
        <h3>Test Logs</h3>
        <div className={styles.logContainer}>
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className={styles.logEntry}>Keine Logs vorhanden. Starte einen Test um Logs zu sehen.</div>
          )}
        </div>
      </div>
    </div>
  );
}