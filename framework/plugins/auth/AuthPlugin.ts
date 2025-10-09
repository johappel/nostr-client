// framework/plugins/auth/AuthPlugin.ts

import type { Identity, AuthCredentials, PluginConfig } from '../../types/index.js';

/**
 * Base interface for authentication plugins
 * All auth providers must implement this interface
 */
export abstract class AuthPlugin {
  protected config: PluginConfig;
  protected name: string;
  protected displayName: string;
  protected _initialized = false;

  constructor(config: PluginConfig = {}) {
    this.config = config;
    this.name = 'base';
    this.displayName = 'Base Auth';
  }

  /**
   * Initialize the auth plugin
   * Called once during plugin registration
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if user is currently authenticated
   * @returns Promise resolving to boolean
   */
  abstract isLoggedIn(): Promise<boolean>;

  /**
   * Get current user identity
   * @returns Promise resolving to Identity or null
   * Identity: { pubkey, npub, provider, displayName?, metadata?, capabilities }
   */
  abstract getIdentity(): Promise<Identity | null>;

  /**
   * Perform login
   * @param credentials Provider-specific credentials
   * @returns Promise resolving to Identity
   */
  abstract login(credentials: AuthCredentials): Promise<Identity>;

  /**
   * Perform logout
   * @returns Promise resolving to void
   */
  abstract logout(): Promise<void>;

  /**
   * Get signer instance for this auth provider
   * @returns Signer plugin instance
   */
  abstract getSigner(): any;

  /**
   * Optional: Setup UI elements
   * @param elements UI elements
   * @param onChange Callback for auth changes
   */
  setupUI(elements: any, onChange: (identity: Identity | null) => void): void {
    // Optional implementation
    console.log(`[${this.name}] setupUI called (no UI implementation)`);
  }

  /**
   * Check if plugin is initialized
   * @returns Boolean indicating initialization status
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Mark plugin as initialized
   * @protected
   */
  protected _markInitialized(): void {
    this._initialized = true;
  }

  /**
   * Get plugin name
   * @returns Plugin name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get display name
   * @returns Display name
   */
  getDisplayName(): string {
    return this.displayName;
  }

  /**
   * Get plugin configuration
   * @returns Plugin configuration
   */
  getConfig(): PluginConfig {
    return this.config;
  }
}