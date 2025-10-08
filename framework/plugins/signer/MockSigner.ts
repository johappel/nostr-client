// framework/plugins/signer/MockSigner.ts

import { SignerPlugin } from './SignerPlugin.js';
import type { UnsignedEvent, SignedEvent } from '../../types/index.js';

/**
 * Mock signer for testing
 * Does NOT use real cryptography
 */
export class MockSigner extends SignerPlugin {
  private _pubkey: string;
  private _counter: number = 0;

  constructor(pubkey: string = 'mock-pubkey-123') {
    super();
    this.type = 'mock';
    this._pubkey = pubkey;
  }

  async getPublicKey(): Promise<string> {
    return this._pubkey;
  }

  async signEvent(event: UnsignedEvent): Promise<SignedEvent> {
    // Generate fake ID and signature with counter for uniqueness
    this._counter++;
    const uniqueId = `mock-event-id-${Date.now()}-${this._counter}`;
    const uniqueSig = `mock-signature-${Date.now()}-${this._counter}`;

    return {
      id: uniqueId,
      pubkey: this._pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: uniqueSig
    };
  }

  async nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    // Fake encryption (base64 encoding)
    return btoa(plaintext);
  }

  async nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    // Fake decryption (base64 decoding)
    return atob(ciphertext);
  }

  async nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    // Fake NIP-44 encryption
    return btoa('nip44:' + plaintext);
  }

  async nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    // Fake NIP-44 decryption
    const decoded = atob(ciphertext);
    return decoded.replace('nip44:', '');
  }

  async supportsEncryption(): Promise<boolean> {
    return true; // Mock signer supports "fake" encryption
  }

  getSupportedNips(): number[] {
    return [1, 4, 44]; // Basic events, NIP-04, NIP-44
  }

  getCapabilities() {
    return {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true,
      supportedNips: this.getSupportedNips()
    };
  }
}