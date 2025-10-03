// framework/index.js

import { EventBus } from './core/EventBus.js';
import { IdentityManager } from './core/IdentityManager.js';
import { SignerManager } from './core/SignerManager.js';
import { TemplateEngine } from './core/TemplateEngine.js';
import { EventManager } from './core/EventManager.js';
import { RelayManager } from './core/RelayManager.js';
import { StorageManager } from './core/StorageManager.js';
import { registerStandardTemplates } from './templates/index.js';

/**
 * Main Nostr Framework class
 * Orchestrates all subsystems
 */
export class NostrFramework {
  constructor(config = {}) {
    console.log('[NostrFramework] Initializing...');

    // Shared event bus
    this._eventBus = new EventBus();
    if (config.debug) {
      this._eventBus.setDebugMode(true);
    }

    // Initialize managers
    this.identity = new IdentityManager(this._eventBus);
    this.signer = new SignerManager(this._eventBus);
    this.templates = new TemplateEngine(this._eventBus);
    this.relay = new RelayManager(this._eventBus, {
      relays: config.relays || []
    });
    this.storage = new StorageManager(this._eventBus);
    this.events = new EventManager({
      eventBus: this._eventBus,
      templateEngine: this.templates,
      signerManager: this.signer,
      relayManager: this.relay
    });

    this._config = config;
    this._initialized = false;
  }

  /**
   * Initialize the framework
   */
  async initialize() {
    if (this._initialized) {
      console.warn('[NostrFramework] Already initialized');
      return;
    }

    console.log('[NostrFramework] Starting initialization...');

    try {
      // Initialize relay manager
      await this.relay.initialize();

      // Initialize identity manager
      await this.identity.initialize();

      // Register standard templates
      if (this._config.standardTemplates !== false) {
        await registerStandardTemplates(this.templates);
      }

      // Initialize storage if configured
      if (this._config.storage) {
        await this.storage.initialize(this._config.storage);
        this.storage.setRelayManager(this.relay);
      }

      // Set up identity -> signer connection
      this.identity.on('identity:changed', (identity) => {
        if (identity) {
          const plugin = this.identity.getCurrentPlugin();
          if (plugin) {
            const signer = plugin.getSigner();
            this.signer.setSigner(signer);
            console.log('[NostrFramework] Signer updated from identity');
          }
        } else {
          this.signer.clearSigner();
          console.log('[NostrFramework] Signer cleared');
        }
      });

      this._initialized = true;
      console.log('[NostrFramework] Initialization complete');
      this._eventBus.emit('framework:initialized', {});
    } catch (error) {
      console.error('[NostrFramework] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if framework is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Destroy framework and cleanup
   */
  async destroy() {
    console.log('[NostrFramework] Destroying...');

    this.relay.destroy();
    this.relay.closeAllSubscriptions();
    
    if (this.storage._syncInterval) {
      this.storage.setAutoSync(false);
    }

    await this.identity.logout().catch(() => {});

    this._initialized = false;
    this._eventBus.emit('framework:destroyed', {});
    
    console.log('[NostrFramework] Destroyed');
  }

  /**
   * Listen to framework events
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}

// Export all core classes and plugins
export { EventBus } from './core/EventBus.js';
export { IdentityManager } from './core/IdentityManager.js';
export { SignerManager } from './core/SignerManager.js';
export { TemplateEngine } from './core/TemplateEngine.js';
export { EventManager } from './core/EventManager.js';
export { RelayManager } from './core/RelayManager.js';
export { StorageManager } from './core/StorageManager.js';

// Export plugins
export { AuthPlugin } from './plugins/auth/AuthPlugin.js';
export { SignerPlugin } from './plugins/signer/SignerPlugin.js';
export { StoragePlugin } from './plugins/storage/StoragePlugin.js';
export { LocalStoragePlugin } from './plugins/storage/LocalStoragePlugin.js';
export { SQLitePlugin } from './plugins/storage/SQLitePlugin.js';
export { SQLiteFilePlugin } from './plugins/storage/SQLiteFilePlugin.js';

// Export templates
export * from './templates/index.js';