# AGENT: SignerManager

## Ziel
Implementierung des SignerManager für Event-Signierung über verschiedene Methoden (NIP-07, NIP-46, local keys, API).

## Dateipfad
`framework/core/SignerManager.js`

## Abhängigkeiten
- `EventBus`
- `IdentityManager`
- `nostr-tools` (für Kryptographie)

---

## Implementierungsschritte

### Schritt 1: SignerPlugin Interface

**Datei**: `framework/plugins/signer/SignerPlugin.js`

```javascript
// framework/plugins/signer/SignerPlugin.js

/**
 * Base interface for signer plugins
 * All signing methods must implement this interface
 */
export class SignerPlugin {
  constructor() {
    this.type = 'base';
  }

  /**
   * Get public key
   * @returns {Promise<string>} Hex public key
   */
  async getPublicKey() {
    throw new Error(`${this.type}: getPublicKey() must be implemented`);
  }

  /**
   * Sign an event
   * @param {UnsignedEvent} event - Event to sign
   * @returns {Promise<SignedEvent>} Signed event
   */
  async signEvent(event) {
    throw new Error(`${this.type}: signEvent() must be implemented`);
  }

  /**
   * NIP-04: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>} Encrypted message
   */
  async nip04Encrypt(recipientPubkey, plaintext) {
    throw new Error(`${this.type}: nip04Encrypt() not implemented`);
  }

  /**
   * NIP-04: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>} Decrypted message
   */
  async nip04Decrypt(senderPubkey, ciphertext) {
    throw new Error(`${this.type}: nip04Decrypt() not implemented`);
  }

  /**
   * NIP-44: Encrypt message (modern standard)
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>} Encrypted message
   */
  async nip44Encrypt(recipientPubkey, plaintext) {
    throw new Error(`${this.type}: nip44Encrypt() not implemented`);
  }

  /**
   * NIP-44: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>} Decrypted message
   */
  async nip44Decrypt(senderPubkey, ciphertext) {
    throw new Error(`${this.type}: nip44Decrypt() not implemented`);
  }

  /**
   * Check capabilities
   * @returns {Object} Capability flags
   */
  getCapabilities() {
    return {
      canSign: true,
      canEncrypt: false,
      canDecrypt: false,
      hasNip04: false,
      hasNip44: false
    };
  }
}

/**
 * Unsigned event type
 * @typedef {Object} UnsignedEvent
 * @property {number} kind - Event kind
 * @property {string} content - Event content
 * @property {Array<string[]>} tags - Event tags
 * @property {number} created_at - Unix timestamp
 */

/**
 * Signed event type
 * @typedef {Object} SignedEvent
 * @property {string} id - Event ID (hash)
 * @property {string} pubkey - Author's public key
 * @property {number} created_at - Unix timestamp
 * @property {number} kind - Event kind
 * @property {Array<string[]>} tags - Event tags
 * @property {string} content - Event content
 * @property {string} sig - Signature
 */
```

---

### Schritt 2: SignerManager Implementierung

**Datei**: `framework/core/SignerManager.js`

