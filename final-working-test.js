// Final working test with the fix
import { SimplePool } from 'nostr-tools/pool';
import { RelayManager } from './framework/dist/core/RelayManager.js';

async function finalWorkingTest() {
  console.log('🎉 Final Working Test - RelayManager with Real Events\n');

  // Create RelayManager with working SimplePool class
  const relayManager = new RelayManager(null, { 
    relays: ['wss://relay.damus.io', 'wss://nos.lol'],
    SimplePoolClass: SimplePool 
  });

  try {
    console.log('🔄 Initializing RelayManager...');
    await relayManager.initialize();
    console.log('✅ RelayManager initialized successfully\n');

    // Test 1: Query real events
    console.log('📝 Test 1: Querying real events (kinds: [1], limit: 3)');
    const events = await relayManager.query(
      [{ kinds: [1], limit: 3 }],
      { timeout: 5000 }
    );
    
    console.log(`✅ Query successful: ${events.length} events received`);
    events.forEach((event, i) => {
      console.log(`   Event ${i + 1}: ${event.id.substring(0, 8)}... - ${event.content.substring(0, 50)}...`);
    });

    console.log('\n📝 Test 2: Live subscription for 5 seconds');
    
    // Test 2: Live subscription
    let subscriptionEvents = 0;
    const subscription = relayManager.subscribe(
      [{ kinds: [1] }],
      (event) => {
        subscriptionEvents++;
        console.log(`   📨 Live event ${subscriptionEvents}: ${event.content.substring(0, 40)}...`);
        
        if (subscriptionEvents >= 5) {
          console.log('   🛑 Received 5 events, closing subscription...');
          subscription.close();
        }
      }
    );

    // Wait for live events
    await new Promise(resolve => {
      setTimeout(() => {
        console.log(`   ⏰ Time's up! Received ${subscriptionEvents} live events`);
        try { subscription.close(); } catch (e) { }
        resolve(undefined);
      }, 5000);
    });

    console.log('\n📝 Test 3: Fastest relay detection');
    const fastestRelay = await relayManager.getFastestRelay();
    console.log(`✅ Fastest relay: ${fastestRelay}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ RelayManager is now working with real Nostr data!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up...');
    relayManager.destroy();
    console.log('✅ Cleanup completed');
  }
}

finalWorkingTest().catch(console.error);