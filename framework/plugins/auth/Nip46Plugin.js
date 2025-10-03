// framework/plugins/auth/Nip46Plugin.js

import { AuthPlugin } from './AuthPlugin.js';

/**
 * NIP-46 Authentication Plugin (Bunker)
 * Supports remote signing via bunker:// or nostrconnect:// URIs
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/46.md
 */
export class Nip46Plugin extends AuthPlugin {
  constructor(config = {}) {
    super(config);
    this.name = 'nip46';
    this.displayName = 'Remote Signer (NIP-46 Bunker)';
    this._currentIdentity = null;
    this._bunker = null;
    this._nip46Connecting = false;
    this._signQueue = Promise.resolve();
    this._signQueueSize = 0;
  }

  /**
   * Initialize the plugin
   * Sets up NIP-46 module loading and checks for stored connections
   */
  async initialize() {
    if (typeof window === 'undefined') {
      throw new Error('[NIP-46] Cannot use in non-browser environment');
    }

    console.log('[NIP-46] Initializing plugin...');
    
    // Try to restore previous session
    const storedPubkey = localStorage.getItem('nip46_connected_pubkey');
    const storedUri = localStorage.getItem('nip46_connect_uri');
    
    if (storedPubkey && storedUri) {
      try {
        console.log('[NIP-46] Found stored connection, attempting to restore...');
        this._currentIdentity = await this._buildIdentity(storedPubkey);
        if (this._currentIdentity && this._currentIdentity.pubkey) {
          console.log('[NIP-46] Session restored:', this._currentIdentity.npub);
        } else {
          throw new Error('Invalid identity built from stored pubkey');
        }
      } catch (error) {
        console.warn('[NIP-46] Failed to restore session:', error.message);
        // Clear invalid stored data
        localStorage.removeItem('nip46_connected');
        localStorage.removeItem('nip46_connected_pubkey');
        this._currentIdentity = null;
      }
    }

    this._markInitialized();
  }

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    return !!this._currentIdentity && !!this._bunker;
  }

  /**
   * Get current identity
   * @returns {Promise<Identity|null>}
   */
  async getIdentity() {
    return this._currentIdentity;
  }

  /**
   * Perform login with bunker URI
   * @param {Object} credentials - { uri: string }
   * @returns {Promise<Identity>}
   */
  async login(credentials = {}) {
    const { uri } = credentials;
    
    if (!uri) {
      // If no URI provided, try to get it interactively
      const uriToUse = await this._getBunkerURIInteractive();
      if (!uriToUse) {
        throw new Error('[NIP-46] No bunker URI provided');
      }
      return this._connectBunker(uriToUse);
    }
    
    return this._connectBunker(uri);
  }

  /**
   * Perform logout
   * Clears bunker connection and local data
   */
  async logout() {
    console.log('[NIP-46] Logging out...');
    
    // Close bunker connection
    if (this._bunker && typeof this._bunker.close === 'function') {
      try {
        await this._bunker.close();
      } catch (error) {
        console.warn('[NIP-46] Error closing bunker:', error);
      }
    }
    
    // Clear local data
    this._bunker = null;
    this._currentIdentity = null;
    this._nip46Connecting = false;
    
    try {
      localStorage.removeItem('nip46_connected');
      localStorage.removeItem('nip46_connected_pubkey');
    } catch (error) {
      console.warn('[NIP-46] Failed to clear localStorage:', error);
    }
    
    // Dispatch logout event
    try {
      window.dispatchEvent(new CustomEvent('nip46-disconnected'));
    } catch (error) {
      console.warn('[NIP-46] Failed to dispatch disconnect event:', error);
    }
    
    console.log('[NIP-46] Logged out');
  }

  /**
   * Get signer instance
   * Returns a signer that uses the NIP-46 bunker connection
   * @returns {Object} Signer
   */
  getSigner() {
    if (!this._currentIdentity) {
      throw new Error('[NIP-46] No identity available - not logged in');
    }
    
    if (!this._bunker) {
      console.error('[NIP-46] Bunker object is null but identity exists');
      console.error('[NIP-46] Current identity:', this._currentIdentity);
      throw new Error('[NIP-46] Not connected to bunker - please reconnect');
    }

    return {
      type: 'nip46',
      
      /**
       * Get public key
       * @returns {Promise<string>} Hex pubkey
       */
      getPublicKey: async () => {
        if (!this._bunker || typeof this._bunker.getPublicKey !== 'function') {
          throw new Error('[NIP-46] Bunker not available');
        }
        return await this._bunker.getPublicKey();
      },

      /**
       * Sign an event with timeout and retry logic
       * @param {Object} event - Unsigned event
       * @returns {Promise<Object>} Signed event
       */
      signEvent: async (event) => {
        return this._signEventWithTimeout(event);
      },

      /**
       * NIP-04: Encrypt message
       * @param {string} recipientPubkey - Recipient's public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip04Encrypt: async (recipientPubkey, plaintext) => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        console.log('[NIP-46] Attempting NIP-04 encryption');
        
        // Check all methods including prototype
        const allMethods = [];
        for (let key in this._bunker) {
          if (typeof this._bunker[key] === 'function') {
            allMethods.push(key);
          }
        }
        console.log('[NIP-46] Available bunker methods (including prototype):', allMethods);
        console.log('[NIP-46] Direct nip04Encrypt check:', typeof this._bunker.nip04Encrypt);
        
        if (typeof this._bunker.nip04Encrypt !== 'function') {
          throw new Error('[NIP-46] NIP-04 encryption not supported by this bunker - method nip04Encrypt not found');
        }
        
        try {
          const result = await this._bunker.nip04Encrypt(recipientPubkey, plaintext);
          console.log('[NIP-46] NIP-04 encryption result:', result ? 'success' : 'undefined');
          if (!result) {
            throw new Error('NIP-04 encryption returned undefined');
          }
          return result;
        } catch (error) {
          throw new Error(`[NIP-46] NIP-04 encryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-04: Decrypt message
       * @param {string} senderPubkey - Sender's public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip04Decrypt: async (senderPubkey, ciphertext) => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        if (typeof this._bunker.nip04Decrypt !== 'function') {
          console.warn('[NIP-46] Available bunker methods:', Object.keys(this._bunker).filter(k => typeof this._bunker[k] === 'function'));
          throw new Error('[NIP-46] NIP-04 decryption not supported by this bunker');
        }
        
        try {
          const result = await this._bunker.nip04Decrypt(senderPubkey, ciphertext);
          if (!result) {
            throw new Error('NIP-04 decryption returned undefined');
          }
          return result;
        } catch (error) {
          throw new Error(`[NIP-46] NIP-04 decryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-44: Encrypt message
       * @param {string} recipientPubkey - Recipient's public key
       * @param {string} plaintext - Message to encrypt
       * @returns {Promise<string>} Encrypted message
       */
      nip44Encrypt: async (recipientPubkey, plaintext) => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        console.log('[NIP-46] Attempting NIP-44 encryption');
        
        // Check all methods including prototype
        const allMethods = [];
        for (let key in this._bunker) {
          if (typeof this._bunker[key] === 'function') {
            allMethods.push(key);
          }
        }
        console.log('[NIP-46] Available bunker methods (including prototype):', allMethods);
        console.log('[NIP-46] Direct nip44Encrypt check:', typeof this._bunker.nip44Encrypt);
        
        if (typeof this._bunker.nip44Encrypt !== 'function') {
          throw new Error('[NIP-46] NIP-44 encryption not supported by this bunker - method nip44Encrypt not found');
        }
        
        try {
          const result = await this._bunker.nip44Encrypt(recipientPubkey, plaintext);
          console.log('[NIP-46] NIP-44 encryption result:', result ? 'success' : 'undefined');
          if (!result) {
            throw new Error('NIP-44 encryption returned undefined');
          }
          return result;
        } catch (error) {
          throw new Error(`[NIP-46] NIP-44 encryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-44: Decrypt message
       * @param {string} senderPubkey - Sender's public key
       * @param {string} ciphertext - Encrypted message
       * @returns {Promise<string>} Decrypted message
       */
      nip44Decrypt: async (senderPubkey, ciphertext) => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        // Check if nip44Decrypt method exists
        if (typeof this._bunker.nip44Decrypt !== 'function') {
          console.warn('[NIP-46] Available bunker methods:', Object.keys(this._bunker));
          throw new Error('[NIP-46] NIP-44 decryption not supported by this bunker implementation');
        }
        
        try {
          return await this._bunker.nip44Decrypt(senderPubkey, ciphertext);
        } catch (error) {
          throw new Error(`[NIP-46] NIP-44 decryption failed: ${error?.message || 'Unknown error'}`);
        }
      }
    };
  }

  /**
   * Auto-reconnect to stored bunker
   * @param {Function} onUpdate - Optional callback
   */
  async autoReconnect(onUpdate) {
    const uri = localStorage.getItem('nip46_connect_uri');
    
    // Skip if no URI
    if (!uri) {
      console.log('[NIP-46] No URI found for auto-reconnect');
      if (onUpdate) onUpdate();
      return this._currentIdentity;
    }
    
    // Skip if already connected
    if (this._bunker) {
      console.log('[NIP-46] Already connected, returning current identity');
      if (onUpdate) onUpdate();
      return this._currentIdentity;
    }
    
    // Skip if connecting
    if (this._nip46Connecting) {
      console.log('[NIP-46] Connection already in progress');
      if (onUpdate) onUpdate();
      return this._currentIdentity;
    }
    
    try {
      console.log('[NIP-46] Attempting auto-reconnect...');
      const identity = await this._connectBunker(uri, { silent: true });
      console.log('[NIP-46] Auto-reconnect successful:', identity?.npub);
      if (onUpdate) onUpdate();
      return identity;
    } catch (error) {
      console.warn('[NIP-46] Auto-reconnect failed:', error);
      if (onUpdate) onUpdate();
      return null;
    }
  }

  /**
   * Initialize NIP-46 from URL parameters
   * @param {Function} onUpdate - Optional callback
   */
  async initFromUrl(onUpdate) {
    try {
      const params = new URLSearchParams(location.search);
      const uri = params.get('nip46') || params.get('connect');
      const npub = params.get('npub') || params.get('nprofile') || params.get('nip05');

      if (uri) {
        try {
          localStorage.setItem('nip46_connect_uri', uri);
        } catch (error) {
          console.warn('[NIP-46] Failed to store URI:', error);
        }
        
        // Clean URL to prevent re-trigger on refresh
        try {
          history.replaceState({}, '', location.pathname);
        } catch (error) {
          console.warn('[NIP-46] Failed to clean URL:', error);
        }
        
        // Connect immediately
        try {
          await this._connectBunker(uri, { silent: true });
        } catch (error) {
          console.warn('[NIP-46] URL connect failed:', error);
        }
      }

      if (npub && !this._currentIdentity) {
        // Simple identity pre-fill (real metadata to be loaded later)
        try {
          this._currentIdentity = await this._buildIdentity(npub);
          if (onUpdate) onUpdate();
        } catch (error) {
          console.warn('[NIP-46] Failed to build identity from npub:', error);
        }
      } else if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.warn('[NIP-46] URL init error:', error);
      if (onUpdate) onUpdate();
    }
  }

  /**
   * Setup global event listeners for NIP-46 events
   */
  setupGlobalEvents() {
    // Listen for auth URL events
    window.addEventListener('nip46-auth-url', (e) => {
      const url = e.detail?.url;
      if (!url) return;
      
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) {
        // Popup blocked - copy URL to clipboard
        navigator.clipboard?.writeText(url).catch(() => {});
        console.warn('[NIP-46] Popup blocked; authorization URL copied to clipboard:', url);
      }
    });
  }

  // === Private Methods ===

  /**
   * Load NIP-46 module dynamically
   * @private
   */
  async _loadNip46Module() {
    try {
      // Try to import from nostr-tools/nip46
      const nip46Mod = await import('nostr-tools/nip46');
      return nip46Mod;
    } catch (error) {
      console.error('[NIP-46] Failed to load NIP-46 module:', error);
      return null;
    }
  }

  /**
   * Ensure bunker modal exists in DOM
   * @private
   */
  _ensureBunkerModal() {
    if (document.getElementById('bunker-modal')) return;

    const dlg = document.createElement('dialog');
    dlg.id = 'bunker-modal';
    dlg.className = 'modal';
    dlg.innerHTML = `
      <form method="dialog" style="padding:16px; min-width: min(560px, 96vw)">
        <header class="modal-header">
          <h2 style="margin:0">Bunker verbinden</h2>
          <button class="btn btn-ghost" value="cancel" title="Schließen">✕</button>
        </header>
        <div class="p-16" style="display:grid; gap:10px">
          <label for="bunker-uri">NIP-46 Connect-URI (bunker://… oder nostrconnect://…)</label>
          <input id="bunker-uri" autocomplete="off" type="text" placeholder="bunker://… / nostrconnect://…" style="padding:10px;border:1px solid var(--border);border-radius:10px" />
          <div style="display:flex; gap:8px">
            <button id="bunker-paste" type="button" class="btn">Aus Zwischenablage einfügen</button>
            <span class="muted" id="bunker-hint"></span>
          </div>
        </div>
        <footer class="modal-footer">
          <div></div>
          <div>
            <button class="btn" value="cancel">Abbrechen</button>
            <button class="btn btn-primary" id="bunker-ok" value="default">Verbinden</button>
          </div>
        </footer>
      </form>
    `;
    document.body.appendChild(dlg);

    // Setup paste button
    dlg.querySelector('#bunker-paste').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          dlg.querySelector('#bunker-uri').value = text.trim();
        }
      } catch (error) {
        dlg.querySelector('#bunker-hint').textContent = 'Zwischenablage nicht verfügbar.';
      }
    });
  }

  /**
   * Get bunker URI interactively via modal
   * @private
   */
  async _getBunkerURIInteractive({ preset = '' } = {}) {
    this._ensureBunkerModal();
    const dlg = document.getElementById('bunker-modal');
    const input = dlg.querySelector('#bunker-uri');
    const hint = dlg.querySelector('#bunker-hint');
    input.value = preset || '';

    console.log('[NIP-46] Showing modal for URI input...');
    
    // Ensure modal is visible
    dlg.style.display = 'flex';
    dlg.style.position = 'fixed';
    dlg.style.top = '0';
    dlg.style.left = '0';
    dlg.style.width = '100%';
    dlg.style.height = '100%';
    dlg.style.backgroundColor = 'rgba(0,0,0,0.5)';
    dlg.style.zIndex = '1000';

    return new Promise((resolve) => {
      const onClose = (ev) => {
        console.log('[NIP-46] Modal closed with returnValue:', dlg.returnValue);
        dlg.removeEventListener('close', onClose);
        dlg.removeEventListener('cancel', onCancel);
        const value = (dlg.returnValue === 'default') ? input.value.trim() : '';
        
        // Hide modal
        dlg.style.display = 'none';
        
        resolve(value || '');
      };
      
      const onCancel = (ev) => {
        console.log('[NIP-46] Modal cancelled');
        ev.preventDefault();
        dlg.close('cancel');
      };
      
      dlg.addEventListener('close', onClose);
      dlg.addEventListener('cancel', onCancel);
      
      // Setup OK button
      const okBtn = dlg.querySelector('#bunker-ok');
      const cancelBtn = dlg.querySelector('button[value="cancel"]');
      
      if (okBtn) {
        okBtn.onclick = () => {
          dlg.returnValue = 'default';
          dlg.close();
        };
      }
      
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          dlg.returnValue = 'cancel';
          dlg.close();
        };
      }
      
      hint.textContent = preset ? 'Gespeicherte URI vorausgefüllt.' : '';
      
      // Try showModal first, fallback to manual display
      try {
        if (typeof dlg.showModal === 'function') {
          dlg.showModal();
        } else {
          dlg.style.display = 'flex';
        }
      } catch (error) {
        console.warn('[NIP-46] showModal failed, using fallback:', error);
        dlg.style.display = 'flex';
      }
    });
  }

  /**
   * Connect to bunker with URI
   * @private
   */
  async _connectBunker(connectURI, options = {}) {
    const { silent = false, openAuth = true } = options;
    
    // Prevent parallel connection attempts
    if (this._nip46Connecting) {
      throw new Error('[NIP-46] Connection already in progress');
    }
    
    this._nip46Connecting = true;
    
    try {
      // Load NIP-46 module
      const nip46Mod = await this._loadNip46Module();
      if (!nip46Mod) {
        throw new Error('[NIP-46] NIP-46 module not available. Please check your internet connection.');
      }

      const { BunkerSigner, parseBunkerInput, toBunkerURL } = nip46Mod;
      if (!BunkerSigner || !parseBunkerInput) {
        throw new Error('[NIP-46] Invalid NIP-46 module - missing required functions');
      }

      // Parse URI
      let raw = String(connectURI || '').trim();
      if (!raw) throw new Error('[NIP-46] No connect URI provided');

      let pointer = null;
      try {
        pointer = await parseBunkerInput(raw);
      } catch (error) {
        // Try with toBunkerURL fallback
        if (typeof toBunkerURL === 'function') {
          try {
            const bunkerUrl = await toBunkerURL(raw);
            pointer = await parseBunkerInput(bunkerUrl);
          } catch (fallbackError) {
            throw new Error('[NIP-46] Invalid bunker/NIP-46 URI');
          }
        } else {
          throw new Error('[NIP-46] Invalid bunker/NIP-46 URI');
        }
      }

      // Generate/load client secret
      let skHex = localStorage.getItem('nip46_client_sk_hex');
      if (!skHex) {
        // Generate new secret key
        try {
          const { generateSecretKey } = await import('nostr-tools');
          const skBytes = generateSecretKey();
          skHex = Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('nip46_client_sk_hex', skHex);
        } catch (error) {
          throw new Error('[NIP-46] Failed to generate secret key: ' + error.message);
        }
      }
      const skBytes = new Uint8Array(skHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));

      // Choose relay
      const pointerRelays = Array.isArray(pointer?.relays) ? pointer.relays.filter(Boolean) : [];
      const chosenRelay = await this._preflightRelay(pointerRelays, 1500) || 
                          pointerRelays[0] || 
                          'wss://relay.nsec.app';

      // Create bunker signer with proper relay configuration
      let authTriggered = false;
      
      // Ensure pointer has proper relay array
      const bunkerPointer = {
        ...pointer,
        relays: Array.isArray(pointer?.relays)
          ? pointer.relays.filter(r => typeof r === 'string')
          : [chosenRelay]
      };
      
      console.log('[NIP-46] Creating BunkerSigner with pointer:', bunkerPointer);
      
      const bunker = new BunkerSigner(skBytes, bunkerPointer, {
        onauth: (url) => {
          console.log('[NIP-46] Auth URL received:', url);
          authTriggered = true;
          
          try {
            localStorage.setItem('nip46_last_auth_url', url);
          } catch (error) {
            console.warn('[NIP-46] Failed to store auth URL:', error);
          }
          
          if (openAuth && !silent) {
            try {
              const w = window.open(url, '_blank', 'noopener,noreferrer');
              if (!w) {
                navigator.clipboard?.writeText(url).catch(() => {});
                console.warn('[NIP-46] Popup blocked, URL copied to clipboard');
              }
            } catch (error) {
              navigator.clipboard?.writeText(url).catch(() => {});
              console.warn('[NIP-46] Failed to open auth URL:', error);
            }
          } else {
            // Dispatch event for UI handling
            window.dispatchEvent(new CustomEvent('nip46-auth-url', { detail: { url } }));
          }
        },
        onnotice: (msg) => console.log('[NIP-46] notice:', msg),
        onerror: (err) => console.warn('[NIP-46] error:', err)
      });

      this._bunker = bunker;

      // Start connection (don't await - some builds never resolve)
      try {
        bunker.connect()
          .then(() => console.log('[NIP-46] Bunker connected'))
          .catch(error => console.warn('[NIP-46] Bunker connect error:', error));
        
        window.dispatchEvent(new CustomEvent('nip46-connect-started', { 
          detail: { relay: chosenRelay } 
        }));
      } catch (error) {
        console.warn('[NIP-46] Failed to start bunker connection:', error);
      }

      // Wait for pubkey (authorization)
      const pubkey = await this._waitForPubkey(bunker, authTriggered);
      
      // Build identity
      this._currentIdentity = await this._buildIdentity(pubkey);
      
      // Store connection
      try {
        localStorage.setItem('nip46_connected', '1');
        localStorage.setItem('nip46_connected_pubkey', pubkey);
        localStorage.setItem('nip46_connect_uri', connectURI);
      } catch (error) {
        console.warn('[NIP-46] Failed to store connection data:', error);
      }
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('nip46-connected', { 
        detail: { pubkey, relay: chosenRelay } 
      }));
      
      console.log('[NIP-46] Connection successful:', this._currentIdentity.npub);
      return this._currentIdentity;
      
    } finally {
      this._nip46Connecting = false;
    }
  }

  /**
   * Wait for pubkey from bunker with timeout
   * @private
   */
  async _waitForPubkey(bunker, authTriggered) {
    const MAX_WAIT_MS = 45000;
    const TRY_TIMEOUT_MS = 1200;
    const start = Date.now();
    let attempts = 0;
    
    console.log('[NIP-46] Waiting for pubkey authorization...');
    
    while ((Date.now() - start) < MAX_WAIT_MS) {
      attempts++;
      try {
        const pubkey = await Promise.race([
          bunker.getPublicKey(),
          new Promise(resolve => setTimeout(() => resolve('__TIMEOUT__'), TRY_TIMEOUT_MS))
        ]);
        
        if (pubkey !== '__TIMEOUT__' && /^[0-9a-f]{64}$/i.test(pubkey)) {
          console.log(`[NIP-46] Pubkey received after ${attempts} attempts:`, pubkey);
          return pubkey;
        }
        
        console.log(`[NIP-46] Pubkey attempt ${attempts} timeout`);
      } catch (error) {
        console.log(`[NIP-46] Pubkey attempt ${attempts} error:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const reason = authTriggered ? 'authorization not completed' : 'no auth_url received';
    throw new Error(`[NIP-46] Connect timeout (${reason})`);
  }

  /**
   * Preflight relay to check connectivity
   * @private
   */
  async _preflightRelay(relays, timeoutMs = 1500) {
    if (!relays || relays.length === 0) return null;
    
    for (const relay of relays) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(relay.replace('wss://', 'https://').replace('ws://', 'http://'), {
          signal: controller.signal,
          method: 'HEAD'
        });
        
        clearTimeout(timeoutId);
        if (response.ok) return relay;
      } catch (error) {
        // Try next relay
      }
    }
    
    return null;
  }

  /**
   * Sign event with timeout and retry logic
   * @private
   */
  async _signEventWithTimeout(event, timeoutMs = 8000) {
    if (!this._bunker) {
      throw new Error('[NIP-46] No bunker connection');
    }

    // Serialize sign operations
    return this._withSignLock(async () => {
      // Prepare event
      const prepared = { ...(event || {}) };
      if (!prepared.kind && event?.kind == null) {
        throw new Error('[NIP-46] signEvent: missing kind');
      }
      if (!Array.isArray(prepared.tags)) prepared.tags = Array.isArray(event?.tags) ? [...event.tags] : [];
      if (!prepared.created_at) prepared.created_at = Math.floor(Date.now() / 1000);
      if (typeof prepared.content !== 'string') prepared.content = prepared.content ? String(prepared.content) : '';
      
      // Remove id and sig - signer will add them
      delete prepared.id;
      delete prepared.sig;

      // Add pubkey if available
      try {
        const pubkey = this._currentIdentity?.pubkey || await this._bunker.getPublicKey();
        if (pubkey) prepared.pubkey = pubkey;
      } catch (error) {
        console.debug('[NIP-46] Failed to get pubkey for event:', error);
      }

      // Calculate timeout
      const maxTimeout = (prepared?.kind === 24242 || prepared?.kind === 24133) ? 45000 : 15000;
      const effectiveTimeout = Math.max(8000, Math.min(timeoutMs, maxTimeout));
      
      console.log(`[NIP-46] Signing event kind ${prepared?.kind} with timeout ${effectiveTimeout}ms`);
      
      const attemptSign = async (toMs, eventObj) => {
        return Promise.race([
          this._bunker.signEvent(eventObj),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`signEvent timeout after ${toMs}ms`)), toMs)
          )
        ]);
      };

      try {
        // First attempt with pubkey
        let result;
        try {
          result = await attemptSign(effectiveTimeout, prepared);
        } catch (error) {
          console.warn('[NIP-46] First sign attempt failed:', error.message);
          
          // Second attempt without pubkey
          const { pubkey, ...eventWithoutPubkey } = prepared;
          result = await attemptSign(effectiveTimeout, eventWithoutPubkey);
        }
        
        console.log(`[NIP-46] Event signed successfully: kind ${prepared?.kind}`);
        return result;
        
      } catch (error) {
        console.warn('[NIP-46] Sign attempts failed, trying retry with longer timeout...');
        
        // Retry with longer timeout
        const longTimeout = Math.max(effectiveTimeout * 2, 45000);
        const pubkey = this._currentIdentity?.pubkey;
        
        try {
          const { pubkey: _, ...eventWithoutPubkey } = prepared;
          const eventWithPubkey = { ...eventWithoutPubkey, pubkey };
          
          console.warn(`[NIP-46] Final retry with ${longTimeout}ms timeout`);
          const result = await attemptSign(longTimeout, eventWithPubkey);
          console.log(`[NIP-46] Retry successful: kind ${prepared?.kind}`);
          return result;
          
        } catch (retryError) {
          console.error('[NIP-46] All sign attempts failed:', retryError);
          throw new Error(`[NIP-46] Signing failed: ${retryError.message}`);
        }
      }
    });
  }

  /**
   * Execute task with sign lock to serialize operations
   * @private
   */
  async _withSignLock(taskFn) {
    const run = async () => {
      try {
        this._signQueueSize++;
        console.log(`[NIP-46] Sign lock entered, queue size: ${this._signQueueSize}`);
        return await taskFn();
      } finally {
        this._signQueueSize = Math.max(0, this._signQueueSize - 1);
        console.log(`[NIP-46] Sign lock released, queue size: ${this._signQueueSize}`);
      }
    };
    
    const promise = this._signQueue.then(run, run);
    this._signQueue = promise.catch(() => {}); // Keep chain going
    return promise;
  }

  /**
   * Build identity object from pubkey
   * @private
   */
  async _buildIdentity(pubkey) {
    if (!pubkey || typeof pubkey !== 'string') {
      throw new Error('[NIP-46] Invalid pubkey provided to _buildIdentity');
    }

    // Convert to npub (dynamic import)
    let npub;
    try {
      const { npubEncode } = await import('nostr-tools/nip19');
      npub = npubEncode(pubkey);
      console.log('[NIP-46] Successfully encoded pubkey to npub:', npub);
    } catch (error) {
      console.warn('[NIP-46] Failed to import npubEncode:', error);
      npub = pubkey.slice(0, 8) + '...'; // Fallback to truncated hex
    }

    // NIP-46 capabilities
    const capabilities = {
      canSign: true,
      canEncrypt: true, // Most bunker implementations support encryption
      canDecrypt: true
    };

    const identity = {
      pubkey,
      npub,
      provider: 'nip46',
      displayName: null, // Could be fetched from kind 0 metadata
      metadata: null,
      capabilities
    };

    console.log('[NIP-46] Built identity:', { pubkey: identity.pubkey, npub: identity.npub, provider: identity.provider });
    return identity;
  }

  /**
   * Setup UI elements (optional)
   * @param {Object} elements - UI elements
   * @param {Function} onChange - Callback for auth changes
   */
  setupUI(elements, onChange) {
    if (!elements.connectButton) {
      console.warn('[NIP-46] No connect button provided');
      return;
    }

    const { connectButton, disconnectButton, statusElement } = elements;

    // Setup connect button
    connectButton.addEventListener('click', async () => {
      try {
        statusElement.textContent = 'Connecting to bunker...';
        const identity = await this.login();
        statusElement.textContent = `Connected: ${identity.npub}`;
        if (onChange) onChange(identity);
      } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
      }
    });

    // Setup disconnect button
    if (disconnectButton) {
      disconnectButton.addEventListener('click', async () => {
        await this.logout();
        statusElement.textContent = 'Disconnected';
        if (onChange) onChange(null);
      });
    }

    console.log('[NIP-46] UI setup complete');
  }

  /**
   * Check if NIP-46 is available
   * @static
   * @returns {boolean}
   */
  static isAvailable() {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }
}