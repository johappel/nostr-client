// framework/plugins/signer/SignerPlugin.ts

import type { UnsignedEvent, SignedEvent } from '../../types/index.js';

/**
 * Base interface for signer plugins
 * All signing methods must implement this interface
 */
export abstract class SignerPlugin {
  protected type: string = 'base';

  constructor() {}

  /**
   * Get public key
   */
  abstract getPublicKey(): Promise<string>;

  /**
   * Sign an event
   */
  abstract signEvent(event: UnsignedEvent): Promise<SignedEvent>;

  /**
   * NIP-04: Encrypt message
   */
  async nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    throw new Error(`${this.type}: nip04Encrypt() not implemented`);
  }

  /**
   * NIP-04: Decrypt message
   */
  async nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    throw new Error(`${this.type}: nip04Decrypt() not implemented`);
  }

  /**
   * NIP-44: Encrypt message (modern standard)
   */
  async nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    throw new Error(`${this.type}: nip44Encrypt() not implemented`);
  }

  /**
   * NIP-44: Decrypt message (modern standard)
   */
  async nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    throw new Error(`${this.type}: nip44Decrypt() not implemented`);
  }

  /**
   * Check if encryption is supported
   */
  async supportsEncryption(): Promise<boolean> {
    return false;
  }

  /**
   * Get supported NIPs
   */
  getSupportedNips(): number[] {
    return [1]; // Basic event signing
  }

  /**
   * Get signer capabilities
   */
  getCapabilities(): {
    canSign: boolean;
    canEncrypt: boolean;
    canDecrypt: boolean;
    supportedNips: number[];
  } {
    return {
      canSign: true,
      canEncrypt: false,
      canDecrypt: false,
      supportedNips: this.getSupportedNips()
    };
  }
}