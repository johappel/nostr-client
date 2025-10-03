// framework/plugins/signer/SignerPlugin.js

/**
 * Base interface for signer plugins
 * All signing methods must implement this interface
 */
export class SignerPlugin {
  constructor() {
    this.type = 'base';
  }

  /**
   * Get public key
   * @returns {Promise<string>} Hex public key
   */
  async getPublicKey() {
    throw new Error(`${this.type}: getPublicKey() must be implemented`);
  }

  /**
   * Sign an event
   * @param {UnsignedEvent} event - Event to sign
   * @returns {Promise<SignedEvent>} Signed event
   */
  async signEvent(event) {
    throw new Error(`${this.type}: signEvent() must be implemented`);
  }

  /**
   * NIP-04: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>} Encrypted message
   */
  async nip04Encrypt(recipientPubkey, plaintext) {
    throw new Error(`${this.type}: nip04Encrypt() not implemented`);
  }

  /**
   * NIP-04: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>} Decrypted message
   */
  async nip04Decrypt(senderPubkey, ciphertext) {
    throw new Error(`${this.type}: nip04Decrypt() not implemented`);
  }

  /**
   * NIP-44: Encrypt message (modern standard)
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>} Encrypted message
   */
  async nip44Encrypt(recipientPubkey, plaintext) {
    throw new Error(`${this.type}: nip44Encrypt() not implemented`);
  }

  /**
   * NIP-44: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>} Decrypted message
   */
  async nip44Decrypt(senderPubkey, ciphertext) {
    throw new Error(`${this.type}: nip44Decrypt() not implemented`);
  }

  /**
   * Check capabilities
   * @returns {Object} Capability flags
   */
  getCapabilities() {
    return {
      canSign: true,
      canEncrypt: false,
      canDecrypt: false,
      hasNip04: false,
      hasNip44: false
    };
  }
}

/**
 * Unsigned event type
 * @typedef {Object} UnsignedEvent
 * @property {number} kind - Event kind
 * @property {string} content - Event content
 * @property {Array<string[]>} tags - Event tags
 * @property {number} created_at - Unix timestamp
 */

/**
 * Signed event type
 * @typedef {Object} SignedEvent
 * @property {string} id - Event ID (hash)
 * @property {string} pubkey - Author's public key
 * @property {number} created_at - Unix timestamp
 * @property {number} kind - Event kind
 * @property {Array<string[]>} tags - Event tags
 * @property {string} content - Event content
 * @property {string} sig - Signature
 */