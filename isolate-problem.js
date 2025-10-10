// Test to isolate the subscribeMany problem in RelayManager
import { RelayManager } from './framework/dist/core/RelayManager.js';

async function isolateSubscribeManyProblem() {
  console.log('🎯 Isolating subscribeMany problem in RelayManager\n');
  
  const manager = new RelayManager();
  manager.addRelays(['wss://relay.damus.io']);
  await manager.initialize();
  
  // Get direct access to the pool
  const pool = manager._pool;
  console.log('Got pool:', !!pool);
  console.log('Pool type:', typeof pool);
  
  // Test 1: Call pool.subscribeMany directly using manager's pool
  console.log('\n📋 Test 1: Direct pool.subscribeMany through manager');
  const filters = [{ kinds: [1], limit: 1 }];
  
  await new Promise(resolve => {
    let received = 0;
    
    const sub = pool.subscribeMany(['wss://relay.damus.io'], filters, {
      onevent(event) {
        received++;
        console.log(`✅ Direct pool call: Event ${received} - ${event.id.substring(0, 8)}...`);
        if (received >= 1) sub.close();
      },
      oneose() {
        console.log('📋 Direct pool call: EOSE');
        if (received === 0) sub.close();
      },
      onclose() {
        console.log(`🔒 Direct pool call: Closed with ${received} events`);
        resolve(undefined);
      }
    });
    
    setTimeout(() => {
      console.log('⏰ Direct pool call: Timeout');
      sub.close();
    }, 5000);
  });
  
  console.log('\n📋 Test 2: Manager.subscribe method');
  
  // Test 2: Use manager's subscribe method
  await new Promise(resolve => {
    let received = 0;
    
    const sub = manager.subscribe(filters, (event) => {
      received++;
      console.log(`✅ Manager subscribe: Event ${received} - ${event.id.substring(0, 8)}...`);
      if (received >= 1) sub.close();
    });
    
    setTimeout(() => {
      console.log(`⏰ Manager subscribe: Timeout with ${received} events`);
      sub.close();
      resolve(undefined);
    }, 5000);
  });
  
  manager.destroy();
  console.log('\n🎯 Isolation test completed');
}

isolateSubscribeManyProblem().catch(console.error);