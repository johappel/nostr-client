// framework/plugins/auth/AuthPlugin.js

/**
 * Base interface for authentication plugins
 * All auth providers must implement this interface
 */
export class AuthPlugin {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.displayName = 'Base Auth';
    this._initialized = false;
  }

  /**
   * Initialize the auth plugin
   * Called once during plugin registration
   */
  async initialize() {
    throw new Error(`${this.name}: initialize() must be implemented`);
  }

  /**
   * Check if user is currently authenticated
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    throw new Error(`${this.name}: isLoggedIn() must be implemented`);
  }

  /**
   * Get current user identity
   * @returns {Promise<Identity|null>}
   * Identity: { pubkey, npub, provider, displayName?, metadata?, capabilities }
   */
  async getIdentity() {
    throw new Error(`${this.name}: getIdentity() must be implemented`);
  }

  /**
   * Perform login
   * @param {Object} credentials - Provider-specific credentials
   * @returns {Promise<Identity>}
   */
  async login(credentials = {}) {
    throw new Error(`${this.name}: login() must be implemented`);
  }

  /**
   * Perform logout
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error(`${this.name}: logout() must be implemented`);
  }

  /**
   * Get signer instance for this auth provider
   * @returns {SignerPlugin}
   */
  getSigner() {
    throw new Error(`${this.name}: getSigner() must be implemented`);
  }

  /**
   * Optional: Setup UI elements
   * @param {Object} elements - UI elements
   * @param {Function} onChange - Callback for auth changes
   */
  setupUI(elements, onChange) {
    // Optional implementation
    console.log(`[${this.name}] setupUI called (no UI implementation)`);
  }

  /**
   * Check if plugin is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Mark plugin as initialized
   * @protected
   */
  _markInitialized() {
    this._initialized = true;
  }
}

/**
 * Identity type definition
 * @typedef {Object} Identity
 * @property {string} pubkey - Hex public key
 * @property {string} npub - Bech32 npub
 * @property {string} provider - Provider name ('nip07', 'nip46', etc.)
 * @property {string} [displayName] - Display name from profile
 * @property {Object} [metadata] - NIP-01 profile metadata
 * @property {Object} capabilities - What this identity can do
 * @property {boolean} capabilities.canSign - Can sign events
 * @property {boolean} capabilities.canEncrypt - Can encrypt messages
 * @property {boolean} capabilities.canDecrypt - Can decrypt messages
 */