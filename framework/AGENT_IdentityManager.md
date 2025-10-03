# AGENT: IdentityManager

## Ziel
Implementierung des zentralen Identity-Management-Systems mit Plugin-basierter Authentifizierung.

## Dateipfad
`framework/core/IdentityManager.js`

## Abhängigkeiten
- `EventBus` (bereits implementiert)
- `framework/plugins/auth/AuthPlugin.js` (Interface)

---

## Implementierungsschritte

### Schritt 1: AuthPlugin Interface

**Datei**: `framework/plugins/auth/AuthPlugin.js`

```javascript
// framework/plugins/auth/AuthPlugin.js

/**
 * Base interface for authentication plugins
 * All auth providers must implement this interface
 */
export class AuthPlugin {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.displayName = 'Base Auth';
    this._initialized = false;
  }

  /**
   * Initialize the auth plugin
   * Called once during plugin registration
   */
  async initialize() {
    throw new Error(`${this.name}: initialize() must be implemented`);
  }

  /**
   * Check if user is currently authenticated
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    throw new Error(`${this.name}: isLoggedIn() must be implemented`);
  }

  /**
   * Get current user identity
   * @returns {Promise<Identity|null>}
   * Identity: { pubkey, npub, provider, displayName?, metadata?, capabilities }
   */
  async getIdentity() {
    throw new Error(`${this.name}: getIdentity() must be implemented`);
  }

  /**
   * Perform login
   * @param {Object} credentials - Provider-specific credentials
   * @returns {Promise<Identity>}
   */
  async login(credentials = {}) {
    throw new Error(`${this.name}: login() must be implemented`);
  }

  /**
   * Perform logout
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error(`${this.name}: logout() must be implemented`);
  }

  /**
   * Get signer instance for this auth provider
   * @returns {SignerPlugin}
   */
  getSigner() {
    throw new Error(`${this.name}: getSigner() must be implemented`);
  }

  /**
   * Optional: Setup UI elements
   * @param {Object} elements - UI elements
   * @param {Function} onChange - Callback for auth changes
   */
  setupUI(elements, onChange) {
    // Optional implementation
    console.log(`[${this.name}] setupUI called (no UI implementation)`);
  }

  /**
   * Check if plugin is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Mark plugin as initialized
   * @protected
   */
  _markInitialized() {
    this._initialized = true;
  }
}

/**
 * Identity type definition
 * @typedef {Object} Identity
 * @property {string} pubkey - Hex public key
 * @property {string} npub - Bech32 npub
 * @property {string} provider - Provider name ('nip07', 'nip46', etc.)
 * @property {string} [displayName] - Display name from profile
 * @property {Object} [metadata] - NIP-01 profile metadata
 * @property {Object} capabilities - What this identity can do
 * @property {boolean} capabilities.canSign - Can sign events
 * @property {boolean} capabilities.canEncrypt - Can encrypt messages
 * @property {boolean} capabilities.canDecrypt - Can decrypt messages
 */
```

**Browser Console Test**:
```javascript
// Test: AuthPlugin Interface
import { AuthPlugin } from './framework/plugins/auth/AuthPlugin.js';

class TestAuthPlugin extends AuthPlugin {
  constructor() {
    super();
    this.name = 'test';
    this.displayName = 'Test Auth';
  }

  async initialize() {
    this._markInitialized();
    console.log('[TestAuth] Initialized');
  }

  async isLoggedIn() {
    return true;
  }

  async getIdentity() {
    return {
      pubkey: '1234567890abcdef',
      npub: 'npub1test',
      provider: 'test',
      capabilities: {
        canSign: true,
        canEncrypt: true,
        canDecrypt: true
      }
    };
  }

  async login() {
    return await this.getIdentity();
  }

  async logout() {
    console.log('[TestAuth] Logged out');
  }

  getSigner() {
    return {
      type: 'test',
      getPublicKey: async () => '1234567890abcdef',
      signEvent: async (event) => ({ ...event, sig: 'test-sig' })
    };
  }
}

const plugin = new TestAuthPlugin();
await plugin.initialize();
console.assert(plugin.isInitialized(), 'Plugin should be initialized');

const identity = await plugin.getIdentity();
console.assert(identity.pubkey === '1234567890abcdef', 'Should return identity');

console.log('✓ AuthPlugin interface works');
```

