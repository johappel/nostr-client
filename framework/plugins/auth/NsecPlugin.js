// framework/plugins/auth/NsecPlugin.js

import { AuthPlugin } from './AuthPlugin.js';
import { Config } from '../../config.js';

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
  constructor(config = {}) {
    super(config);
    this.name = 'nsec';
    this.displayName = '⚠️ Private Key Login (UNSAFE)';
    this._currentIdentity = null;
    this._privateKey = null;
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
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
        console.debug('[NSEC] No previous session found:', error.message);
        localStorage.removeItem('nsec_private_key_hex');
      }
    }

    this._markInitialized();
  }

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    return !!this._currentIdentity && !!this._privateKey;
  }

  /**
   * Get current identity
   * @returns {Promise<Identity|null>}
   */
  async getIdentity() {
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
   * @param {Object} credentials - { nsec: string } (nsec or hex format)
   * @returns {Promise<Identity>}
   */
  async login(credentials = {}) {
    const { nsec } = credentials;
    
    if (!nsec) {
      throw new Error('[NSEC] No private key provided');
    }

    try {
      console.warn('[NSEC] ⚠️ WARNING: Logging in with private key (UNSAFE!)');
      
      // Convert nsec to hex if needed
      let privateKeyHex = nsec.trim();
      
      if (privateKeyHex.startsWith('nsec1')) {
        // Decode bech32 nsec
        try {
          const { decode } = await import('nostr-tools/nip19');
          const decoded = decode(privateKeyHex);
          
          if (decoded.type !== 'nsec') {
            throw new Error('Invalid nsec format');
          }
          
          // Convert Uint8Array to hex
          privateKeyHex = Array.from(decoded.data)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        } catch (error) {
          throw new Error(`[NSEC] Failed to decode nsec: ${error.message}`);
        }
      }
      
      // Validate hex format
      if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
        throw new Error('[NSEC] Invalid private key format (must be nsec or 64-char hex)');
      }

      // Get public key from private key
      const pubkey = await this._getPublicKeyFromPrivate(privateKeyHex);
      
      // Store private key
      this._privateKey = privateKeyHex.toLowerCase();
      
      // Store in localStorage if enabled
      if (this.config.rememberKey !== false) {
        console.warn('[NSEC] ⚠️ Storing private key in localStorage (UNSAFE!)');
        localStorage.setItem('nsec_private_key_hex', this._privateKey);
      }

      // Build identity object
      this._currentIdentity = await this._buildIdentity(pubkey);
      
      console.log('[NSEC] Login successful:', this._currentIdentity.npub);
      console.warn('[NSEC] ⚠️ REMINDER: This method is UNSAFE! Use NIP-07 or NIP-46 for production!');
      
      return this._currentIdentity;
    } catch (error) {
      console.error('[NSEC] Login failed:', error);
      throw new Error(`NSEC login failed: ${error.message}`);
    }
  }

  /**
   * Perform logout
   * Clears private key from memory and storage
   */
  async logout() {
    console.log('[NSEC] Logging out...');
    
    // Clear private key
    this._privateKey = null;
    this._currentIdentity = null;
    
    // Clear from localStorage
    try {
      localStorage.removeItem('nsec_private_key_hex');
    } catch (error) {
      console.warn('[NSEC] Failed to clear localStorage:', error);
    }
    
    console.log('[NSEC] Logged out - private key cleared');
  }

  /**
   * Get signer instance
   * Returns a signer that uses the stored private key
   * @returns {Object} Signer
   */
  getSigner() {
    if (!this._currentIdentity || !this._privateKey) {
      throw new Error('[NSEC] Not logged in');
    }

    const privateKeyHex = this._privateKey;

    return {
      type: 'nsec',
      
      /**
       * Get public key
       * @returns {Promise<string>} Hex pubkey
       */
      getPublicKey: async () => {
        return await this._getPublicKeyFromPrivate(privateKeyHex);
      },

      /**
       * Sign an event
       * @param {Object} event - Unsigned event
       * @returns {Promise<Object>} Signed event
       */
      signEvent: async (event) => {
        console.log('[NSEC] Signing event locally:', event);

        try {
          const { finalizeEvent } = await import('nostr-tools');
          
          // Convert hex to bytes
          const privateKeyBytes = new Uint8Array(
            privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
          );
          
          // Finalize and sign event
          const signedEvent = finalizeEvent(event, privateKeyBytes);
          
          console.log('[NSEC] Event signed successfully');
          return signedEvent;
        } catch (error) {
          console.error('[NSEC] Signing failed:', error);
          throw new Error(`NSEC signing failed: ${error.message}`);
        }
      },

      /**
       * Encrypt message (NIP-04)
       * @param {string} recipientPubkey - Recipient public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip04Encrypt: async (recipientPubkey, plaintext) => {
        try {
          const { nip04 } = await import('nostr-tools');
          
          // Convert hex to bytes
          const privateKeyBytes = new Uint8Array(
            privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
          );
          
          return await nip04.encrypt(privateKeyBytes, recipientPubkey, plaintext);
        } catch (error) {
          throw new Error(`NIP-04 encryption failed: ${error.message}`);
        }
      },

      /**
       * Decrypt message (NIP-04)
       * @param {string} senderPubkey - Sender public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip04Decrypt: async (senderPubkey, ciphertext) => {
        try {
          const { nip04 } = await import('nostr-tools');
          
          // Convert hex to bytes
          const privateKeyBytes = new Uint8Array(
            privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
          );
          
          return await nip04.decrypt(privateKeyBytes, senderPubkey, ciphertext);
        } catch (error) {
          throw new Error(`NIP-04 decryption failed: ${error.message}`);
        }
      },

      /**
       * Encrypt message (NIP-44)
       * @param {string} recipientPubkey - Recipient public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip44Encrypt: async (recipientPubkey, plaintext) => {
        try {
          const { nip44 } = await import('nostr-tools');
          
          // Convert hex to bytes
          const privateKeyBytes = new Uint8Array(
            privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
          );
          
          return await nip44.encrypt(privateKeyBytes, recipientPubkey, plaintext);
        } catch (error) {
          throw new Error(`NIP-44 encryption failed: ${error.message}`);
        }
      },

      /**
       * Decrypt message (NIP-44)
       * @param {string} senderPubkey - Sender public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip44Decrypt: async (senderPubkey, ciphertext) => {
        try {
          const { nip44 } = await import('nostr-tools');
          
          // Convert hex to bytes
          const privateKeyBytes = new Uint8Array(
            privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
          );
          
          return await nip44.decrypt(privateKeyBytes, senderPubkey, ciphertext);
        } catch (error) {
          throw new Error(`NIP-44 decryption failed: ${error.message}`);
        }
      }
    };
  }

  /**
   * Get public key from private key
   * @private
   * @param {string} privateKeyHex - Private key in hex format
   * @returns {Promise<string>} Public key in hex format
   */
  async _getPublicKeyFromPrivate(privateKeyHex) {
    try {
      const { getPublicKey } = await import('nostr-tools');
      
      // Convert hex to bytes
      const privateKeyBytes = new Uint8Array(
        privateKeyHex.match(/.{1,2}/g).map(h => parseInt(h, 16))
      );
      
      return getPublicKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Failed to derive public key: ${error.message}`);
    }
  }

  /**
   * Build identity object from pubkey
   * @private
   * @param {string} pubkey - Hex public key
   * @returns {Promise<Identity>}
   */
  async _buildIdentity(pubkey) {
    // Convert to npub
    let npub;
    try {
      const { npubEncode } = await import('nostr-tools/nip19');
      npub = npubEncode(pubkey);
    } catch (error) {
      console.warn('[NSEC] Failed to encode npub:', error);
      npub = pubkey.slice(0, 8) + '...';
    }

    // All capabilities available with private key
    const capabilities = {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true
    };

    // Fetch metadata
    let displayName = null;
    let metadata = null;
    
    try {
      const meta = await this._fetchMetadata(pubkey, npub);
      if (meta) {
        metadata = meta;
        displayName = meta.name || meta.display_name || meta.displayName || null;
      }
    } catch (error) {
      console.warn('[NSEC] Failed to fetch metadata:', error);
    }

    return {
      pubkey,
      npub,
      provider: 'nsec',
      displayName,
      metadata,
      capabilities,
      _warning: '⚠️ UNSAFE: Private key stored in memory'
    };
  }

  /**
   * Fetch user metadata (kind 0) from relays
   * @private
   * @param {string} pubkey - Hex public key
   * @param {string} npub - Bech32 npub
   * @returns {Promise<Object|null>}
   */
  async _fetchMetadata(pubkey, npub) {
    try {
      // Check cache first
      try {
        const cached = localStorage.getItem('author_meta:' + npub);
        if (cached) {
          const meta = JSON.parse(cached);
          // Cache is valid for configured duration (default: 1 hour)
          if (meta._cached_at && (Date.now() - meta._cached_at) < Config.metadataCacheDuration) {
            console.log('[NSEC] Using cached metadata for', npub);
            return meta;
          }
        }
      } catch (e) {
        console.debug('[NSEC] Cache check failed:', e);
      }

      // Use configured relays
      const relays = [...Config.relays];

      // Add instance-specific config relays if available
      if (this.config.relays && Array.isArray(this.config.relays)) {
        relays.push(...this.config.relays);
      }

      console.log('[NSEC] Fetching metadata from relays for', npub);

      // Load nostr-tools for querying (using configured base URL)
      const { SimplePool } = await import(`${Config.nostrToolsBaseUrl}/pool`);
      const pool = new SimplePool();

      // Query for kind 0 event
      const filter = {
        kinds: [0],
        authors: [pubkey],
        limit: 1
      };

      const events = await pool.querySync(relays, filter);
      pool.close(relays);

      if (events && events.length > 0) {
        const event = events[0];
        let meta = null;
        try {
          meta = JSON.parse(event.content);
          // Cache with timestamp
          meta._cached_at = Date.now();
          try {
            localStorage.setItem('author_meta:' + npub, JSON.stringify(meta));
          } catch (e) {
            console.debug('[NSEC] Failed to cache metadata:', e);
          }
        } catch (e) {
          console.warn('[NSEC] JSON parse for metadata failed:', e);
        }
        return meta;
      } else {
        console.warn('[NSEC] No profile event found for', npub);
        return null;
      }
    } catch (error) {
      console.error('[NSEC] Error fetching metadata:', error);
      return null;
    }
  }

  /**
   * Setup UI elements (optional)
   * @param {Object} elements - UI elements
   * @param {Function} onChange - Callback for auth changes
   */
  setupUI(elements, onChange) {
    if (!elements.loginButton) {
      console.warn('[NSEC] No login button provided');
      return;
    }

    const { loginButton, logoutButton, statusElement, inputElement } = elements;

    // Setup login button
    loginButton.addEventListener('click', async () => {
      try {
        const nsec = inputElement?.value || prompt('⚠️ WARNING: Enter private key (nsec or hex) - UNSAFE!');
        
        if (!nsec) {
          statusElement.textContent = 'Login cancelled';
          return;
        }

        statusElement.textContent = '⚠️ Logging in with private key (UNSAFE)...';
        const identity = await this.login({ nsec });
        statusElement.textContent = `⚠️ UNSAFE: Connected as ${identity.npub}`;
        if (onChange) onChange(identity);
      } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
      }
    });

    // Setup logout button
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        await this.logout();
        statusElement.textContent = 'Disconnected - private key cleared';
        if (onChange) onChange(null);
      });
    }

    console.log('[NSEC] UI setup complete');
  }

  /**
   * Check if NSEC plugin is available
   * @static
   * @returns {boolean}
   */
  static isAvailable() {
    return typeof window !== 'undefined';
  }

  /**
   * Display security warning
   * @static
   */
  static showSecurityWarning() {
    return `
⚠️ SECURITY WARNING ⚠️

This authentication method is UNSAFE and should ONLY be used for:
- Testing and development
- Throwaway accounts
- Learning purposes

NEVER use this with your main Nostr account!

Your private key will be:
- Stored in browser memory
- Optionally saved in localStorage
- Visible to browser extensions
- Vulnerable to XSS attacks

Recommended alternatives:
✅ NIP-07: Browser extensions (Alby, nos2x, Flamingo)
✅ NIP-46: Remote signing (Bunker)
`;
  }

  /**
   * Generate a new test key pair
   * ⚠️ FOR TESTING ONLY! ⚠️
   * @static
   * @returns {Promise<Object>} { nsec, npub, privkey, pubkey }
   */
  static async generateTestKey() {
    try {
      console.warn('[NSEC] ⚠️ Generating TEST key pair (UNSAFE!)');
      
      const { generateSecretKey, getPublicKey } = await import('nostr-tools');
      const { nsecEncode, npubEncode } = await import('nostr-tools/nip19');
      
      // Generate random private key
      const privateKeyBytes = generateSecretKey();
      
      // Convert to hex
      const privateKeyHex = Array.from(privateKeyBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Get public key
      const publicKeyHex = getPublicKey(privateKeyBytes);
      
      // Encode to bech32
      const nsec = nsecEncode(privateKeyBytes);
      const npub = npubEncode(publicKeyHex);
      
      console.warn('[NSEC] ⚠️ Test key generated - USE ONLY FOR TESTING!');
      console.log('[NSEC] npub:', npub);
      
      return {
        nsec,
        npub,
        privkey: privateKeyHex,
        pubkey: publicKeyHex
      };
    } catch (error) {
      throw new Error(`Failed to generate test key: ${error.message}`);
    }
  }
}