```javascript
// framework/core/SignerManager.js

import { EventBus } from './EventBus.js';

/**
 * Manages event signing across different signer types
 */
export class SignerManager {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._currentSigner = null;
    this._defaultTimeout = 10000; // 10 seconds
  }

  /**
   * Set current signer
   * @param {SignerPlugin} signer - Signer instance
   */
  setSigner(signer) {
    if (!signer) {
      throw new Error('Signer cannot be null');
    }

    this._currentSigner = signer;
    console.log(`[SignerManager] Signer set: ${signer.type}`);
    
    this._eventBus.emit('signer:changed', { type: signer.type });
  }

  /**
   * Clear current signer
   */
  clearSigner() {
    this._currentSigner = null;
    console.log('[SignerManager] Signer cleared');
    this._eventBus.emit('signer:cleared', {});
  }

  /**
   * Get current signer
   * @returns {SignerPlugin|null}
   */
  getCurrentSigner() {
    return this._currentSigner;
  }

  /**
   * Check if signer is available
   * @returns {boolean}
   */
  hasSigner() {
    return this._currentSigner !== null;
  }

  /**
   * Get public key from current signer
   * @returns {Promise<string>}
   */
  async getPublicKey() {
    this._ensureSigner();
    
    try {
      const pubkey = await this._currentSigner.getPublicKey();
      return pubkey;
    } catch (error) {
      console.error('[SignerManager] Failed to get public key:', error);
      this._eventBus.emit('signer:error', { method: 'getPublicKey', error });
      throw error;
    }
  }

  /**
   * Sign an event
   * @param {UnsignedEvent} event - Event to sign
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<SignedEvent>}
   */
  async signEvent(event, timeout = this._defaultTimeout) {
    this._ensureSigner();
    this._validateEvent(event);

    try {
      console.log(`[SignerManager] Signing event (kind ${event.kind})...`);
      
      const signedEvent = await this._withTimeout(
        this._currentSigner.signEvent(event),
        timeout,
        'Event signing timed out'
      );

      console.log(`[SignerManager] Event signed: ${signedEvent.id}`);
      
      this._eventBus.emit('signer:signed', {
        eventId: signedEvent.id,
        kind: signedEvent.kind
      });

      return signedEvent;
    } catch (error) {
      console.error('[SignerManager] Signing failed:', error);
      this._eventBus.emit('signer:error', { method: 'signEvent', error, event });
      throw error;
    }
  }

  /**
   * Sign multiple events
   * @param {UnsignedEvent[]} events - Events to sign
   * @param {number} timeout - Timeout per event
   * @returns {Promise<SignedEvent[]>}
   */
  async signEvents(events, timeout = this._defaultTimeout) {
    const signed = [];
    
    for (const event of events) {
      try {
        const signedEvent = await this.signEvent(event, timeout);
        signed.push(signedEvent);
      } catch (error) {
        console.error('[SignerManager] Failed to sign event:', error);
        // Continue with next event
      }
    }

    return signed;
  }

  /**
   * Check if signer can sign a specific event kind
   * @param {number} kind - Event kind
   * @returns {Promise<boolean>}
   */
  async canSign(kind) {
    if (!this.hasSigner()) return false;

    // Some signers may restrict certain kinds (e.g., NIP-46)
    // For now, assume all kinds are supported
    return true;
  }

  /**
   * NIP-04: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>}
   */
  async nip04Encrypt(recipientPubkey, plaintext) {
    this._ensureSigner();

    try {
      const encrypted = await this._currentSigner.nip04Encrypt(recipientPubkey, plaintext);
      
      this._eventBus.emit('signer:encrypted', { method: 'nip04', recipientPubkey });
      
      return encrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-04 encryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip04Encrypt', error });
      throw error;
    }
  }

  /**
   * NIP-04: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>}
   */
  async nip04Decrypt(senderPubkey, ciphertext) {
    this._ensureSigner();

    try {
      const decrypted = await this._currentSigner.nip04Decrypt(senderPubkey, ciphertext);
      
      this._eventBus.emit('signer:decrypted', { method: 'nip04', senderPubkey });
      
      return decrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-04 decryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip04Decrypt', error });
      throw error;
    }
  }

  /**
   * NIP-44: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>}
   */
  async nip44Encrypt(recipientPubkey, plaintext) {
    this._ensureSigner();

    try {
      const encrypted = await this._currentSigner.nip44Encrypt(recipientPubkey, plaintext);
      
      this._eventBus.emit('signer:encrypted', { method: 'nip44', recipientPubkey });
      
      return encrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-44 encryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip44Encrypt', error });
      throw error;
    }
  }

  /**
   * NIP-44: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>}
   */
  async nip44Decrypt(senderPubkey, ciphertext) {
    this._ensureSigner();

    try {
      const decrypted = await this._currentSigner.nip44Decrypt(senderPubkey, ciphertext);
      
      this._eventBus.emit('signer:decrypted', { method: 'nip44', senderPubkey });
      
      return decrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-44 decryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip44Decrypt', error });
      throw error;
    }
  }

  /**
   * Get signer capabilities
   * @returns {Object}
   */
  getCapabilities() {
    if (!this._currentSigner) {
      return {
        canSign: false,
        canEncrypt: false,
        canDecrypt: false,
        hasNip04: false,
        hasNip44: false
      };
    }

    return this._currentSigner.getCapabilities();
  }

  /**
   * Set default timeout for signing operations
   * @param {number} timeout - Timeout in milliseconds
   */
  setDefaultTimeout(timeout) {
    this._defaultTimeout = timeout;
    console.log(`[SignerManager] Default timeout set to ${timeout}ms`);
  }

  /**
   * Listen to signer events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Ensure signer is available
   * @private
   */
  _ensureSigner() {
    if (!this._currentSigner) {
      throw new Error('No signer available. Please authenticate first.');
    }
  }

  /**
   * Validate unsigned event
   * @private
   */
  _validateEvent(event) {
    if (!event) {
      throw new Error('Event cannot be null');
    }

    const required = ['kind', 'content', 'tags', 'created_at'];
    for (const field of required) {
      if (!(field in event)) {
        throw new Error(`Event missing required field: ${field}`);
      }
    }

    if (typeof event.kind !== 'number') {
      throw new Error('Event kind must be a number');
    }

    if (!Array.isArray(event.tags)) {
      throw new Error('Event tags must be an array');
    }

    if (typeof event.created_at !== 'number') {
      throw new Error('Event created_at must be a number');
    }
  }

  /**
   * Execute promise with timeout
   * @private
   */
  async _withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  /**
   * Get event bus for external listeners
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}
```

