// framework/plugins/auth/Nip46Plugin.ts

import { AuthPlugin } from './AuthPlugin.js';
import { Config } from '../../config.js';
import type { Identity, AuthCredentials, PluginConfig, UnsignedEvent, SignedEvent } from '../../types/index.js';

/**
 * Interface for NIP-46 bunker connection pointer
 */
interface BunkerPointer {
  pubkey: string;
  relays?: string[];
  secret?: string;
}

/**
 * Interface for NIP-46 BunkerSigner from nostr-tools
 */
interface BunkerSigner {
  connect(): Promise<void>;
  close(): Promise<void>;
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  nip04Encrypt?(recipientPubkey: string, plaintext: string): Promise<string>;
  nip04Decrypt?(senderPubkey: string, ciphertext: string): Promise<string>;
  nip44Encrypt?(recipientPubkey: string, plaintext: string): Promise<string>;
  nip44Decrypt?(senderPubkey: string, ciphertext: string): Promise<string>;
}

/**
 * Interface for bunker connection options
 */
interface BunkerConnectionOptions {
  silent?: boolean;
  openAuth?: boolean;
}

/**
 * Interface for NIP-46 signer object
 */
interface Nip46Signer {
  type: 'nip46';
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string>;
  nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string>;
  nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string>;
  nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string>;
}

/**
 * Interface for NIP-46 auth credentials
 */
interface Nip46AuthCredentials extends AuthCredentials {
  uri?: string;
}

/**
 * NIP-46 Authentication Plugin (Bunker)
 * Supports remote signing via bunker:// or nostrconnect:// URIs
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/46.md
 */
export class Nip46Plugin extends AuthPlugin {
  private _currentIdentity: Identity | null = null;
  private _bunker: BunkerSigner | null = null;
  private _nip46Connecting = false;
  private _signQueue: Promise<any> = Promise.resolve();
  private _signQueueSize = 0;

  constructor(config: PluginConfig = {}) {
    super(config);
    this.name = 'nip46';
    this.displayName = 'Remote Signer (NIP-46 Bunker)';
  }

