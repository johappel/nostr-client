// framework/core/SignerManager.js

import { EventBus } from './EventBus.js';

/**
 * Manages event signing across different signer types
 */
export class SignerManager {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._currentSigner = null;
    this._defaultTimeout = 10000; // 10 seconds
  }

  /**
   * Set current signer
   * @param {SignerPlugin} signer - Signer instance
   */
  setSigner(signer) {
    if (!signer) {
      throw new Error('Signer cannot be null');
    }

    this._currentSigner = signer;
    console.log(`[SignerManager] Signer set: ${signer.type}`);
    
    this._eventBus.emit('signer:changed', { type: signer.type });
  }

  /**
   * Clear current signer
   */
  clearSigner() {
    this._currentSigner = null;
    console.log('[SignerManager] Signer cleared');
    this._eventBus.emit('signer:cleared', {});
  }

  /**
   * Get current signer
   * @returns {SignerPlugin|null}
   */
  getCurrentSigner() {
    return this._currentSigner;
  }

  /**
   * Check if signer is available
   * @returns {boolean}
   */
  hasSigner() {
    return this._currentSigner !== null;
  }

  /**
   * Get public key from current signer
   * @returns {Promise<string>}
   */
  async getPublicKey() {
    this._ensureSigner();
    
    try {
      const pubkey = await this._currentSigner.getPublicKey();
      return pubkey;
    } catch (error) {
      console.error('[SignerManager] Failed to get public key:', error);
      this._eventBus.emit('signer:error', { method: 'getPublicKey', error });
      throw error;
    }
  }

  /**
   * Sign an event
   * @param {UnsignedEvent} event - Event to sign
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<SignedEvent>}
   */
  async signEvent(event, timeout = this._defaultTimeout) {
    this._ensureSigner();
    this._validateEvent(event);

    try {
      console.log(`[SignerManager] Signing event (kind ${event.kind})...`);
      
      const signedEvent = await this._withTimeout(
        this._currentSigner.signEvent(event),
        timeout,
        'Event signing timed out'
      );

      console.log(`[SignerManager] Event signed: ${signedEvent.id}`);
      
      this._eventBus.emit('signer:signed', {
        eventId: signedEvent.id,
        kind: signedEvent.kind
      });

      return signedEvent;
    } catch (error) {
      console.error('[SignerManager] Signing failed:', error);
      this._eventBus.emit('signer:error', { method: 'signEvent', error, event });
      throw error;
    }
  }

  /**
   * Sign multiple events
   * @param {UnsignedEvent[]} events - Events to sign
   * @param {number} timeout - Timeout per event
   * @returns {Promise<SignedEvent[]>}
   */
  async signEvents(events, timeout = this._defaultTimeout) {
    const signed = [];
    
    for (const event of events) {
      try {
        const signedEvent = await this.signEvent(event, timeout);
        signed.push(signedEvent);
      } catch (error) {
        console.error('[SignerManager] Failed to sign event:', error);
        // Continue with next event
      }
    }

    return signed;
  }

  /**
   * Check if signer can sign a specific event kind
   * @param {number} kind - Event kind
   * @returns {Promise<boolean>}
   */
  async canSign(kind) {
    if (!this.hasSigner()) return false;

    // Some signers may restrict certain kinds (e.g., NIP-46)
    // For now, assume all kinds are supported
    return true;
  }

  /**
   * NIP-04: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>}
   */
  async nip04Encrypt(recipientPubkey, plaintext) {
    this._ensureSigner();

    try {
      const encrypted = await this._currentSigner.nip04Encrypt(recipientPubkey, plaintext);
      
      this._eventBus.emit('signer:encrypted', { method: 'nip04', recipientPubkey });
      
      return encrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-04 encryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip04Encrypt', error });
      throw error;
    }
  }

  /**
   * NIP-04: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>}
   */
  async nip04Decrypt(senderPubkey, ciphertext) {
    this._ensureSigner();

    try {
      const decrypted = await this._currentSigner.nip04Decrypt(senderPubkey, ciphertext);
      
      this._eventBus.emit('signer:decrypted', { method: 'nip04', senderPubkey });
      
      return decrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-04 decryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip04Decrypt', error });
      throw error;
    }
  }

  /**
   * NIP-44: Encrypt message
   * @param {string} recipientPubkey - Recipient's public key
   * @param {string} plaintext - Message to encrypt
   * @returns {Promise<string>}
   */
  async nip44Encrypt(recipientPubkey, plaintext) {
    this._ensureSigner();

    try {
      const encrypted = await this._currentSigner.nip44Encrypt(recipientPubkey, plaintext);
      
      this._eventBus.emit('signer:encrypted', { method: 'nip44', recipientPubkey });
      
      return encrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-44 encryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip44Encrypt', error });
      throw error;
    }
  }

  /**
   * NIP-44: Decrypt message
   * @param {string} senderPubkey - Sender's public key
   * @param {string} ciphertext - Encrypted message
   * @returns {Promise<string>}
   */
  async nip44Decrypt(senderPubkey, ciphertext) {
    this._ensureSigner();

    try {
      const decrypted = await this._currentSigner.nip44Decrypt(senderPubkey, ciphertext);
      
      this._eventBus.emit('signer:decrypted', { method: 'nip44', senderPubkey });
      
      return decrypted;
    } catch (error) {
      console.error('[SignerManager] NIP-44 decryption failed:', error);
      this._eventBus.emit('signer:error', { method: 'nip44Decrypt', error });
      throw error;
    }
  }

  /**
   * Get signer capabilities
   * @returns {Object}
   */
  getCapabilities() {
    if (!this._currentSigner) {
      return {
        canSign: false,
        canEncrypt: false,
        canDecrypt: false,
        hasNip04: false,
        hasNip44: false
      };
    }

    return this._currentSigner.getCapabilities();
  }

  /**
   * Set default timeout for signing operations
   * @param {number} timeout - Timeout in milliseconds
   */
  setDefaultTimeout(timeout) {
    this._defaultTimeout = timeout;
    console.log(`[SignerManager] Default timeout set to ${timeout}ms`);
  }

  /**
   * Listen to signer events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Ensure signer is available
   * @private
   */
  _ensureSigner() {
    if (!this._currentSigner) {
      throw new Error('No signer available. Please authenticate first.');
    }
  }

  /**
   * Validate unsigned event
   * @private
   */
  _validateEvent(event) {
    if (!event) {
      throw new Error('Event cannot be null');
    }

    const required = ['kind', 'content', 'tags', 'created_at'];
    for (const field of required) {
      if (!(field in event)) {
        throw new Error(`Event missing required field: ${field}`);
      }
    }

    if (typeof event.kind !== 'number') {
      throw new Error('Event kind must be a number');
    }

    if (!Array.isArray(event.tags)) {
      throw new Error('Event tags must be an array');
    }

    if (typeof event.created_at !== 'number') {
      throw new Error('Event created_at must be a number');
    }
  }

  /**
   * Execute promise with timeout
   * @private
   */
  async _withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  /**
   * Get event bus for external listeners
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}