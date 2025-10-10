// Detailed debugging to see exactly what's happening
import { SimplePool } from 'nostr-tools/pool';
import { RelayManager } from './framework/dist/core/RelayManager.js';

async function detailedDebug() {
  console.log('🔍 Detailed Debug Analysis\n');

  // Step 1: Create a completely fresh SimplePool
  console.log('Step 1: Testing fresh SimplePool');
  const freshPool = new SimplePool();
  console.log('Fresh pool created');

  // Step 2: Test fresh pool directly
  const testRelay = 'wss://relay.damus.io';
  const testFilter = { kinds: [1], limit: 1 };

  console.log('\nStep 2: Testing fresh pool with minimal filter');
  console.log('Filter:', JSON.stringify(testFilter));
  console.log('Calling subscribeMany...');

  let freshPoolWorks = false;
  await new Promise(resolve => {
    const sub = freshPool.subscribeMany([testRelay], [testFilter], {
      onevent(event) {
        console.log('✅ Fresh pool: Got event:', event.id.substring(0, 8));
        freshPoolWorks = true;
        sub.close();
      },
      oneose() {
        console.log('Fresh pool: EOSE');
        if (!freshPoolWorks) sub.close();
      },
      onclose() {
        resolve(undefined);
      }
    });
    setTimeout(() => {
      console.log('Fresh pool: Timeout');
      sub.close();
    }, 3000);
  });

  console.log(`Fresh pool works: ${freshPoolWorks}`);

  // Step 3: Create RelayManager with same SimplePool class
  console.log('\nStep 3: Testing RelayManager with same SimplePool class');
  const manager = new RelayManager(null, { 
    relays: [testRelay],
    SimplePoolClass: SimplePool 
  });

  await manager.initialize();
  console.log('Manager initialized');

  // Step 4: Test manager with same filter
  console.log('\nStep 4: Testing manager query');
  console.log('Filter:', JSON.stringify([testFilter]));

  try {
    const events = await manager.query([testFilter], { timeout: 5000 });
    console.log(`✅ Manager query: Got ${events.length} events`);
    if (events.length > 0) {
      console.log(`Sample: ${events[0].id.substring(0, 8)} - ${events[0].content.substring(0, 30)}`);
    }
  } catch (error) {
    console.log(`❌ Manager query failed: ${error.message}`);
  }

  // Step 5: Test manager subscription
  console.log('\nStep 5: Testing manager subscription');
  let managerEvents = 0;
  
  try {
    const sub = manager.subscribe([testFilter], (event) => {
      managerEvents++;
      console.log(`✅ Manager subscription: Event ${managerEvents} - ${event.id.substring(0, 8)}`);
      if (managerEvents >= 1) sub.close();
    });

    await new Promise(resolve => {
      setTimeout(() => {
        console.log(`Manager subscription: ${managerEvents} events received`);
        try { sub.close(); } catch (e) {}
        resolve(undefined);
      }, 3000);
    });
  } catch (error) {
    console.log(`❌ Manager subscription failed: ${error.message}`);
  }

  console.log('\nStep 6: Inspecting the actual pool instances');
  console.log('Fresh pool constructor:', freshPool.constructor.name);
  console.log('Manager pool constructor:', manager._pool.constructor.name);
  console.log('Same constructor:', freshPool.constructor === manager._pool.constructor);

  // Clean up
  manager.destroy();
  
  console.log('\n🎯 Debug completed');
}

detailedDebug().catch(console.error);