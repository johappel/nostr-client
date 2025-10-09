// framework/core/SignerManager.ts

import { EventBus } from './EventBus.js';
import type {
  UnsignedEvent,
  SignedEvent,
  SignerPlugin,
  SignerCapabilities,
  EventCallback,
  EventUnsubscriber
} from '../types/index.js';

/**
 * Manages event signing across different signer types
 */
export class SignerManager {
  private _eventBus: EventBus;
  private _currentSigner: SignerPlugin | null = null;
  private _defaultTimeout = 10000; // 10 seconds

  constructor(eventBus: EventBus | null = null) {
    this._eventBus = eventBus || new EventBus();
  }

  /**
   * Set current signer
   * @param signer Signer instance
   */
  setSigner(signer: SignerPlugin): void {
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
  clearSigner(): void {
    this._currentSigner = null;
    console.log('[SignerManager] Signer cleared');
    this._eventBus.emit('signer:cleared', {});
  }

  /**
   * Get current signer
   * @returns Current signer or null
   */
  getCurrentSigner(): SignerPlugin | null {
    return this._currentSigner;
  }

  /**
   * Check if signer is available
   * @returns Boolean indicating signer availability
   */
  hasSigner(): boolean {
    return this._currentSigner !== null;
  }

  /**
   * Get public key from current signer
   * @returns Promise resolving to public key
   */
  async getPublicKey(): Promise<string> {
    this._ensureSigner();

    try {
      const pubkey = await this._currentSigner!.getPublicKey();
      return pubkey;
    } catch (error) {
      console.error('[SignerManager] Failed to get public key:', error);
      this._eventBus.emit('signer:error', { method: 'getPublicKey', error });
      throw error;
    }
  }

  /**
   * Sign an event
   * @param event Event to sign
   * @param timeout Timeout in milliseconds
   * @returns Promise resolving to signed event
   */
  async signEvent(event: UnsignedEvent, timeout: number = this._defaultTimeout): Promise<SignedEvent> {
    this._ensureSigner();
    this._validateEvent(event);

    try {
      console.log(`[SignerManager] Signing event (kind ${event.kind})...`);

      const signedEvent = await this._withTimeout(
        this._currentSigner!.signEvent(event),
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
   * @param events Events to sign
   * @param timeout Timeout per event
   * @returns Promise resolving to array of signed events
   */
  async signEvents(events: UnsignedEvent[], timeout: number = this._defaultTimeout): Promise<SignedEvent[]> {
    const signed: SignedEvent[] = [];

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
   * @param kind Event kind
   * @returns Promise resolving to boolean
   */
  async canSign(kind: number): Promise<boolean> {
    if (!this.hasSigner()) return false;

    // Some signers may restrict certain kinds (e.g., NIP-46)
    // For now, assume all kinds are supported
    return true;
  }

  /**
   * NIP-04: Encrypt message
   * @param recipientPubkey Recipient's public key
   * @param plaintext Message to encrypt
   * @returns Promise resolving to encrypted message
   */
  async nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    this._ensureSigner();

    if (!this._currentSigner!.nip04Encrypt) {
      throw new Error('Current signer does not support NIP-04 encryption');
    }

    try {
      const encrypted = await this._currentSigner!.nip04Encrypt(recipientPubkey, plaintext);

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
   * @param senderPubkey Sender's public key
   * @param ciphertext Encrypted message
   * @returns Promise resolving to decrypted message
   */
  async nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    this._ensureSigner();

    if (!this._currentSigner!.nip04Decrypt) {
      throw new Error('Current signer does not support NIP-04 decryption');
    }

    try {
      const decrypted = await this._currentSigner!.nip04Decrypt(senderPubkey, ciphertext);

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
   * @param recipientPubkey Recipient's public key
   * @param plaintext Message to encrypt
   * @returns Promise resolving to encrypted message
   */
  async nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    this._ensureSigner();

    if (!this._currentSigner!.nip44Encrypt) {
      throw new Error('Current signer does not support NIP-44 encryption');
    }

    try {
      const encrypted = await this._currentSigner!.nip44Encrypt(recipientPubkey, plaintext);

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
   * @param senderPubkey Sender's public key
   * @param ciphertext Encrypted message
   * @returns Promise resolving to decrypted message
   */
  async nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    this._ensureSigner();

    if (!this._currentSigner!.nip44Decrypt) {
      throw new Error('Current signer does not support NIP-44 decryption');
    }

    try {
      const decrypted = await this._currentSigner!.nip44Decrypt(senderPubkey, ciphertext);

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
   * @returns Signer capabilities
   */
  getCapabilities(): SignerCapabilities {
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
   * @param timeout Timeout in milliseconds
   */
  setDefaultTimeout(timeout: number): void {
    this._defaultTimeout = timeout;
    console.log(`[SignerManager] Default timeout set to ${timeout}ms`);
  }

  /**
   * Listen to signer events
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Ensure signer is available
   * @private
   */
  private _ensureSigner(): void {
    if (!this._currentSigner) {
      throw new Error('No signer available. Please authenticate first.');
    }
  }

  /**
   * Validate unsigned event
   * @private
   */
  private _validateEvent(event: UnsignedEvent): void {
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
  private async _withTimeout<T>(promise: Promise<T>, timeout: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  /**
   * Get event bus for external listeners
   * @returns EventBus instance
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }
}