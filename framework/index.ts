// framework/index.ts

import { EventBus } from './core/EventBus.js';
import { IdentityManager } from './core/IdentityManager.js';
import { TemplateEngine } from './core/TemplateEngine.js';
import { RelayManager } from './core/RelayManager.js';
import { StorageManager } from './core/StorageManager.js';
import { EventManager } from './core/EventManager.js';
import { SignerManager } from './core/SignerManager.js';
import { Config } from './config.js';
// import { registerStandardTemplates } from './templates/index.js';
import type { FrameworkConfig } from './types/index.js';

/**
 * Main Nostr Framework class
 * Orchestrates all subsystems
 */
export class NostrFramework {
  private _eventBus: EventBus;
  private _config: FrameworkConfig;
  private _initialized = false;

  // Subsystem managers
  public identity: IdentityManager;
  public templates: TemplateEngine;
  public relay: RelayManager;
  public storage: StorageManager;
  public events: EventManager;
  public signer: SignerManager;

  constructor(config: FrameworkConfig = {}) {
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
  }

  /**
   * Initialize the framework
   */
  async initialize(): Promise<void> {
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
        // TODO: Convert templates/index.js to TypeScript
        console.log('[NostrFramework] Standard templates registration skipped - module needs TypeScript conversion');
      }

      // Initialize storage if configured
      if (this._config.storage) {
        // TODO: Convert storage plugins to TypeScript and create proper plugin instance
        console.log('[NostrFramework] Storage initialization skipped - plugins need TypeScript conversion');
        // await this.storage.initialize(this._config.storage);
        // this.storage.setRelayManager(this.relay);
      }

      // Set up identity -> signer connection
      this.identity.on('identity:changed', (identity: any) => {
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
   * @returns Boolean indicating initialization status
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Destroy framework and cleanup
   */
  async destroy(): Promise<void> {
    console.log('[NostrFramework] Destroying...');

    this.relay.destroy();
    this.relay.closeAllSubscriptions();

    // TODO: Properly handle storage cleanup when storage plugins are converted to TypeScript
    // if (this.storage._syncInterval) {
    //   this.storage.setAutoSync(false);
    // }

    await this.identity.logout().catch(() => {});

    this._initialized = false;
    this._eventBus.emit('framework:destroyed', {});

    console.log('[NostrFramework] Destroyed');
  }

  /**
   * Listen to framework events
   */
  on(event: string, callback: (data: any) => void) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns EventBus instance
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }
}

// All core modules are now properly imported at the top

// Export all core classes and plugins
export { EventBus } from './core/EventBus.js';
export { IdentityManager } from './core/IdentityManager.js';
export { TemplateEngine } from './core/TemplateEngine.js';
export { RelayManager } from './core/RelayManager.js';
export { StorageManager } from './core/StorageManager.js';
export { EventManager } from './core/EventManager.js';
export { SignerManager } from './core/SignerManager.js';
export { Config } from './config.js';

// Export plugins
export { AuthPlugin } from './plugins/auth/AuthPlugin.js';

// Export templates
export { EventTemplate } from './templates/EventTemplate.js';
// TODO: Convert templates/index.js to TypeScript
// export * from './templates/index.js';

// Default export
export default NostrFramework;