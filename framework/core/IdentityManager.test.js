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