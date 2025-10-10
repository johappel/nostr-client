/**
 * Test script for RelayManager query functionality
 * Run with: node test-query.js
 */

// Import the framework
import { RelayManager } from './framework/core/RelayManager.js';

async function testQuery() {
  console.log('🧪 Testing RelayManager query functionality...\n');

  // Create RelayManager instance
  const relayManager = new RelayManager();

  // Add some popular public relays
  const testRelays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr.wine'
  ];

  console.log('📡 Adding test relays:', testRelays);
  relayManager.addRelays(testRelays);

  try {
    // Initialize the relay manager
    console.log('🔄 Initializing RelayManager...');
    await relayManager.initialize();
    console.log('✅ RelayManager initialized\n');

    // Test connectivity
    console.log('🔍 Testing relay connectivity...');
    const connectivityResults = await relayManager.testRelayConnectivity();
    connectivityResults.forEach(result => {
      const status = result.connected ? '✅' : '❌';
      const info = result.connected ? `(${result.latency}ms)` : `(${result.error})`;
      console.log(`   ${status} ${result.relay} ${info}`);
    });
    console.log();

    // Test queries
    const testCases = [
      {
        name: 'Recent text notes',
        filters: [{ kinds: [1], limit: 5 }],
        timeout: 3000
      },
      {
        name: 'Profile metadata',
        filters: [{ kinds: [0], limit: 3 }],
        timeout: 2000
      },
      {
        name: 'Recent events (any kind)',
        filters: [{ limit: 10 }],
        timeout: 4000
      }
    ];

    for (const testCase of testCases) {
      console.log(`🔎 Testing: ${testCase.name}`);
      console.log(`   Filters: ${JSON.stringify(testCase.filters)}`);
      
      try {
        const startTime = Date.now();
        const events = await relayManager.query(testCase.filters, { 
          timeout: testCase.timeout,
          limit: testCase.filters[0].limit 
        });
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Found ${events.length} events in ${duration}ms`);
        
        if (events.length > 0) {
          const sample = events[0];
          console.log(`   📄 Sample event: kind=${sample.kind}, id=${sample.id.substring(0, 8)}...`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    relayManager.destroy();
    console.log('✅ Test completed');
  }
}

// Run the test
testQuery().catch(console.error);