---

### Schritt 2: IdentityManager Implementierung

**Datei**: `framework/core/IdentityManager.js`

```javascript
// framework/core/IdentityManager.js

import { EventBus } from './EventBus.js';

/**
 * Central identity manager
 * Manages authentication across multiple providers
 */
export class IdentityManager {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._plugins = new Map();
    this._currentPlugin = null;
    this._currentIdentity = null;
    this._initialized = false;
  }

  /**
   * Initialize the identity manager
   */
  async initialize() {
    if (this._initialized) {
      console.warn('[IdentityManager] Already initialized');
      return;
    }

    console.log('[IdentityManager] Initializing...');

    // Initialize all registered plugins
    for (const [name, plugin] of this._plugins) {
      try {
        if (!plugin.isInitialized()) {
          await plugin.initialize();
          console.log(`[IdentityManager] Initialized plugin: ${name}`);
        }
      } catch (error) {
        console.error(`[IdentityManager] Failed to initialize ${name}:`, error);
      }
    }

    // Try to restore previous session
    await this._restoreSession();

    this._initialized = true;
    console.log('[IdentityManager] Initialization complete');
    this._eventBus.emit('identity:initialized', { manager: this });
  }

  /**
   * Register an authentication plugin
   * @param {string} name - Plugin identifier
   * @param {AuthPlugin} plugin - Plugin instance
   */
  registerPlugin(name, plugin) {
    if (this._plugins.has(name)) {
      console.warn(`[IdentityManager] Plugin "${name}" already registered, replacing`);
    }

    this._plugins.set(name, plugin);
    console.log(`[IdentityManager] Registered plugin: ${name}`);
    
    this._eventBus.emit('identity:plugin-registered', { name, plugin });
  }

  /**
   * Unregister an authentication plugin
   * @param {string} name - Plugin identifier
   */
  unregisterPlugin(name) {
    if (!this._plugins.has(name)) {
      console.warn(`[IdentityManager] Plugin "${name}" not found`);
      return;
    }

    this._plugins.delete(name);
    console.log(`[IdentityManager] Unregistered plugin: ${name}`);
    
    this._eventBus.emit('identity:plugin-unregistered', { name });
  }

  /**
   * Get list of registered plugin names
   * @returns {string[]}
   */
  getRegisteredPlugins() {
    return Array.from(this._plugins.keys());
  }

  /**
   * Get list of available (usable) plugins
   * @returns {Promise<string[]>}
   */
  async getAvailablePlugins() {
    const available = [];

    for (const [name, plugin] of this._plugins) {
      try {
        // Check if plugin can be used (e.g., NIP-07 needs window.nostr)
        if (await plugin.isLoggedIn() || name === 'local') {
          available.push(name);
        }
      } catch (error) {
        console.debug(`[IdentityManager] Plugin ${name} not available:`, error.message);
      }
    }

    return available;
  }

  /**
   * Authenticate with a specific provider
   * @param {string} providerName - Name of registered plugin
   * @param {Object} credentials - Provider-specific credentials
   * @returns {Promise<Identity>}
   */
  async authenticate(providerName, credentials = {}) {
    const plugin = this._plugins.get(providerName);
    
    if (!plugin) {
      throw new Error(`Auth plugin "${providerName}" not found`);
    }

    try {
      console.log(`[IdentityManager] Authenticating with ${providerName}...`);
      
      const identity = await plugin.login(credentials);
      
      this._currentPlugin = plugin;
      this._currentIdentity = identity;

      // Store session info
      this._storeSession(providerName, identity);

      console.log(`[IdentityManager] Authenticated as ${identity.npub || identity.pubkey}`);
      
      this._eventBus.emit('identity:changed', identity);
      this._eventBus.emit('identity:login', { provider: providerName, identity });

      return identity;
    } catch (error) {
      console.error(`[IdentityManager] Authentication failed:`, error);
      this._eventBus.emit('identity:error', { provider: providerName, error });
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    if (!this._currentPlugin) {
      console.warn('[IdentityManager] No active session to logout');
      return;
    }

    try {
      console.log('[IdentityManager] Logging out...');
      
      await this._currentPlugin.logout();
      
      const oldIdentity = this._currentIdentity;
      
      this._currentPlugin = null;
      this._currentIdentity = null;

      // Clear stored session
      this._clearSession();

      console.log('[IdentityManager] Logged out');
      
      this._eventBus.emit('identity:logout', { identity: oldIdentity });
      this._eventBus.emit('identity:changed', null);
    } catch (error) {
      console.error('[IdentityManager] Logout failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this._currentIdentity !== null;
  }

  /**
   * Get current user identity
   * @returns {Identity|null}
   */
  getCurrentIdentity() {
    return this._currentIdentity;
  }

  /**
   * Get current auth plugin
   * @returns {AuthPlugin|null}
   */
  getCurrentPlugin() {
    return this._currentPlugin;
  }

  /**
   * Get public key of current identity
   * @returns {string|null}
   */
  getPublicKey() {
    return this._currentIdentity?.pubkey || null;
  }

  /**
   * Get npub of current identity
   * @returns {string|null}
   */
  getNpub() {
    return this._currentIdentity?.npub || null;
  }

  /**
   * Get signer from current plugin
   * @returns {SignerPlugin|null}
   */
  getSigner() {
    if (!this._currentPlugin) return null;
    return this._currentPlugin.getSigner();
  }

  /**
   * Listen to identity events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Store session in localStorage
   * @private
   */
  _storeSession(providerName, identity) {
    try {
      localStorage.setItem('nostr_framework_session', JSON.stringify({
        provider: providerName,
        pubkey: identity.pubkey,
        npub: identity.npub,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('[IdentityManager] Failed to store session:', error);
    }
  }

  /**
   * Restore session from localStorage
   * @private
   */
  async _restoreSession() {
    try {
      const stored = localStorage.getItem('nostr_framework_session');
      if (!stored) return;

      const session = JSON.parse(stored);
      const plugin = this._plugins.get(session.provider);

      if (!plugin) {
        console.warn(`[IdentityManager] Stored plugin "${session.provider}" not registered`);
        return;
      }

      // Check if still logged in
      if (await plugin.isLoggedIn()) {
        const identity = await plugin.getIdentity();
        this._currentPlugin = plugin;
        this._currentIdentity = identity;
        
        console.log(`[IdentityManager] Restored session: ${session.provider}`);
        this._eventBus.emit('identity:restored', identity);
      } else {
        this._clearSession();
      }
    } catch (error) {
      console.warn('[IdentityManager] Failed to restore session:', error);
      this._clearSession();
    }
  }

  /**
   * Clear stored session
   * @private
   */
  _clearSession() {
    try {
      localStorage.removeItem('nostr_framework_session');
    } catch (error) {
      console.warn('[IdentityManager] Failed to clear session:', error);
    }
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

**Browser Console Test**:
```javascript
// Test: IdentityManager
import { IdentityManager } from './framework/core/IdentityManager.js';
import { AuthPlugin } from './framework/plugins/auth/AuthPlugin.js';

