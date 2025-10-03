// framework/plugins/signer/MockSigner.js

import { SignerPlugin } from './SignerPlugin.js';

/**
 * Mock signer for testing
 * Does NOT use real cryptography
 */
export class MockSigner extends SignerPlugin {
  constructor(pubkey = 'mock-pubkey-123') {
    super();
    this.type = 'mock';
    this._pubkey = pubkey;
  }

  async getPublicKey() {
    return this._pubkey;
  }

  async signEvent(event) {
    // Generate fake ID and signature
    const eventData = JSON.stringify([
      0,
      this._pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);

    return {
      id: 'mock-event-id-' + Date.now(),
      pubkey: this._pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: 'mock-signature-' + Date.now()
    };
  }

  async nip04Encrypt(recipientPubkey, plaintext) {
    // Fake encryption (base64 encoding)
    return btoa(plaintext);
  }

  async nip04Decrypt(senderPubkey, ciphertext) {
    // Fake decryption (base64 decoding)
    return atob(ciphertext);
  }

  async nip44Encrypt(recipientPubkey, plaintext) {
    // Fake NIP-44 encryption
    return btoa('nip44:' + plaintext);
  }

  async nip44Decrypt(senderPubkey, ciphertext) {
    // Fake NIP-44 decryption
    return atob(ciphertext).replace('nip44:', '');
  }

  getCapabilities() {
    return {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true,
      hasNip04: true,
      hasNip44: true
    };
  }
}