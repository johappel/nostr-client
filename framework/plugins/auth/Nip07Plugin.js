// framework/plugins/auth/Nip07Plugin.js

import { AuthPlugin } from './AuthPlugin.js';
import { npubEncode } from 'nostr-tools/nip19';
import { Config } from '../../config.js';

/**
 * NIP-07 Authentication Plugin
 * Supports browser extensions like Alby, nos2x, Flamingo, etc.
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/07.md
 */
export class Nip07Plugin extends AuthPlugin {
  constructor(config = {}) {
    super(config);
    this.name = 'nip07';
    this.displayName = 'Browser Extension (NIP-07)';
    this._currentIdentity = null;
  }

  /**
   * Initialize the plugin
   * Checks if window.nostr is available
   */
  async initialize() {
    if (typeof window === 'undefined') {
      throw new Error('[NIP-07] Cannot use in non-browser environment');
    }

    if (!window.nostr) {
      console.warn('[NIP-07] No NIP-07 extension detected at initialization. Extension may load later.');
      this._markInitialized();
      return;
    }

    console.log('[NIP-07] Extension detected:', window.nostr);
    
    // Try to restore previous session
    try {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey) {
        this._currentIdentity = await this._buildIdentity(pubkey);
        console.log('[NIP-07] Session restored:', this._currentIdentity.npub);
      }
    } catch (error) {
      console.debug('[NIP-07] No previous session found:', error.message);
    }