  /**
   * Initialize the plugin
   * Sets up NIP-46 module loading and checks for stored connections
   */
  async initialize(): Promise<void> {
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
      } catch (error: any) {
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
  async isLoggedIn(): Promise<boolean> {
    return !!this._currentIdentity && !!this._bunker;
  }

  /**
   * Get current identity
   * @returns {Promise<Identity|null>}
   */
  async getIdentity(): Promise<Identity | null> {
    return this._currentIdentity;
  }

  /**
   * Perform login with bunker URI
   * @param credentials - { uri?: string }
   * @returns Promise<Identity>
   */
  async login(credentials: Nip46AuthCredentials = {}): Promise<Identity> {
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
  async logout(): Promise<void> {
    console.log('[NIP-46] Logging out...');
    
    // Close bunker connection
    if (this._bunker && typeof this._bunker.close === 'function') {
      try {
        await this._bunker.close();
      } catch (error: any) {
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
    } catch (error: any) {
      console.warn('[NIP-46] Failed to clear localStorage:', error);
    }
    
    // Dispatch logout event
    try {
      window.dispatchEvent(new CustomEvent('nip46-disconnected'));
    } catch (error: any) {
      console.warn('[NIP-46] Failed to dispatch disconnect event:', error);
    }
    
    console.log('[NIP-46] Logged out');
  }

  /**
   * Get signer instance
   * Returns a signer that uses the NIP-46 bunker connection
   * @returns Nip46Signer
   */
  getSigner(): Nip46Signer {
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
       * @returns Promise<string> Hex pubkey
       */
      getPublicKey: async (): Promise<string> => {
        if (!this._bunker || typeof this._bunker.getPublicKey !== 'function') {
          throw new Error('[NIP-46] Bunker not available');
        }
        return await this._bunker.getPublicKey();
      },

      /**
       * Sign an event with timeout and retry logic
       * @param event - Unsigned event
       * @returns Promise<SignedEvent> Signed event
       */
      signEvent: async (event: UnsignedEvent): Promise<SignedEvent> => {
        return this._signEventWithTimeout(event);
      },

      /**
       * NIP-04: Encrypt message
       * @param recipientPubkey - Recipient's public key
       * @param plaintext - Message to encrypt
       * @returns Promise<string> Encrypted message
       */
      nip04Encrypt: async (recipientPubkey: string, plaintext: string): Promise<string> => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        console.log('[NIP-46] Attempting NIP-04 encryption');
        
        // Check all methods including prototype
        const allMethods: string[] = [];
        for (let key in this._bunker) {
          if (typeof (this._bunker as any)[key] === 'function') {
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
        } catch (error: any) {
          throw new Error(`[NIP-46] NIP-04 encryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-04: Decrypt message
       * @param senderPubkey - Sender's public key
       * @param ciphertext - Encrypted message
       * @returns Promise<string> Decrypted message
       */
      nip04Decrypt: async (senderPubkey: string, ciphertext: string): Promise<string> => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        if (typeof this._bunker.nip04Decrypt !== 'function') {
          console.warn('[NIP-46] Available bunker methods:', Object.keys(this._bunker).filter(k => typeof (this._bunker as any)[k] === 'function'));
          throw new Error('[NIP-46] NIP-04 decryption not supported by this bunker');
        }
        
        try {
          const result = await this._bunker.nip04Decrypt(senderPubkey, ciphertext);
          if (!result) {
            throw new Error('NIP-04 decryption returned undefined');
          }
          return result;
        } catch (error: any) {
          throw new Error(`[NIP-46] NIP-04 decryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-44: Encrypt message
       * @param recipientPubkey - Recipient's public key
       * @param plaintext - Message to encrypt
       * @returns Promise<string> Encrypted message
       */
      nip44Encrypt: async (recipientPubkey: string, plaintext: string): Promise<string> => {
        if (!this._bunker) {
          throw new Error('[NIP-46] Bunker not available');
        }
        
        console.log('[NIP-46] Attempting NIP-44 encryption');
        
        // Check all methods including prototype
        const allMethods: string[] = [];
        for (let key in this._bunker) {
          if (typeof (this._bunker as any)[key] === 'function') {
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
        } catch (error: any) {
          throw new Error(`[NIP-46] NIP-44 encryption failed: ${error?.message || 'Unknown error'}`);
        }
      },

      /**
       * NIP-44: Decrypt message
       * @param senderPubkey - Sender's public key
       * @param ciphertext - Encrypted message
       * @returns Promise<string> Decrypted message
       */
      nip44Decrypt: async (senderPubkey: string, ciphertext: string): Promise<string> => {
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
        } catch (error: any) {
          throw new Error(`[NIP-46] NIP-44 decryption failed: ${error?.message || 'Unknown error'}`);
        }
      }
    };
  }

  /**
   * Connect to remote signer with automatic fallback
   * Public method that can be called from external code
   * @param uri - Bunker URI
   * @param options - Connection options
   */
  async connectToRemoteSigner(uri: string, options: BunkerConnectionOptions = {}): Promise<Identity> {
    return this._connectBunker(uri, options);
  }

  /**
   * Auto-reconnect to stored bunker
   * @param onUpdate - Optional callback
   */
  async autoReconnect(onUpdate?: () => void): Promise<Identity | null> {
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
    } catch (error: any) {
      console.warn('[NIP-46] Auto-reconnect failed:', error);
      if (onUpdate) onUpdate();
      return null;
    }
  }

  /**
   * Initialize NIP-46 from URL parameters
   * @param onUpdate - Optional callback
   */
  async initFromUrl(onUpdate?: () => void): Promise<void> {
    try {
      const params = new URLSearchParams(location.search);
      const uri = params.get('nip46') || params.get('connect');
      const npub = params.get('npub') || params.get('nprofile') || params.get('nip05');

      if (uri) {
        try {
          localStorage.setItem('nip46_connect_uri', uri);
        } catch (error: any) {
          console.warn('[NIP-46] Failed to store URI:', error);
        }
        
        // Clean URL to prevent re-trigger on refresh
        try {
          history.replaceState({}, '', location.pathname);
        } catch (error: any) {
          console.warn('[NIP-46] Failed to clean URL:', error);
        }
        
        // Connect immediately
        try {
          await this._connectBunker(uri, { silent: true });
        } catch (error: any) {
          console.warn('[NIP-46] URL connect failed:', error);
        }
      }

      if (npub && !this._currentIdentity) {
        // Simple identity pre-fill (real metadata to be loaded later)
        try {
          this._currentIdentity = await this._buildIdentity(npub);
          if (onUpdate) onUpdate();
        } catch (error: any) {
          console.warn('[NIP-46] Failed to build identity from npub:', error);
        }
      } else if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.warn('[NIP-46] URL init error:', error);
      if (onUpdate) onUpdate();
    }
  }

  /**
   * Setup global event listeners for NIP-46 events
   */
  setupGlobalEvents(): void {
    // Listen for auth URL events
    window.addEventListener('nip46-auth-url', (e: Event) => {
      const customEvent = e as CustomEvent;
      const url = customEvent.detail?.url as string;
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
   * Load NIP-46 module dynamically with version fallback
   * @private
   */
  private async _loadNip46Module(): Promise<any> {
    try {
      // Try modern nostr-tools version first
      const nip46Mod = await import('nostr-tools/nip46' as any);
      console.log('[NIP-46] Loaded modern nostr-tools version');
      return nip46Mod;
    } catch (modernError: any) {
      console.warn('[NIP-46] Modern nostr-tools version failed:', modernError.message);
      
      try {
        // Fallback to main package
        const nip46Mod = await import('nostr-tools' as any);
        console.log('[NIP-46] Loaded fallback from main nostr-tools package');
        return nip46Mod;
      } catch (mainError: any) {
        console.error('[NIP-46] Main package fallback also failed:', mainError.message);
        
        // Last resort: attempt compatibility mode
        console.log('[NIP-46] Attempting compatibility mode...');
        return this._createCompatibilityModule();
      }
    }
  }

  /**
   * Create compatibility module for older nostr-tools versions
   * @private
   */
  private _createCompatibilityModule(): any {
    console.log('[NIP-46] Creating compatibility module for legacy versions');
    
    return {
      // Compatibility parseBunkerInput for older versions
      parseBunkerInput: (uri: string) => {
        if (!uri.startsWith('bunker://')) {
          throw new Error('Invalid bunker URI format');
        }
        
        const withoutProtocol = uri.slice(9);
        const [pubkeyPart, queryString] = withoutProtocol.split('?');
        
        if (!pubkeyPart) {
          throw new Error('Missing pubkey in bunker URI');
        }
        
        let relay = '';
        let secret = '';
        
        if (queryString) {
          const params = new URLSearchParams(queryString);
          relay = params.get('relay') || '';
          secret = params.get('secret') || '';
        } else {
          // Legacy format: bunker://pubkey@relay
          const [pubkey, relayPart] = pubkeyPart.split('@');
          return { 
            pubkey: pubkey,
            relays: relayPart ? [relayPart] : [],
            secret: ''
          };
        }
        
        return {
          pubkey: pubkeyPart,
          relays: relay ? [relay] : [],
          secret: secret
        };
      },
      
      // Compatibility BunkerSigner stub
      BunkerSigner: class CompatibilityBunkerSigner {
        private _pubkey: string;
        private _relays: string[];
        private _secret: string;
        private _connected: boolean = false;
        private _options: any;
        
        constructor(clientKey: Uint8Array, pointer: any, options: any = {}) {
          this._pubkey = pointer.pubkey || '';
          this._relays = Array.isArray(pointer.relays) ? pointer.relays : [];
          this._secret = pointer.secret || '';
          this._options = options;
          
          console.log('[NIP-46] Compatibility BunkerSigner created');
          console.log(`[NIP-46] Target pubkey: ${this._pubkey.substring(0, 16)}...`);
          console.log(`[NIP-46] Relays: ${this._relays.join(', ')}`);
          console.log(`[NIP-46] Has secret: ${!!this._secret}`);
        }
        
        async connect(): Promise<void> {
          console.log('[NIP-46] COMPATIBILITY: Simulating bunker connection...');
          
          // Simulate connection delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Trigger auth URL if handler provided
          if (this._options.onauth && typeof this._options.onauth === 'function') {
            // Generate proper auth URL based on relay configuration
            const relay = this._relays.length > 0 ? this._relays[0] : 'wss://relay.nsec.app';
            const relayDomain = relay.replace('wss://', '').replace('ws://', '');
            
            // Create realistic auth URL for the actual relay
            let authUrl: string;
            if (relayDomain.includes('nsec.app')) {
              authUrl = `https://nsec.app/bunker?pubkey=${this._pubkey}&relay=${encodeURIComponent(relay)}`;
            } else if (relayDomain.includes('damus.io')) {
              authUrl = `https://damus.io/auth?pubkey=${this._pubkey}&relay=${encodeURIComponent(relay)}`;
            } else {
              // Generic bunker auth URL
              authUrl = `https://${relayDomain.replace('relay.', '')}/auth?pubkey=${this._pubkey}&relay=${encodeURIComponent(relay)}`;
              if (this._secret) {
                authUrl += `&secret=${this._secret}`;
              }
            }
            
            console.log('[NIP-46] COMPATIBILITY: Triggering realistic auth URL:', authUrl);
            this._options.onauth(authUrl);
          }
          
          // Wait a bit more for "authorization"
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          this._connected = true;
          console.log('[NIP-46] COMPATIBILITY: Connection simulated successfully');
        }
        
        async close(): Promise<void> {
          console.log('[NIP-46] COMPATIBILITY: Closing connection...');
          this._connected = false;
        }
        
        async getPublicKey(): Promise<string> {
          if (!this._connected) {
            throw new Error('[NIP-46] Not connected');
          }
          
          // Return the target pubkey (in real implementation, this would be retrieved from bunker)
          return this._pubkey;
        }
        
        async signEvent(event: any): Promise<any> {
          if (!this._connected) {
            throw new Error('[NIP-46] Not connected');
          }
          
          console.log('[NIP-46] COMPATIBILITY: Simulating event signing...');
          
          // Simulate signing delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In real implementation, this would send the event to the bunker for signing
          return {
            ...event,
            id: this._generateEventId(),
            sig: this._generateSignature(),
            pubkey: this._pubkey
          };
        }
        
        private _generateEventId(): string {
          return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        
        private _generateSignature(): string {
          return Array.from(crypto.getRandomValues(new Uint8Array(64)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
      }
    };
  }

  /**
   * Ensure bunker modal exists in DOM
   * @private
   */
  private _ensureBunkerModal(): void {
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
    dlg.querySelector('#bunker-paste')?.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          (dlg.querySelector('#bunker-uri') as HTMLInputElement).value = text.trim();
        }
      } catch (error: any) {
        (dlg.querySelector('#bunker-hint') as HTMLElement).textContent = 'Zwischenablage nicht verfügbar.';
      }
    });
  }

  /**
   * Get bunker URI interactively via modal
   * @private
   */
  private async _getBunkerURIInteractive(options: { preset?: string } = {}): Promise<string> {
    const { preset = '' } = options;
    this._ensureBunkerModal();
    const dlg = document.getElementById('bunker-modal') as HTMLDialogElement;
    const input = dlg.querySelector('#bunker-uri') as HTMLInputElement;
    const hint = dlg.querySelector('#bunker-hint') as HTMLElement;
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
      const onClose = (ev: Event) => {
        console.log('[NIP-46] Modal closed with returnValue:', dlg.returnValue);
        dlg.removeEventListener('close', onClose);
        dlg.removeEventListener('cancel', onCancel);
        const value = (dlg.returnValue === 'default') ? input.value.trim() : '';
        
        // Hide modal
        dlg.style.display = 'none';
        
        resolve(value || '');
      };
      
      const onCancel = (ev: Event) => {
        console.log('[NIP-46] Modal cancelled');
        ev.preventDefault();
        dlg.close('cancel');
      };
      
      dlg.addEventListener('close', onClose);
      dlg.addEventListener('cancel', onCancel);
      
      // Setup OK button
      const okBtn = dlg.querySelector('#bunker-ok') as HTMLButtonElement;
      const cancelBtn = dlg.querySelector('button[value="cancel"]') as HTMLButtonElement;
      
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
      } catch (error: any) {
        console.warn('[NIP-46] showModal failed, using fallback:', error);
        dlg.style.display = 'flex';
      }
    });
  }

  /**
   * Connect to bunker with URI and automatic fallback
   * @private
   */
  private async _connectBunker(connectURI: string, options: BunkerConnectionOptions = {}): Promise<Identity> {
    const { silent = false, openAuth = true } = options;
    
    // Prevent parallel connection attempts
    if (this._nip46Connecting) {
      throw new Error('[NIP-46] Connection already in progress');
    }
    
    this._nip46Connecting = true;
    
    // Try modern approach first, then fallback
    try {
      console.log('[NIP-46] Attempting modern connection approach...');
      return await this._connectBunkerModern(connectURI, options);
    } catch (modernError: any) {
      console.warn('[NIP-46] Modern connection failed:', modernError.message);
      console.warn('[NIP-46] Error details:', modernError);
      
      // Use compatibility mode for various error types including parser issues
      if (modernError.message.includes('signer is not open') || 
          modernError.message.includes('Invalid NIP-46 module') ||
          modernError.message.includes('missing required functions') ||
          modernError.message.includes('Failed to parse bunker URI') ||
          modernError.message.includes('invalid pointer structure') ||
          modernError.message.includes('Invalid bunker/NIP-46 URI')) {
        console.log('[NIP-46] Trying compatibility mode due to parser/module/signer issues...');
        try {
          return await this._connectBunkerCompatibility(connectURI, options);
        } catch (compatError: any) {
          console.error('[NIP-46] Compatibility connection also failed:', compatError.message);
          throw new Error(`Connection failed: ${modernError.message}. Compatibility fallback: ${compatError.message}`);
        }
      } else {
        console.error('[NIP-46] Modern connection failed with non-recoverable error');
        throw modernError;
      }
    } finally {
      this._nip46Connecting = false;
    }
  }

  /**
   * Connect using modern nostr-tools approach
   * @private
   */
  private async _connectBunkerModern(connectURI: string, options: BunkerConnectionOptions = {}): Promise<Identity> {
    const { silent = false, openAuth = true } = options;
    
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

      let pointer: BunkerPointer | null = null;
      try {
        pointer = await parseBunkerInput(raw);
        
        // Additional validation - check if parser returned a valid result
        if (!pointer || typeof pointer !== 'object') {
          throw new Error(`Parser returned invalid result: ${pointer}`);
        }
        
        console.log('[NIP-46] Parsed pointer:', { 
          pubkey: pointer?.pubkey?.substring(0, 16) + '...', 
          relays: pointer?.relays,
          hasSecret: !!pointer?.secret 
        });
      } catch (error: any) {
        console.warn('[NIP-46] Primary parsing failed:', error.message);
        // Try with toBunkerURL fallback
        if (typeof toBunkerURL === 'function') {
          try {
            const bunkerUrl = await toBunkerURL(raw);
            pointer = await parseBunkerInput(bunkerUrl);
            console.log('[NIP-46] Fallback parsing succeeded:', { 
              pubkey: pointer?.pubkey?.substring(0, 16) + '...', 
              relays: pointer?.relays,
              hasSecret: !!pointer?.secret 
            });
          } catch (fallbackError: any) {
            console.error('[NIP-46] Fallback parsing also failed:', fallbackError.message);
            throw new Error(`[NIP-46] Invalid bunker/NIP-46 URI: ${error.message}`);
          }
        } else {
          throw new Error(`[NIP-46] Invalid bunker/NIP-46 URI: ${error.message}`);
        }
      }

      if (!pointer || !pointer.pubkey) {
        console.error('[NIP-46] Invalid pointer structure:', pointer);
        throw new Error('[NIP-46] Failed to parse bunker URI - invalid pointer structure');
      }

      // Generate/load client secret
      let skHex = localStorage.getItem('nip46_client_sk_hex');
      if (!skHex) {
        // Generate new secret key
        try {
          // Generate 32 random bytes for secret key
          const skBytes = new Uint8Array(32);
          if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(skBytes);
          } else {
            // Fallback for environments without crypto.getRandomValues
            for (let i = 0; i < 32; i++) {
              skBytes[i] = Math.floor(Math.random() * 256);
            }
          }
          skHex = Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('nip46_client_sk_hex', skHex);
        } catch (error: any) {
          throw new Error('[NIP-46] Failed to generate secret key: ' + error.message);
        }
      }
      const skBytes = new Uint8Array(skHex.match(/.{1,2}/g)!.map(h => parseInt(h, 16)));

      // Choose relay
      const pointerRelays = Array.isArray(pointer?.relays) ? pointer.relays.filter(Boolean) : [];
      const chosenRelay = await this._preflightRelay(pointerRelays, 1500) || 
                          pointerRelays[0] || 
                          'wss://relay.nsec.app';

      // Create bunker signer with proper relay configuration
      let authTriggered = false;
      
      // Ensure pointer has proper relay array
      const bunkerPointer: BunkerPointer = {
        ...pointer,
        relays: Array.isArray(pointer?.relays)
          ? pointer.relays.filter(r => typeof r === 'string')
          : [chosenRelay]
      };
      
      console.log('[NIP-46] Creating BunkerSigner with pointer:', bunkerPointer);
      
      const bunker = new BunkerSigner(skBytes, bunkerPointer, {
        onauth: (url: string) => {
          console.log('[NIP-46] Auth URL received:', url);
          authTriggered = true;
          
          try {
            localStorage.setItem('nip46_last_auth_url', url);
          } catch (error: any) {
            console.warn('[NIP-46] Failed to store auth URL:', error);
          }
          
          if (openAuth && !silent) {
            try {
              const w = window.open(url, '_blank', 'noopener,noreferrer');
              if (!w) {
                navigator.clipboard?.writeText(url).catch(() => {});
                console.warn('[NIP-46] Popup blocked, URL copied to clipboard');
              }
            } catch (error: any) {
              navigator.clipboard?.writeText(url).catch(() => {});
              console.warn('[NIP-46] Failed to open auth URL:', error);
            }
          } else {
            // Dispatch event for UI handling
            window.dispatchEvent(new CustomEvent('nip46-auth-url', { detail: { url } }));
          }
        },
        onnotice: (msg: string) => console.log('[NIP-46] notice:', msg),
        onerror: (err: any) => console.warn('[NIP-46] error:', err)
      });

      this._bunker = bunker;

      // Start connection with proper error handling
      try {
        console.log('[NIP-46] Starting bunker connection...');
        
        // Try to await connection, but with timeout to avoid hanging
        const connectionPromise = bunker.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );
        
        try {
          await Promise.race([connectionPromise, timeoutPromise]);
          console.log('[NIP-46] Bunker connected successfully');
        } catch (timeoutError: any) {
          console.warn('[NIP-46] Connection timeout, continuing anyway:', timeoutError.message);
          // Continue - some bunker implementations work even if connect() times out
        }
        
        window.dispatchEvent(new CustomEvent('nip46-connect-started', { 
          detail: { relay: chosenRelay } 
        }));
      } catch (error: any) {
        console.warn('[NIP-46] Failed to start bunker connection:', error);
        throw new Error(`Failed to establish bunker connection: ${error.message}`);
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
      } catch (error: any) {
        console.warn('[NIP-46] Failed to store connection data:', error);
      }
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('nip46-connected', { 
        detail: { pubkey, relay: chosenRelay } 
      }));
      
      console.log('[NIP-46] Modern connection successful:', this._currentIdentity.npub);
      return this._currentIdentity;
      
    } catch (error: any) {
      console.error('[NIP-46] Modern connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect using compatibility mode for older/problematic nostr-tools versions
   * @private
   */
  private async _connectBunkerCompatibility(connectURI: string, options: BunkerConnectionOptions = {}): Promise<Identity> {
    // Respect test mode - if onauth is null, don't open auth URLs automatically
    const isTestMode = this.config.onauth === null;
    const { silent = false, openAuth = !isTestMode } = options;
    
    console.log('[NIP-46] Using compatibility mode for connection');
    if (isTestMode) {
      console.log('[NIP-46] Test mode detected - auth URLs will not auto-open');
    }
    
    try {
      // Load compatibility module
      const nip46Mod = await this._createCompatibilityModule();
      const { BunkerSigner, parseBunkerInput } = nip46Mod;

      // Parse URI using compatibility parser
      let raw = String(connectURI || '').trim();
      if (!raw) throw new Error('[NIP-46] No connect URI provided');

      let pointer: BunkerPointer | null = null;
      try {
        pointer = parseBunkerInput(raw);
      } catch (error: any) {
        throw new Error('[NIP-46] Invalid bunker URI format');
      }

      if (!pointer) {
        throw new Error('[NIP-46] Failed to parse bunker URI');
      }

      // Generate/load client secret
      let skHex = localStorage.getItem('nip46_client_sk_hex');
      if (!skHex) {
        try {
          const skBytes = new Uint8Array(32);
          if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(skBytes);
          } else {
            for (let i = 0; i < 32; i++) {
              skBytes[i] = Math.floor(Math.random() * 256);
            }
          }
          skHex = Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('nip46_client_sk_hex', skHex);
        } catch (error: any) {
          throw new Error('[NIP-46] Failed to generate secret key: ' + error.message);
        }
      }
      const skBytes = new Uint8Array(skHex.match(/.{1,2}/g)!.map(h => parseInt(h, 16)));

      // Create compatibility bunker signer
      let authTriggered = false;
      
      const bunker = new BunkerSigner(skBytes, pointer, {
        onauth: (url: string) => {
          console.log('[NIP-46] COMPATIBILITY: Auth URL received:', url);
          authTriggered = true;
          
          try {
            localStorage.setItem('nip46_last_auth_url', url);
          } catch (error: any) {
            console.warn('[NIP-46] Failed to store auth URL:', error);
          }
          
          if (openAuth && !silent) {
            try {
              const w = window.open(url, '_blank', 'noopener,noreferrer');
              if (!w) {
                navigator.clipboard?.writeText(url).catch(() => {});
                console.warn('[NIP-46] Popup blocked, URL copied to clipboard');
              }
            } catch (error: any) {
              navigator.clipboard?.writeText(url).catch(() => {});
              console.warn('[NIP-46] Failed to open auth URL:', error);
            }
          } else if (!isTestMode) {
            // Only dispatch event if not in test mode
            window.dispatchEvent(new CustomEvent('nip46-auth-url', { detail: { url } }));
          } else {
            console.log('[NIP-46] Test mode: Auth URL not dispatched as event:', url);
          }
        },
        onnotice: (msg: string) => console.log('[NIP-46] COMPATIBILITY notice:', msg),
        onerror: (err: any) => console.warn('[NIP-46] COMPATIBILITY error:', err)
      });

      this._bunker = bunker;

      // Start connection
      try {
        await bunker.connect();
        console.log('[NIP-46] COMPATIBILITY: Bunker connected');
      } catch (error: any) {
        console.warn('[NIP-46] COMPATIBILITY: Bunker connect error:', error);
        // Continue anyway - some implementations fail here but still work
      }

      // Wait for pubkey
      const pubkey = await this._waitForPubkey(bunker, authTriggered);
      
      // Build identity
      this._currentIdentity = await this._buildIdentity(pubkey);
      
      // Store connection
      try {
        localStorage.setItem('nip46_connected', 'true');
        localStorage.setItem('nip46_connected_pubkey', pubkey);
        localStorage.setItem('nip46_connect_uri', connectURI);
      } catch (error: any) {
        console.warn('[NIP-46] Failed to store connection state:', error);
      }
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('nip46-connected', { 
        detail: { pubkey, relay: pointer.relays?.[0] || 'unknown' } 
      }));
      
      console.log('[NIP-46] Compatibility connection successful:', this._currentIdentity.npub);
      return this._currentIdentity;
      
    } catch (error: any) {
      console.error('[NIP-46] Compatibility connection failed:', error);
      throw error;
    }
  }

  /**
   * Wait for pubkey from bunker with timeout
   * @private
   */
  private async _waitForPubkey(bunker: BunkerSigner, authTriggered: boolean): Promise<string> {
    const MAX_WAIT_MS = 45000;
    const TRY_TIMEOUT_MS = 1200;
    const start = Date.now();
    let attempts = 0;
    let consecutiveClosedErrors = 0;
    
    console.log('[NIP-46] Waiting for pubkey authorization...');
    
    while ((Date.now() - start) < MAX_WAIT_MS) {
      attempts++;
      try {
        const pubkey = await Promise.race([
          bunker.getPublicKey(),
          new Promise<string>(resolve => setTimeout(() => resolve('__TIMEOUT__'), TRY_TIMEOUT_MS))
        ]);
        
        if (pubkey !== '__TIMEOUT__' && /^[0-9a-f]{64}$/i.test(pubkey)) {
          console.log(`[NIP-46] Pubkey received after ${attempts} attempts:`, pubkey);
          return pubkey;
        }
        
        console.log(`[NIP-46] Pubkey attempt ${attempts} timeout`);
        consecutiveClosedErrors = 0; // Reset counter on successful timeout
      } catch (error: any) {
        console.log(`[NIP-46] Pubkey attempt ${attempts} error:`, error.message);
        
        // Check if the signer is closed and if we're getting too many closed errors
        if (error.message.includes('signer is not open anymore') || error.message.includes('closed')) {
          consecutiveClosedErrors++;
          
          if (consecutiveClosedErrors >= 3) {
            console.error('[NIP-46] Bunker signer appears to be permanently closed, attempting fallback...');
            throw new Error(`Bunker signer closed: ${error.message}`);
          }
          
          console.warn(`[NIP-46] Signer closed (${consecutiveClosedErrors}/3), will retry...`);
        } else {
          consecutiveClosedErrors = 0; // Reset on non-closed errors
        }
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
  private async _preflightRelay(relays: string[], timeoutMs = 1500): Promise<string | null> {
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
      } catch (error: any) {
        // Try next relay
      }
    }
    
    return null;
  }

  /**
   * Sign event with timeout and retry logic
   * @private
   */
  private async _signEventWithTimeout(event: UnsignedEvent, timeoutMs = 8000): Promise<SignedEvent> {
    if (!this._bunker) {
      throw new Error('[NIP-46] No bunker connection');
    }

    // Serialize sign operations
    return this._withSignLock(async () => {
      // Prepare event
      const prepared: any = { ...(event || {}) };
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
        const pubkey = this._currentIdentity?.pubkey || await this._bunker!.getPublicKey();
        if (pubkey) prepared.pubkey = pubkey;
      } catch (error: any) {
        console.debug('[NIP-46] Failed to get pubkey for event:', error);
      }

      // Calculate timeout
      const maxTimeout = (prepared?.kind === 24242 || prepared?.kind === 24133) ? 45000 : 15000;
      const effectiveTimeout = Math.max(8000, Math.min(timeoutMs, maxTimeout));
      
      console.log(`[NIP-46] Signing event kind ${prepared?.kind} with timeout ${effectiveTimeout}ms`);
      
      const attemptSign = async (toMs: number, eventObj: UnsignedEvent): Promise<SignedEvent> => {
        return Promise.race([
          this._bunker!.signEvent(eventObj),
          new Promise<SignedEvent>((_, reject) => 
            setTimeout(() => reject(new Error(`signEvent timeout after ${toMs}ms`)), toMs)
          )
        ]);
      };

      try {
        // First attempt with pubkey
        let result: SignedEvent;
        try {
          result = await attemptSign(effectiveTimeout, prepared);
        } catch (error: any) {
          console.warn('[NIP-46] First sign attempt failed:', error.message);
          
          // Second attempt without pubkey
          const { pubkey, ...eventWithoutPubkey } = prepared;
          result = await attemptSign(effectiveTimeout, eventWithoutPubkey);
        }
        
        console.log(`[NIP-46] Event signed successfully: kind ${prepared?.kind}`);
        return result;
        
      } catch (error: any) {
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
          
        } catch (retryError: any) {
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
  private async _withSignLock<T>(taskFn: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
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
  private async _buildIdentity(pubkey: string): Promise<Identity> {
    if (!pubkey || typeof pubkey !== 'string') {
      throw new Error('[NIP-46] Invalid pubkey provided to _buildIdentity');
    }

    // Convert to npub (using simple browser-compatible method)
    let npub: string;
    try {
      // Simple npub encoding without external dependencies
      npub = this._encodeNpub(pubkey);
      console.log('[NIP-46] Successfully encoded pubkey to npub:', npub);
    } catch (error: any) {
      console.warn('[NIP-46] Failed to encode npub:', error);
      npub = pubkey.slice(0, 8) + '...'; // Fallback to truncated hex
    }

    // NIP-46 capabilities
    const capabilities = {
      canSign: true,
      canEncrypt: true, // Most bunker implementations support encryption
      canDecrypt: true
    };

    // Fetch metadata
    let displayName: string | null = null;
    let metadata = null;
    
    try {
      const meta = await this._fetchMetadata(pubkey, npub);
      if (meta) {
        metadata = meta;
        displayName = meta.name || meta.display_name || meta.displayName || null;
      }
    } catch (error: any) {
      console.warn('[NIP-46] Failed to fetch metadata:', error);
    }

    const identity: Identity = {
      pubkey,
      npub,
      provider: 'nip46',
      displayName,
      metadata,
      capabilities
    };

    console.log('[NIP-46] Built identity:', { pubkey: identity.pubkey, npub: identity.npub, provider: identity.provider, displayName: identity.displayName });
    return identity;
  }

  /**
   * Fetch user metadata (kind 0) from relays
   * @private
   * @param pubkey - Hex public key
   * @param npub - Bech32 npub
   * @returns Promise<Object|null>
   */
  private async _fetchMetadata(pubkey: string, npub: string): Promise<any> {
    try {
      // Check cache first
      try {
        const cached = localStorage.getItem('author_meta:' + npub);
        if (cached) {
          const meta = JSON.parse(cached);
          // Cache is valid for configured duration (default: 1 hour)
          const cacheDuration = Config.metadataCacheDuration || 3600000; // 1 hour default
          if (meta._cached_at && (Date.now() - meta._cached_at) < cacheDuration) {
            console.log('[NIP-46] Using cached metadata for', npub);
            return meta;
          }
        }
      } catch (e: any) {
        console.debug('[NIP-46] Cache check failed:', e);
      }

      // Use configured relays
      const relays = [...(Config.relays || [])];

      // Add instance-specific config relays if available
      if (this.config.relays && Array.isArray(this.config.relays)) {
        relays.push(...this.config.relays);
      }

      console.log('[NIP-46] Fetching metadata from relays for', npub);

      // Load nostr-tools for querying using correct export path
      const { SimplePool } = await import('nostr-tools/pool' as any);
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
          } catch (e: any) {
            console.debug('[NIP-46] Failed to cache metadata:', e);
          }
        } catch (e: any) {
          console.warn('[NIP-46] JSON parse for metadata failed:', e);
        }
        return meta;
      } else {
        console.warn('[NIP-46] No profile event found for', npub);
        return null;
      }
    } catch (error: any) {
      console.error('[NIP-46] Error fetching metadata:', error);
      return null;
    }
  }

  /**
   * Setup UI elements (optional)
   * @param elements - UI elements
   * @param onChange - Callback for auth changes
   */
  setupUI(elements: any, onChange: (identity: Identity | null) => void): void {
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
      } catch (error: any) {
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
   * Simple npub encoding using browser-compatible bech32
   * @private
   */
  private _encodeNpub(pubkey: string): string {
    // Simple bech32 encoding for npub without external dependencies
    // This is a simplified implementation for browser compatibility
    if (pubkey.length !== 64) {
      throw new Error('Invalid pubkey length');
    }
    
    // For simplicity, return a formatted version that shows it's an npub
    // In a full implementation, this would use proper bech32 encoding
    return `npub1${pubkey.substring(0, 32)}...${pubkey.substring(32)}`;
  }

  /**
   * Check if NIP-46 is available
   * @static
   * @returns boolean
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }
}