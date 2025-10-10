// Simple test to debug relay filter issues
// Run with: node debug-relay-test.js

import { RelayManager } from './framework/dist/core/RelayManager.js';

async function debugRelayTest() {
  console.log('🔍 Debug Relay Filter Test...\n');

  const relayManager = new RelayManager();
  
  // Add one reliable relay for testing
  relayManager.addRelays(['wss://relay.damus.io']);

  try {
    console.log('🔄 Initializing RelayManager...');
    await relayManager.initialize();
    console.log('✅ RelayManager initialized\n');

    // Test 1: Very simple filter
    console.log('📝 Test 1: Simple filter (kinds: [1], limit: 2)');
    const simpleFilter = [{ kinds: [1], limit: 2 }];
    console.log('Filter to send:', JSON.stringify(simpleFilter, null, 2));
    
    try {
      const events1 = await relayManager.query(simpleFilter, { timeout: 5000 });
      console.log(`✅ Simple filter result: ${events1.length} events`);
      if (events1.length > 0) {
        console.log('Sample event:', {
          id: events1[0].id,
          kind: events1[0].kind,
          content: events1[0].content.substring(0, 50) + '...'
        });
      }
    } catch (error) {
      console.log(`❌ Simple filter failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Empty filter (should get recent events)
    console.log('📝 Test 2: Minimal filter (limit: 3)');
    const minimalFilter = [{ limit: 3 }];
    console.log('Filter to send:', JSON.stringify(minimalFilter, null, 2));
    
    try {
      const events2 = await relayManager.query(minimalFilter, { timeout: 5000 });
      console.log(`✅ Minimal filter result: ${events2.length} events`);
      if (events2.length > 0) {
        console.log('Sample event:', {
          id: events2[0].id,
          kind: events2[0].kind,
          content: events2[0].content.substring(0, 50) + '...'
        });
      }
    } catch (error) {
      console.log(`❌ Minimal filter failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Subscription test
    console.log('📝 Test 3: Simple subscription');
    let subscriptionEvents = 0;
    
    const subscription = relayManager.subscribe(
      [{ kinds: [1], limit: 5 }],
      (event) => {
        subscriptionEvents++;
        console.log(`📨 Subscription event ${subscriptionEvents}: ${event.id.substring(0, 8)}... - ${event.content.substring(0, 30)}...`);
        
        if (subscriptionEvents >= 3) {
          subscription.close();
          console.log('🛑 Subscription closed after 3 events');
        }
      }
    );

    // Wait for subscription events
    await new Promise(resolve => {
      setTimeout(() => {
        if (subscriptionEvents === 0) {
          console.log('⚠️ No subscription events received in 8 seconds');
        }
        try {
          subscription.close();
        } catch (e) {
          // Already closed
        }
        resolve(undefined);
      }, 8000);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    relayManager.destroy();
    console.log('✅ Debug test completed');
  }
}

// Run the debug test
debugRelayTest().catch(console.error);