// Mock Auth Plugin
class MockAuthPlugin extends AuthPlugin {
  constructor() {
    super();
    this.name = 'mock';
    this.displayName = 'Mock Auth';
    this._loggedIn = false;
  }

  async initialize() {
    this._markInitialized();
  }

  async isLoggedIn() {
    return this._loggedIn;
  }

  async getIdentity() {
    if (!this._loggedIn) return null;
    return {
      pubkey: 'abc123',
      npub: 'npub1mock',
      provider: 'mock',
      capabilities: { canSign: true, canEncrypt: true, canDecrypt: true }
    };
  }

  async login(credentials) {
    this._loggedIn = true;
    return await this.getIdentity();
  }

  async logout() {
    this._loggedIn = false;
  }

  getSigner() {
    return {
      type: 'mock',
      getPublicKey: async () => 'abc123',
      signEvent: async (event) => ({ ...event, sig: 'mock-sig' })
    };
  }
}

// Tests
const manager = new IdentityManager();
const mockPlugin = new MockAuthPlugin();

console.log('Test 1: Register plugin');
manager.registerPlugin('mock', mockPlugin);
console.assert(manager.getRegisteredPlugins().includes('mock'), 'Plugin registered');

console.log('Test 2: Initialize');
await manager.initialize();
console.assert(mockPlugin.isInitialized(), 'Plugin initialized');

