// Test list() vs subscribeMany() directly
import { SimplePool } from 'nostr-tools/pool';

async function testBothMethods() {
  console.log('🔬 Testing list() vs subscribeMany() directly\n');
  
  const pool = new SimplePool();
  const relays = ['wss://relay.damus.io'];
  const filters = [{ kinds: [1], limit: 2 }];
  
  console.log('Testing filters:', JSON.stringify(filters));
  
  // Test 1: list() method
  console.log('\n📋 Testing pool.list()...');
  try {
    const listEvents = await pool.list(relays, filters);
    console.log(`✅ list() success: ${listEvents.length} events`);
    if (listEvents.length > 0) {
      console.log(`Sample: ${listEvents[0].id} - ${listEvents[0].content.substring(0, 30)}...`);
    }
  } catch (error) {
    console.log(`❌ list() failed: ${error.message}`);
  }
  
  console.log('\n📋 Testing pool.subscribeMany()...');
  
  // Test 2: subscribeMany() method
  await new Promise(resolve => {
    let eventCount = 0;
    
    const sub = pool.subscribeMany(relays, filters, {
      onevent(event) {
        eventCount++;
        console.log(`✅ subscribeMany event ${eventCount}: ${event.id} - ${event.content.substring(0, 30)}...`);
        if (eventCount >= 2) {
          sub.close();
        }
      },
      oneose() {
        console.log('📋 subscribeMany EOSE received');
        if (eventCount === 0) {
          console.log('⚠️ No events received');
        }
        sub.close();
      },
      onclose() {
        console.log(`🔒 subscribeMany closed: ${eventCount} events total`);
        resolve(undefined);
      }
    });
    
    setTimeout(() => {
      console.log('⏰ subscribeMany timeout');
      sub.close();
    }, 8000);
  });
  
  console.log('\n✅ Both tests completed');
  pool.close();
}

testBothMethods().catch(console.error);