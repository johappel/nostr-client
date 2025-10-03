// framework/core/SignerManager.test.js

import { SignerManager } from './SignerManager.js';
import { MockSigner } from '../plugins/signer/MockSigner.js';

export function runSignerManagerTests() {
  console.group('SignerManager Tests');
  
  const results = { passed: 0, failed: 0, tests: [] };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  // Sync Tests
  test('Constructor initializes correctly', () => {
    const manager = new SignerManager();
    if (manager._currentSigner !== null) throw new Error('Should start without signer');
  });

  test('setSigner() sets signer', () => {
    const manager = new SignerManager();
    const signer = new MockSigner();
    manager.setSigner(signer);
    if (manager.getCurrentSigner() !== signer) throw new Error('Signer not set');
  });

  test('clearSigner() clears signer', () => {
    const manager = new SignerManager();
    const signer = new MockSigner();
    manager.setSigner(signer);
    manager.clearSigner();
    if (manager.hasSigner()) throw new Error('Signer not cleared');
  });

  test('hasSigner() returns correct value', () => {
    const manager = new SignerManager();
    if (manager.hasSigner()) throw new Error('Should not have signer');
    
    manager.setSigner(new MockSigner());
    if (!manager.hasSigner()) throw new Error('Should have signer');
  });

  // Async Tests
  (async () => {
    await asyncTest('getPublicKey() returns pubkey', async () => {
      const manager = new SignerManager();
      const signer = new MockSigner('test-pk-123');
      manager.setSigner(signer);
      
      const pubkey = await manager.getPublicKey();
      if (pubkey !== 'test-pk-123') throw new Error('Wrong pubkey');
    });

    await asyncTest('signEvent() signs event', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const unsigned = {
        kind: 1,
        content: 'Hello',
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      };

      const signed = await manager.signEvent(unsigned);
      
      if (!signed.id) throw new Error('No event ID');
      if (!signed.sig) throw new Error('No signature');
      if (!signed.pubkey) throw new Error('No pubkey');
    });

    await asyncTest('signEvent() validates event', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      let error = null;
      try {
        await manager.signEvent({ kind: 1 }); // Missing fields
      } catch (e) {
        error = e;
      }
      
      if (!error) throw new Error('Should throw validation error');
    });

    await asyncTest('signEvents() signs multiple events', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const events = [
        { kind: 1, content: 'A', tags: [], created_at: 1 },
        { kind: 1, content: 'B', tags: [], created_at: 2 }
      ];

      const signed = await manager.signEvents(events);
      if (signed.length !== 2) throw new Error('Wrong number of signed events');
    });

    await asyncTest('canSign() returns true with signer', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      if (!await manager.canSign(1)) throw new Error('Should be able to sign');
    });

    await asyncTest('nip04Encrypt() encrypts message', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const encrypted = await manager.nip04Encrypt('recipient-pk', 'Hello');
      if (!encrypted) throw new Error('Encryption failed');
      if (encrypted === 'Hello') throw new Error('Not encrypted');
    });

    await asyncTest('nip04Decrypt() decrypts message', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const encrypted = await manager.nip04Encrypt('recipient-pk', 'Secret');
      const decrypted = await manager.nip04Decrypt('sender-pk', encrypted);
      
      if (decrypted !== 'Secret') throw new Error('Decryption failed');
    });

    await asyncTest('nip44Encrypt/Decrypt work', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const encrypted = await manager.nip44Encrypt('recipient-pk', 'Message');
      const decrypted = await manager.nip44Decrypt('sender-pk', encrypted);
      
      if (decrypted !== 'Message') throw new Error('NIP-44 failed');
    });

    await asyncTest('getCapabilities() returns correct caps', async () => {
      const manager = new SignerManager();
      manager.setSigner(new MockSigner());
      
      const caps = manager.getCapabilities();
      if (!caps.canSign) throw new Error('Should be able to sign');
      if (!caps.hasNip04) throw new Error('Should have NIP-04');
    });

    await asyncTest('Events fire correctly', async () => {
      const manager = new SignerManager();
      let eventFired = false;
      
      manager.on('signer:signed', () => eventFired = true);
      
      manager.setSigner(new MockSigner());
      await manager.signEvent({
        kind: 1,
        content: 'Test',
        tags: [],
        created_at: 1
      });
      
      if (!eventFired) throw new Error('Event not fired');
    });

    await asyncTest('Timeout works', async () => {
      const manager = new SignerManager();
      
      // Create slow signer
      class SlowSigner extends MockSigner {
        async signEvent(event) {
          await new Promise(r => setTimeout(r, 2000));
          return super.signEvent(event);
        }
      }
      
      manager.setSigner(new SlowSigner());
      
      let error = null;
      try {
        await manager.signEvent({
          kind: 1,
          content: 'Test',
          tags: [],
          created_at: 1
        }, 100); // 100ms timeout
      } catch (e) {
        error = e;
      }
      
      if (!error || !error.message.toLowerCase().includes('timed out')) {
        throw new Error('Timeout should have occurred');
      }
    });

    console.groupEnd();
    console.log('\n📊 Test Results:');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Total: ${results.passed + results.failed}`);
    
    return results;
  })();
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.runSignerManagerTests = runSignerManagerTests;
  console.log('💡 Run tests with: runSignerManagerTests()');
}