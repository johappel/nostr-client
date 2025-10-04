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
      
      let identity;
      
      // If credentials are provided, perform login
      // Otherwise, try to get existing identity (for session restoration)
      if (Object.keys(credentials).length > 0) {
        identity = await plugin.login(credentials);
      } else {
        // For session restoration without credentials
        if (await plugin.isLoggedIn()) {
          identity = await plugin.getIdentity();
          if (!identity) {
            throw new Error(`Plugin "${providerName}" is logged in but no identity available`);
          }
        } else {
          throw new Error(`Plugin "${providerName}" is not logged in and no credentials provided`);
        }
      }
      
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