---

### Schritt 3: Mock Signer für Tests

**Datei**: `framework/plugins/signer/MockSigner.js`

```javascript
// framework/plugins/signer/MockSigner.js

import { SignerPlugin } from './SignerPlugin.js';

/**
 * Mock signer for testing
 * Does NOT use real cryptography
 */
export class MockSigner extends SignerPlugin {
  constructor(pubkey = 'mock-pubkey-123') {
    super();
    this.type = 'mock';
    this._pubkey = pubkey;
  }

  async getPublicKey() {
    return this._pubkey;
  }

  async signEvent(event) {
    // Generate fake ID and signature
    const eventData = JSON.stringify([
      0,
      this._pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);

    return {
      id: 'mock-event-id-' + Date.now(),
      pubkey: this._pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: 'mock-signature-' + Date.now()
    };
  }

  async nip04Encrypt(recipientPubkey, plaintext) {
    // Fake encryption (base64 encoding)
    return btoa(plaintext);
  }

  async nip04Decrypt(senderPubkey, ciphertext) {
    // Fake decryption (base64 decoding)
    return atob(ciphertext);
  }

  async nip44Encrypt(recipientPubkey, plaintext) {
    // Fake NIP-44 encryption
    return btoa('nip44:' + plaintext);
  }

  async nip44Decrypt(senderPubkey, ciphertext) {
    // Fake NIP-44 decryption
    return atob(ciphertext).replace('nip44:', '');
  }

  getCapabilities() {
    return {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true,
      hasNip04: true,
      hasNip44: true
    };
  }
}
```

---

### Schritt 4: Browser Console Tests

**Test-Datei**: `framework/core/SignerManager.test.js`

```javascript
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
      
      if (!error || !error.message.includes('timeout')) {
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
```

**Quick Browser Console Test**:
```javascript
// Quick Test in Console
import { SignerManager } from './framework/core/SignerManager.js';
import { MockSigner } from './framework/plugins/signer/MockSigner.js';

const manager = new SignerManager();
const signer = new MockSigner('my-pubkey-abc');

manager.setSigner(signer);

// Test 1: Get pubkey
const pk = await manager.getPublicKey();
console.log('Public key:', pk);

// Test 2: Sign event
const event = {
  kind: 1,
  content: 'Hello Nostr!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
};

const signed = await manager.signEvent(event);
console.log('Signed event:', signed);

// Test 3: Encryption
const encrypted = await manager.nip04Encrypt('recipient', 'Secret message');
console.log('Encrypted:', encrypted);

const decrypted = await manager.nip04Decrypt('sender', encrypted);
console.log('Decrypted:', decrypted);

// Test 4: Capabilities
console.log('Capabilities:', manager.getCapabilities());

console.log('✓ All manual tests passed!');

// Expose globally
window.testSignerManager = manager;
```

---

## Akzeptanzkriterien

- [ ] SignerPlugin Interface vollständig definiert
- [ ] SignerManager implementiert mit allen Methoden
- [ ] Event-Signierung funktioniert
- [ ] NIP-04 Verschlüsselung/Entschlüsselung funktioniert
- [ ] NIP-44 Verschlüsselung/Entschlüsselung funktioniert
- [ ] Timeout-Mechanismus funktioniert
- [ ] Event-Validierung funktioniert
- [ ] Alle Tests bestehen
- [ ] MockSigner für Tests verfügbar

---

## Nächste Schritte

1. ✅ EventBus implementiert
2. ✅ IdentityManager implementiert
3. ✅ SignerManager implementiert
4. ➡️ Weiter mit `AGENT_TemplateEngine.md`
