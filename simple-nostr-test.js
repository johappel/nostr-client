// Minimal test to see exactly what nostr-tools expects
import { SimplePool } from 'nostr-tools/pool';

async function simpleTest() {
  console.log('🔬 Testing nostr-tools directly...');
  
  const pool = new SimplePool();
  const relay = 'wss://relay.damus.io';
  
  console.log('Creating subscription...');
  
  // Test 1: Simple filter as documented
  const filters = [{ kinds: [1], limit: 1 }];
  console.log('Filters:', JSON.stringify(filters));
  
  let eventCount = 0;
  
  const sub = pool.subscribeMany([relay], filters, {
    onevent(event) {
      eventCount++;
      console.log(`✅ Got event ${eventCount}: ${event.id}`);
      console.log(`Content preview: ${event.content.substring(0, 50)}...`);
      
      if (eventCount >= 2) {
        console.log('Closing subscription...');
        sub.close();
      }
    },
    oneose() {
      console.log('📋 EOSE received');
      if (eventCount === 0) {
        console.log('No events received before EOSE');
        sub.close();
      }
    },
    onclose(reasons) {
      console.log('🔒 Subscription closed:', reasons);
      pool.close();
    }
  });
  
  // Wait for events
  await new Promise(resolve => {
    setTimeout(() => {
      console.log(`⏰ Timeout after 10 seconds, received ${eventCount} events`);
      sub.close();
      resolve(undefined);
    }, 10000);
  });
  
  console.log('Test completed');
}

simpleTest().catch(console.error);