// Compare working SimplePool vs Manager pool
import { SimplePool } from 'nostr-tools/pool';
import { RelayManager } from './framework/dist/core/RelayManager.js';

async function comparePoolInstances() {
  console.log('🔍 Comparing working SimplePool vs Manager pool\n');
  
  // Create working pool
  const workingPool = new SimplePool();
  console.log('Working pool:', typeof workingPool);
  console.log('Working pool constructor:', workingPool.constructor.name);
  console.log('Working pool subscribeMany:', typeof workingPool.subscribeMany);
  
  // Create manager with working SimplePool class
  const manager = new RelayManager(null, { SimplePoolClass: SimplePool });
  await manager.initialize();
  const managerPool = manager._pool;
  
  console.log('\nManager pool:', typeof managerPool);
  console.log('Manager pool constructor:', managerPool.constructor.name);
  console.log('Manager pool subscribeMany:', typeof managerPool.subscribeMany);
  
  // Check if they're the same class
  console.log('\nSame constructor?', workingPool.constructor === managerPool.constructor);
  
  // Test both with identical calls
  const filters = [{ kinds: [1], limit: 1 }];
  const relays = ['wss://relay.damus.io'];
  
  console.log('\n📋 Testing working pool...');
  
  await new Promise(resolve => {
    let events = 0;
    const sub1 = workingPool.subscribeMany(relays, filters, {
      onevent() { 
        events++; 
        console.log(`✅ Working pool: event ${events}`);
        if (events >= 1) sub1.close();
      },
      oneose() { 
        console.log('📋 Working pool: EOSE'); 
        if (events === 0) sub1.close();
      },
      onclose() { 
        console.log(`🔒 Working pool: closed (${events} events)`); 
        resolve(undefined);
      }
    });
    setTimeout(() => { console.log('⏰ Working pool: timeout'); sub1.close(); }, 3000);
  });
  
  console.log('\n📋 Testing manager pool...');
  
  await new Promise(resolve => {
    let events = 0;
    const sub2 = managerPool.subscribeMany(relays, filters, {
      onevent() { 
        events++; 
        console.log(`✅ Manager pool: event ${events}`);
        if (events >= 1) sub2.close();
      },
      oneose() { 
        console.log('📋 Manager pool: EOSE'); 
        if (events === 0) sub2.close();
      },
      onclose() { 
        console.log(`🔒 Manager pool: closed (${events} events)`); 
        resolve(undefined);
      }
    });
    setTimeout(() => { console.log('⏰ Manager pool: timeout'); sub2.close(); }, 3000);
  });
  
  console.log('\n🎯 Comparison completed');
}

comparePoolInstances().catch(console.error);