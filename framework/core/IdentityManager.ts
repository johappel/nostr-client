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

  /**
   * Fetch user profile metadata from relays
   * @param pubkey Public key or npub to fetch profile for
   * @param relays Array of relay URLs to query
   * @returns Promise resolving to profile metadata or null
   */
  async fetchProfile(pubkey: string, relays: string[] = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.snort.social', 'wss://nostr.wine', 'wss://relay.nostr.band']): Promise<any | null> {
    try {
      // Convert npub to hex if needed
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub1')) {
        const hexResult = this.npubToHex(pubkey);
        if (!hexResult) {
          console.warn(`[IdentityManager] Invalid npub format: ${pubkey}`);
          return null;
        }
        hexPubkey = hexResult;
      }

      // Try public API first
      if (pubkey.startsWith('npub1')) {
        try {
          const response = await fetch(`https://rbr.bio/${pubkey}/meta`);
          if (response.ok) {
            const data = await response.json();
            if (data.metadata) {
              console.log(`[IdentityManager] Fetched profile from API for ${pubkey}`);
              return {
                pubkey,
                ...data.metadata,
                createdAt: data.created_at || Math.floor(Date.now() / 1000),
                updatedAt: data.created_at || Math.floor(Date.now() / 1000)
              };
            }
          }
        } catch (apiErr) {
          console.warn(`[IdentityManager] API fetch failed for ${pubkey}:`, apiErr);
        }
      }

      // Try WebSocket connection to relays
      const filter = {
        kinds: [0],
        authors: [hexPubkey],
        limit: 1
      };

      for (const relayUrl of relays) {
        try {
          const event = await new Promise<any>((resolve, reject) => {
            const ws = new WebSocket(relayUrl);
            const timeout = setTimeout(() => {
              ws.close();
              resolve(null);
            }, 3000);

            ws.onopen = () => {
              const req = ["REQ", "profile", filter];
              ws.send(JSON.stringify(req));
            };

            ws.onmessage = (event) => {
              try {
                const [type, , data] = JSON.parse(event.data);
                if (type === "EVENT") {
                  clearTimeout(timeout);
                  ws.close();
                  resolve(data);
                } else if (type === "EOSE") {
                  clearTimeout(timeout);
                  ws.close();
                  resolve(null);
                }
              } catch (err) {
                console.warn('[IdentityManager] Failed to parse WebSocket message:', err);
              }
            };

            ws.onerror = () => {
              clearTimeout(timeout);
              resolve(null);
            };

            ws.onclose = () => {
              clearTimeout(timeout);
              resolve(null);
            };
          });

          if (event) {
            const metadata = JSON.parse(event.content);
            console.log(`[IdentityManager] Fetched profile from relay ${relayUrl} for ${pubkey}`);
            return {
              pubkey,
              ...metadata,
              createdAt: event.created_at,
              updatedAt: event.created_at
            };
          }
        } catch (relayErr) {
          console.warn(`[IdentityManager] Relay ${relayUrl} failed for ${pubkey}:`, relayErr);
          continue;
        }
      }

      // Return null if no profile found
      console.log(`[IdentityManager] No profile found for ${pubkey}`);
      return null;
    } catch (error) {
      console.error(`[IdentityManager] Failed to fetch profile for ${pubkey}:`, error);
      return null;
    }
  }

  /**
   * Get mock profile data for demo purposes
   * @param pubkey Public key or npub
   * @returns Mock profile data
   */
  getMockProfile(pubkey: string): any {
    const mockProfiles: Record<string, any> = {
      'npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft': {
        name: 'Test User',
        displayName: 'Test User',
        about: 'This is a test profile for demonstration purposes',
        picture: 'https://robohash.org/testuser?set=set1',
        nip05: 'test@nostr.example.com',
        lud16: 'test@getalby.com'
      },
      'npub1f7jar3qnu269uyx5p0e4v24hqxjnxysxudvujza2ur5ehltvdeqsly2fx9': {
        name: 'Alice Johnson',
        displayName: 'Alice',
        about: 'Bitcoin maximalist and Nostr enthusiast 🚀',
        picture: 'https://robohash.org/alice?set=set2',
        nip05: 'alice@nostr.band',
        lud16: 'alice@getalby.com'
      }
    };

    const mockData = mockProfiles[pubkey] || {
      name: 'Demo User',
      displayName: 'Demo',
      about: 'Demo profile - no metadata found on relays',
      picture: 'https://robohash.org/demo?set=set3'
    };

    return {
      pubkey,
      ...mockData,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Convert npub to hex using bech32 decoding
   * @param npub The npub to convert
   * @returns Hex pubkey or null if invalid
   */
  npubToHex(npub: string): string | null {
    try {
      // Simple bech32 decoding for npub
      // In production, use a proper library like 'bech32'
      const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
      const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
      
      // Remove prefix and separator
      const prefix = 'npub';
      if (!npub.startsWith(prefix + '1')) {
        return null;
      }
      
      const withoutPrefix = npub.slice(prefix.length + 1);
      
      // Verify checksum
      let chk = 1;
      for (let i = 0; i < withoutPrefix.length; i++) {
        const v = alphabet.indexOf(withoutPrefix[i]);
        if (v === -1) return null;
        chk = this.polymod(chk) ^ v;
      }
      
      if (chk !== this.polymod(1)) {
        return null;
      }
      
      // Remove checksum (last 6 characters)
      const data = withoutPrefix.slice(0, -6);
      
      // Convert from base32 to bytes
      let bits = 0;
      let value = 0;
      const bytes: number[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const v = alphabet.indexOf(data[i]);
        if (v === -1) return null;
        
        value = (value << 5) | v;
        bits += 5;
        
        if (bits >= 8) {
          bits -= 8;
          bytes.push((value >>> bits) & 0xff);
        }
      }
      
      // Convert to hex
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[IdentityManager] npubToHex error:', error);
      return null;
    }
  }

  /**
   * Helper for bech32 polymod calculation
   * @param value Current value
   * @returns New value
   */
  private polymod(value: number): number {
    const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = value >>> 25;
    value = (value & 0x1ffffff) << 5;
    
    for (let i = 0; i < 5; i++) {
      if ((chk >>> i) & 1) {
        value ^= generator[i];
      }
    }
    
    return value;
  }
}