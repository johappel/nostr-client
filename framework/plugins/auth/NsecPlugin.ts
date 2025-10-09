// framework/plugins/auth/NsecPlugin.ts

import { AuthPlugin } from './AuthPlugin.js';
import { Config } from '../../config.js';
import type { Identity, AuthCredentials, PluginConfig } from '../../types/index.js';

/**
 * ⚠️ UNSECURE ⚠️ Private Key Authentication Plugin
 * 
 * Allows manual entry of private keys (nsec or hex format).
 * 
 * **SECURITY WARNING:**
 * This plugin stores your private key in browser memory and localStorage.
 * Only use this for testing or development purposes!
 * NEVER use this with your main account!
 * 
 * Recommended alternatives:
 * - NIP-07: Browser extensions (Alby, nos2x)
 * - NIP-46: Remote signing (Bunker)
 */
export class NsecPlugin extends AuthPlugin {
  private _currentIdentity: Identity | null = null;
  private _privateKey: string | null = null;

  constructor(config: PluginConfig = {}) {
    super(config);
    this.name = 'nsec';
    this.displayName = '⚠️ Private Key Login (UNSAFE)';
  }

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    console.warn('[NSEC] ⚠️ WARNING: This plugin is UNSAFE! Only use for testing!');
    
    // Try to restore previous session (if enabled)
    if (this.config.rememberKey !== false) {
      try {
        const stored = localStorage.getItem('nsec_private_key_hex');
        if (stored) {
          console.warn('[NSEC] ⚠️ Found stored private key - restoring session');
          const pubkey = await this._getPublicKeyFromPrivate(stored);
          this._privateKey = stored;
          this._currentIdentity = await this._buildIdentity(pubkey);
          console.log('[NSEC] Session restored:', this._currentIdentity.npub);
        }
      } catch (error) {
        console.debug('[NSEC] No previous session found:', (error as Error).message);
        localStorage.removeItem('nsec_private_key_hex');
      }
    }

    this._markInitialized();
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return !!this._currentIdentity && !!this._privateKey;
  }

  /**
   * Get current identity
   */
  async getIdentity(): Promise<Identity | null> {
    // If we have a current identity, return it
    if (this._currentIdentity) {
      return this._currentIdentity;
    }
    
    // If we have a private key but no identity, rebuild it
    if (this._privateKey && !this._currentIdentity) {
      try {
        const pubkey = await this._getPublicKeyFromPrivate(this._privateKey);
        this._currentIdentity = await this._buildIdentity(pubkey);
        return this._currentIdentity;
      } catch (error) {
        console.error('[NSEC] Failed to rebuild identity from private key:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Perform login with private key
   */
  async login(credentials: AuthCredentials = {}): Promise<Identity> {
    const { nsec } = credentials;
    
    if (!nsec) {
      throw new Error('[NSEC] No private key provided');
    }

    try {
      // Convert nsec to hex format
      const privateKeyHex = await this._convertNsecToHex(nsec);
      
      // Get public key from private key
      const pubkey = await this._getPublicKeyFromPrivate(privateKeyHex);
      
      // Build identity
      const identity = await this._buildIdentity(pubkey);
      
      // Store for signing
      this._privateKey = privateKeyHex;
      this._currentIdentity = identity;

      // Store in localStorage if enabled
      if (this.config.rememberKey !== false) {
        localStorage.setItem('nsec_private_key_hex', privateKeyHex);
        console.warn('[NSEC] ⚠️ Private key stored in localStorage (UNSAFE!)');
      }

      console.log('[NSEC] ⚠️ Login successful:', identity.npub);
      return identity;
    } catch (error) {
      throw new Error(`[NSEC] Login failed: ${(error as Error).message}`);
    }
  }

  /**
   * Logout and clear stored keys
   */
  async logout(): Promise<void> {
    console.log('[NSEC] Logging out...');
    
    // Clear memory
    this._currentIdentity = null;
    this._privateKey = null;
    
    // Clear localStorage
    localStorage.removeItem('nsec_private_key_hex');
    
    console.log('[NSEC] Logout complete');
  }

  /**
   * Get signer instance (required by AuthPlugin)
   */
  async getSigner(): Promise<any> {
    if (!this._privateKey) {
      throw new Error('[NSEC] No private key available');
    }
    
    return {
      signEvent: (event: any) => this.signEvent(event),
      getPublicKey: () => this._getPublicKeyFromPrivate(this._privateKey!)
    };
  }

  /**
   * Sign an event with the stored private key
   */
  async signEvent(event: any): Promise<any> {
    if (!this._privateKey) {
      throw new Error('[NSEC] No private key available for signing');
    }

    try {
      // Import nostr-tools dynamically
      const { finalizeEvent, getPublicKey } = await import('nostr-tools');
      
      // Add pubkey and finalize event
      const eventToSign = {
        ...event,
        pubkey: await this._getPublicKeyFromPrivate(this._privateKey)
      };

      const privateKeyBytes = this._hexToBytes(this._privateKey);
      const signedEvent = finalizeEvent(eventToSign, privateKeyBytes);
      
      console.log('[NSEC] Event signed:', signedEvent.id);
      return signedEvent;
      
    } catch (error) {
      throw new Error(`[NSEC] Failed to sign event: ${(error as Error).message}`);
    }
  }

  /**
   * Convert nsec string to hex format
   */
  private async _convertNsecToHex(nsec: string): Promise<string> {
    // If already hex format (64 characters), return as-is
    if (/^[0-9a-f]{64}$/i.test(nsec)) {
      return nsec.toLowerCase();
    }

    // If nsec format, decode it
    if (nsec.startsWith('nsec1')) {
      try {
        const { nip19 } = await import('nostr-tools');
        const decoded = nip19.decode(nsec);
        
        if (decoded.type !== 'nsec') {
          throw new Error('Invalid nsec format');
        }
        
        return this._bytesToHex(decoded.data);
      } catch (error) {
        throw new Error(`Invalid nsec format: ${(error as Error).message}`);
      }
    }

    throw new Error('Private key must be in nsec1... or hex format');
  }

  /**
   * Get public key from private key
   */
  private async _getPublicKeyFromPrivate(privateKeyHex: string): Promise<string> {
    try {
      const { getPublicKey } = await import('nostr-tools');
      const privateKeyBytes = this._hexToBytes(privateKeyHex);
      return getPublicKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Failed to derive public key: ${(error as Error).message}`);
    }
  }

  /**
   * Build identity object from public key
   */
  private async _buildIdentity(pubkey: string): Promise<Identity> {
    try {
      const { nip19 } = await import('nostr-tools');
      const npub = nip19.npubEncode(pubkey);

      return {
        pubkey,
        npub,
        provider: this.name,
        displayName: `${this.displayName}`,
        metadata: undefined,
        capabilities: {
          canSign: true,
          canEncrypt: false, // TODO: Implement encryption
          canDecrypt: false  // TODO: Implement decryption
        }
      };
    } catch (error) {
      throw new Error(`Failed to build identity: ${(error as Error).message}`);
    }
  }

  /**
   * Convert hex string to Uint8Array (browser-compatible)
   */
  private _hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Convert Uint8Array to hex string (browser-compatible)
   */
  private _bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}