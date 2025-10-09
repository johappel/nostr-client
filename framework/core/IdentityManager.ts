// framework/core/IdentityManager.ts

import { EventBus } from './EventBus.js';
import type {
  Identity,
  AuthCredentials,
  EventCallback,
  EventUnsubscriber,
  PluginConfig
} from '../types/index.js';

/**
 * Central identity manager
 * Manages authentication across multiple providers
 */
export class IdentityManager {
  private _eventBus: EventBus;
  private _plugins = new Map<string, any>(); // AuthPlugin instances
  private _currentPlugin: any = null; // Current AuthPlugin
  private _currentIdentity: Identity | null = null;
  private _initialized = false;

  constructor(eventBus: EventBus | null = null) {
    this._eventBus = eventBus || new EventBus();
  }

  /**
   * Initialize the identity manager
   */
  async initialize(): Promise<void> {
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
   * @param name Plugin identifier
   * @param plugin Plugin instance
   */
  registerPlugin(name: string, plugin: any): void {
    if (this._plugins.has(name)) {
      console.warn(`[IdentityManager] Plugin "${name}" already registered, replacing`);
    }

    this._plugins.set(name, plugin);
    console.log(`[IdentityManager] Registered plugin: ${name}`);

    this._eventBus.emit('identity:plugin-registered', { name, plugin });
  }

  /**
   * Unregister an authentication plugin
   * @param name Plugin identifier
   */
  unregisterPlugin(name: string): void {
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
   * @returns Array of plugin names
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this._plugins.keys());
  }

  /**
   * Get list of available (usable) plugins
   * @returns Promise resolving to array of available plugin names
   */
  async getAvailablePlugins(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, plugin] of this._plugins) {
      try {
        // Check if plugin can be used (e.g., NIP-07 needs window.nostr)
        if (await plugin.isLoggedIn() || name === 'local') {
          available.push(name);
        }
      } catch (error) {
        console.debug(`[IdentityManager] Plugin ${name} not available:`, (error as Error).message);
      }
    }

    return available;
  }

  /**
   * Authenticate with a specific provider
   * @param providerName Name of registered plugin
   * @param credentials Provider-specific credentials
   * @returns Promise resolving to Identity
   */
  async authenticate(providerName: string, credentials: AuthCredentials = {}): Promise<Identity> {
    const plugin = this._plugins.get(providerName);

    if (!plugin) {
      throw new Error(`Auth plugin "${providerName}" not found`);
    }

    try {
      console.log(`[IdentityManager] Authenticating with ${providerName}...`);

      let identity: Identity;

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
  async logout(): Promise<void> {
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
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    return this._currentIdentity !== null;
  }

  /**
   * Get current user identity
   * @returns Current identity or null
   */
  getCurrentIdentity(): Identity | null {
    return this._currentIdentity;
  }

  /**
   * Get current auth plugin
   * @returns Current plugin or null
   */
  getCurrentPlugin(): any {
    return this._currentPlugin;
  }

  /**
   * Get public key of current identity
   * @returns Public key or null
   */
  getPublicKey(): string | null {
    return this._currentIdentity?.pubkey || null;
  }

  /**
   * Get npub of current identity
   * @returns Npub or null
   */
  getNpub(): string | null {
    return this._currentIdentity?.npub || null;
  }

  /**
   * Get signer from current plugin
   * @returns Signer plugin or null
   */
  getSigner(): any {
    if (!this._currentPlugin) return null;
    return this._currentPlugin.getSigner();
  }

  /**
   * Listen to identity events
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Store session in localStorage
   * @private
   */
  private _storeSession(providerName: string, identity: Identity): void {
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
  private async _restoreSession(): Promise<void> {
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
  private _clearSession(): void {
    try {
      localStorage.removeItem('nostr_framework_session');
    } catch (error) {
      console.warn('[IdentityManager] Failed to clear session:', error);
    }
  }

  /**
   * Get event bus for external listeners
   * @returns EventBus instance
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }
}