console.log('Test 3: Authenticate');
const identity = await manager.authenticate('mock', {});
console.assert(identity.pubkey === 'abc123', 'Authentication successful');
console.assert(manager.isAuthenticated(), 'Is authenticated');

console.log('Test 4: Get identity');
const current = manager.getCurrentIdentity();
console.assert(current.pubkey === 'abc123', 'Current identity correct');

console.log('Test 5: Get signer');
const signer = manager.getSigner();
console.assert(signer.type === 'mock', 'Signer available');

console.log('Test 6: Events');
let eventFired = false;
manager.on('identity:logout', () => eventFired = true);

console.log('Test 7: Logout');
await manager.logout();
console.assert(!manager.isAuthenticated(), 'Logged out');
console.assert(eventFired, 'Logout event fired');

console.log('✓ All IdentityManager tests passed!');

// Expose globally
window.testIdentityManager = { manager, mockPlugin };
```

---

### Schritt 3: Test-Suite

**Datei**: `framework/core/IdentityManager.test.js`

```javascript
// framework/core/IdentityManager.test.js

import { IdentityManager } from './IdentityManager.js';
import { AuthPlugin } from '../plugins/auth/AuthPlugin.js';

class TestAuthPlugin extends AuthPlugin {
  constructor(name = 'test') {
    super();
    this.name = name;
    this._loggedIn = false;
    this._identity = null;
  }

  async initialize() {
    this._markInitialized();
  }

  async isLoggedIn() {
    return this._loggedIn;
  }

  async getIdentity() {
    return this._identity;
  }

  async login(credentials = {}) {
    this._loggedIn = true;
    this._identity = {
      pubkey: credentials.pubkey || 'test-pubkey-123',
      npub: credentials.npub || 'npub1test',
      provider: this.name,
      displayName: credentials.displayName,
      capabilities: {
        canSign: true,
        canEncrypt: true,
        canDecrypt: true
      }
    };
    return this._identity;
  }

  async logout() {
    this._loggedIn = false;
    this._identity = null;
  }

  getSigner() {
    return {
      type: this.name,
      getPublicKey: async () => this._identity?.pubkey,
      signEvent: async (event) => ({ ...event, sig: `${this.name}-sig` })
    };
  }
}

