// Direct comparison test
import { SimplePool } from 'nostr-tools/pool';
import { RelayManager } from './framework/dist/core/RelayManager.js';

async function compareTest() {
  console.log('🔄 Comparison Test: Direct nostr-tools vs RelayManager\n');
  
  const relay = 'wss://relay.damus.io';
  const testFilter = { kinds: [1], limit: 1 };
  
  console.log('Filter to test:', JSON.stringify(testFilter));
  console.log('=' * 60);
  
  // Test 1: Direct nostr-tools (working)
  console.log('\n📋 Test 1: Direct nostr-tools');
  const pool = new SimplePool();
  
  await new Promise(resolve => {
    let received = 0;
    
    const sub = pool.subscribeMany([relay], [testFilter], {
      onevent(event) {
        received++;
        console.log(`✅ Direct: Event ${received} - ${event.id.substring(0, 8)}...`);
        if (received >= 1) sub.close();
      },
      oneose() {
        console.log('📋 Direct: EOSE received');
        if (received === 0) {
          console.log('⚠️ Direct: No events before EOSE');
          sub.close();
        }
      },
      onclose() {
        console.log(`🔒 Direct: Closed, received ${received} events`);
        resolve(undefined);
      }
    });
    
    setTimeout(() => {
      console.log('⏰ Direct: Timeout');
      sub.close();
    }, 5000);
  });
  
  console.log('\n' + '='.repeat(60));
  
  // Test 2: RelayManager (not working)
  console.log('\n📋 Test 2: RelayManager');
  const manager = new RelayManager();
  manager.addRelays([relay]);
  await manager.initialize();
  
  await new Promise(resolve => {
    let received = 0;
    
    const sub = manager.subscribe([testFilter], (event) => {
      received++;
      console.log(`✅ Manager: Event ${received} - ${event.id.substring(0, 8)}...`);
      if (received >= 1) sub.close();
    });
    
    setTimeout(() => {
      console.log(`⏰ Manager: Timeout, received ${received} events`);
      sub.close();
      resolve(undefined);
    }, 5000);
  });
  
  manager.destroy();
  console.log('\n🎯 Test completed');
}

compareTest().catch(console.error);