    this._markInitialized();
  }

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    if (!window.nostr) return false;

    try {
      const pubkey = await window.nostr.getPublicKey();
      return !!pubkey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current identity
   * @returns {Promise<Identity|null>}
   */
  async getIdentity() {
    return this._currentIdentity;
  }

  /**
   * Perform login
   * For NIP-07, this requests access to the extension
   * @returns {Promise<Identity>}
   */
  async login() {
    if (!window.nostr) {
      throw new Error('[NIP-07] No NIP-07 extension detected');
    }

    try {
      console.log('[NIP-07] Requesting public key from extension...');
      
      // Request public key (this may show a permission popup)
      const pubkey = await window.nostr.getPublicKey();
      
      if (!pubkey) {
        throw new Error('[NIP-07] No public key received from extension');
      }

      // Build identity object
      this._currentIdentity = await this._buildIdentity(pubkey);
      
      console.log('[NIP-07] Login successful:', this._currentIdentity.npub);
      
      return this._currentIdentity;
    } catch (error) {
      console.error('[NIP-07] Login failed:', error);
      throw new Error(`NIP-07 login failed: ${error.message}`);
    }
  }

  /**
   * Perform logout
   * For NIP-07, we just clear the local identity
   * The extension itself doesn't have a logout concept
   */
  async logout() {
    console.log('[NIP-07] Logging out...');
    this._currentIdentity = null;
    console.log('[NIP-07] Logged out');
  }

  /**
   * Get signer instance
   * Returns a signer that uses the NIP-07 extension
   * @returns {Object} Signer
   */
  getSigner() {
    if (!this._currentIdentity) {
      throw new Error('[NIP-07] Not logged in');
    }

    return {
      type: 'nip07',
      
      /**
       * Get public key
       * @returns {Promise<string>} Hex pubkey
       */
      getPublicKey: async () => {
        return await window.nostr.getPublicKey();
      },

      /**
       * Sign an event
       * @param {Object} event - Unsigned event
       * @returns {Promise<Object>} Signed event
       */
      signEvent: async (event) => {
        if (!window.nostr) {
          throw new Error('[NIP-07] Extension not available');
        }

        console.log('[NIP-07] Signing event:', event);

        try {
          const signedEvent = await window.nostr.signEvent(event);
          console.log('[NIP-07] Event signed successfully');
          return signedEvent;
        } catch (error) {
          console.error('[NIP-07] Signing failed:', error);
          throw new Error(`NIP-07 signing failed: ${error.message}`);
        }
      },

      /**
       * Encrypt message (NIP-04)
       * @param {string} pubkey - Recipient public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip04Encrypt: async (pubkey, plaintext) => {
        if (!window.nostr?.nip04) {
          throw new Error('[NIP-07] NIP-04 encryption not supported by extension');
        }

        try {
          return await window.nostr.nip04.encrypt(pubkey, plaintext);
        } catch (error) {
          throw new Error(`NIP-04 encryption failed: ${error.message}`);
        }
      },

      /**
       * Decrypt message (NIP-04)
       * @param {string} pubkey - Sender public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip04Decrypt: async (pubkey, ciphertext) => {
        if (!window.nostr?.nip04) {
          throw new Error('[NIP-07] NIP-04 decryption not supported by extension');
        }

        try {
          return await window.nostr.nip04.decrypt(pubkey, ciphertext);
        } catch (error) {
          throw new Error(`NIP-04 decryption failed: ${error.message}`);
        }
      },

      /**
       * Encrypt message (NIP-44)
       * @param {string} pubkey - Recipient public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip44Encrypt: async (pubkey, plaintext) => {
        if (!window.nostr?.nip44) {
          throw new Error('[NIP-07] NIP-44 encryption not supported by extension');
        }

        try {
          return await window.nostr.nip44.encrypt(pubkey, plaintext);
        } catch (error) {
          throw new Error(`NIP-44 encryption failed: ${error.message}`);
        }
      },

      /**
       * Decrypt message (NIP-44)
       * @param {string} pubkey - Sender public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip44Decrypt: async (pubkey, ciphertext) => {
        if (!window.nostr?.nip44) {
          throw new Error('[NIP-07] NIP-44 decryption not supported by extension');
        }

        try {
          return await window.nostr.nip44.decrypt(pubkey, ciphertext);
        } catch (error) {
          throw new Error(`NIP-44 decryption failed: ${error.message}`);
        }
      }
    };
  }

  /**
   * Build identity object from pubkey
   * @private
   * @param {string} pubkey - Hex public key
   * @returns {Promise<Identity>}
   */
  async _buildIdentity(pubkey) {
    // Convert to npub
    const npub = npubEncode(pubkey);

    // Detect capabilities based on what the extension supports
    const capabilities = {
      canSign: !!window.nostr?.signEvent,
      canEncrypt: !!(window.nostr?.nip04?.encrypt || window.nostr?.nip44?.encrypt),
      canDecrypt: !!(window.nostr?.nip04?.decrypt || window.nostr?.nip44?.decrypt)
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
      console.warn('[NIP-07] Failed to fetch metadata:', error);
    }

    return {
      pubkey,
      npub,
      provider: 'nip07',
      displayName,
      metadata,
      capabilities
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
            console.log('[NIP-07] Using cached metadata for', npub);
            return meta;
          }
        }
      } catch (e) {
        console.debug('[NIP-07] Cache check failed:', e);
      }

      // Use configured relays
      const relays = [...Config.relays];

      // Add instance-specific config relays if available
      if (this.config.relays && Array.isArray(this.config.relays)) {
        relays.push(...this.config.relays);
      }

      console.log('[NIP-07] Fetching metadata from relays for', npub);

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
            console.debug('[NIP-07] Failed to cache metadata:', e);
          }
        } catch (e) {
          console.warn('[NIP-07] JSON parse for metadata failed:', e);
        }
        return meta;
      } else {
        console.warn('[NIP-07] No profile event found for', npub);
        return null;
      }
    } catch (error) {
      console.error('[NIP-07] Error fetching metadata:', error);
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
      console.warn('[NIP-07] No login button provided');
      return;
    }

    const { loginButton, logoutButton, statusElement } = elements;

    // Setup login button
    loginButton.addEventListener('click', async () => {
      try {
        statusElement.textContent = 'Connecting to extension...';
        const identity = await this.login();
        statusElement.textContent = `Connected: ${identity.npub}`;
        if (onChange) onChange(identity);
      } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
      }
    });

    // Setup logout button
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        await this.logout();
        statusElement.textContent = 'Disconnected';
        if (onChange) onChange(null);
      });
    }

    console.log('[NIP-07] UI setup complete');
  }

  /**
   * Check if NIP-07 extension is available
   * @static
   * @returns {boolean}
   */
  static isAvailable() {
    return typeof window !== 'undefined' && !!window.nostr;
  }

  /**
   * Get extension info (if available)
   * @static
   * @returns {Object|null}
   */
  static getExtensionInfo() {
    if (!window.nostr) return null;

    return {
      available: true,
      hasNip04: !!(window.nostr.nip04?.encrypt && window.nostr.nip04?.decrypt),
      hasNip44: !!(window.nostr.nip44?.encrypt && window.nostr.nip44?.decrypt),
      methods: Object.keys(window.nostr)
    };
  }
}