export function runIdentityManagerTests() {
  console.group('IdentityManager Tests');
  
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
    const manager = new IdentityManager();
    if (!manager._plugins) throw new Error('Plugins map not initialized');
    if (manager._currentIdentity !== null) throw new Error('Should start unauthenticated');
  });

  test('registerPlugin() adds plugin', () => {
    const manager = new IdentityManager();
    const plugin = new TestAuthPlugin();
    manager.registerPlugin('test', plugin);
    if (!manager.getRegisteredPlugins().includes('test')) {
      throw new Error('Plugin not registered');
    }
  });

  test('unregisterPlugin() removes plugin', () => {
    const manager = new IdentityManager();
    const plugin = new TestAuthPlugin();
    manager.registerPlugin('test', plugin);
    manager.unregisterPlugin('test');
    if (manager.getRegisteredPlugins().includes('test')) {
      throw new Error('Plugin not removed');
    }
  });

  // Async Tests
  (async () => {
    await asyncTest('initialize() initializes plugins', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      if (!plugin.isInitialized()) throw new Error('Plugin not initialized');
    });

    await asyncTest('authenticate() logs in successfully', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      
      const identity = await manager.authenticate('test', { pubkey: 'pk123' });
      if (identity.pubkey !== 'pk123') throw new Error('Wrong pubkey');
      if (!manager.isAuthenticated()) throw new Error('Not authenticated');
    });

    await asyncTest('getCurrentIdentity() returns current identity', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      await manager.authenticate('test', { pubkey: 'pk456' });
      
      const identity = manager.getCurrentIdentity();
      if (identity.pubkey !== 'pk456') throw new Error('Wrong identity');
    });

    await asyncTest('getPublicKey() returns pubkey', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      await manager.authenticate('test', { pubkey: 'pk789' });
      
      if (manager.getPublicKey() !== 'pk789') throw new Error('Wrong pubkey');
    });

    await asyncTest('getSigner() returns signer', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      await manager.authenticate('test');
      
      const signer = manager.getSigner();
      if (!signer || signer.type !== 'test') throw new Error('Wrong signer');
    });

    await asyncTest('logout() clears identity', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      await manager.authenticate('test');
      await manager.logout();
      
      if (manager.isAuthenticated()) throw new Error('Still authenticated');
      if (manager.getCurrentIdentity() !== null) throw new Error('Identity not cleared');
    });

    await asyncTest('Events fire correctly', async () => {
      const manager = new IdentityManager();
      const plugin = new TestAuthPlugin();
      manager.registerPlugin('test', plugin);
      await manager.initialize();
      
      let loginFired = false;
      let logoutFired = false;
      
      manager.on('identity:login', () => loginFired = true);
      manager.on('identity:logout', () => logoutFired = true);
      
      await manager.authenticate('test');
      if (!loginFired) throw new Error('Login event not fired');
      
      await manager.logout();
      if (!logoutFired) throw new Error('Logout event not fired');
    });

    await asyncTest('Multiple plugins work', async () => {
      const manager = new IdentityManager();
      const plugin1 = new TestAuthPlugin('plugin1');
      const plugin2 = new TestAuthPlugin('plugin2');
      
      manager.registerPlugin('plugin1', plugin1);
      manager.registerPlugin('plugin2', plugin2);
      await manager.initialize();
      
      await manager.authenticate('plugin1', { pubkey: 'pk1' });
      if (manager.getPublicKey() !== 'pk1') throw new Error('Wrong pubkey for plugin1');
      
      await manager.logout();
      await manager.authenticate('plugin2', { pubkey: 'pk2' });
      if (manager.getPublicKey() !== 'pk2') throw new Error('Wrong pubkey for plugin2');
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
  window.runIdentityManagerTests = runIdentityManagerTests;
  console.log('💡 Run tests with: runIdentityManagerTests()');
}
```

**Browser Console Test**:
```javascript
import { runIdentityManagerTests } from './framework/core/IdentityManager.test.js';
const results = await runIdentityManagerTests();
console.table(results.tests);
```

---

## Akzeptanzkriterien

- [ ] AuthPlugin Interface vollständig definiert
- [ ] IdentityManager implementiert mit allen Methoden
- [ ] Plugin-Registrierung funktioniert
- [ ] Authentifizierung über Plugins funktioniert
- [ ] Session-Persistenz (localStorage) funktioniert
- [ ] Events werden korrekt gefeuert
- [ ] Alle Tests bestehen
- [ ] Logout räumt korrekt auf

---

## Nächste Schritte

1. ✅ EventBus implementiert
2. ✅ IdentityManager implementiert
3. ➡️ Weiter mit `AGENT_SignerManager.md`
