# SignerManager API-Referenz

Der SignerManager verwaltet Event-Signierung und Verschlüsselung über verschiedene Signer-Typen. Er unterstützt NIP-07, NIP-46, lokale Keys und benutzerdefinierte Signer-Lösungen.

## Import

```javascript
import { SignerManager } from './framework/core/SignerManager.js';
```

## Konstruktor

```javascript
const signerManager = new SignerManager(eventBus);
```

**Parameter:**
- `eventBus` (EventBus, optional): EventBus-Instanz für die Kommunikation. Wenn nicht angegeben, wird eine neue erstellt.

**Eigenschaften:**
- `_eventBus` (EventBus): EventBus-Instanz
- `_currentSigner` (SignerPlugin|null): Aktueller Signer
- `_defaultTimeout` (number): Standard-Timeout für Operationen

## Methoden

### setSigner(signer)

Setzt den aktuellen Signer.

**Parameter:**
- `signer` (SignerPlugin): Signer-Instanz

**Beispiel:**
```javascript
import { MockSigner } from './framework/plugins/signer/MockSigner.js';

const mockSigner = new MockSigner();
signerManager.setSigner(mockSigner);
```

### clearSigner()

Entfernt den aktuellen Signer.

**Beispiel:**
```javascript
signerManager.clearSigner();
console.log('Signer cleared');
```

### getCurrentSigner()

Gibt den aktuellen Signer zurück.

**Rückgabewert:**
- SignerPlugin|null: Aktueller Signer oder null

**Beispiel:**
```javascript
const signer = signerManager.getCurrentSigner();
if (signer) {
  console.log('Current signer type:', signer.type);
}
```

### hasSigner()

Prüft, ob ein Signer verfügbar ist.

**Rückgabewert:**
- boolean: true wenn Signer verfügbar, false sonst

**Beispiel:**
```javascript
if (signerManager.hasSigner()) {
  const signed = await signerManager.signEvent(event);
} else {
  console.error('No signer available');
}
```

### getPublicKey()

Gibt den Public Key des aktuellen Signers zurück.

**Rückgabewert:**
- Promise<string>: Hex Public Key

**Beispiel:**
```javascript
try {
  const pubkey = await signerManager.getPublicKey();
  console.log('Public key:', pubkey);
} catch (error) {
  console.error('Failed to get public key:', error);
}
```

### signEvent(event)

Signiert ein Event mit dem aktuellen Signer.

**Parameter:**
- `event` (UnsignedEvent): Zu signierendes Event
- `timeout` (number, optional): Timeout in Millisekunden

**Rückgabewert:**
- Promise<SignedEvent>: Signiertes Event

**Beispiel:**
```javascript
const unsignedEvent = {
  kind: 1,
  content: 'Hello Nostr!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
};

try {
  const signed = await signerManager.signEvent(unsignedEvent);
  console.log('Signed event:', signed.id);
} catch (error) {
  console.error('Signing failed:', error);
}
```

### nip04Encrypt(recipientPubkey, plaintext)

Verschlüsselt eine Nachricht mit NIP-04.

**Parameter:**
- `recipientPubkey` (string): Public Key des Empfängers
- `plaintext` (string): Zu verschlüsselnder Text

**Rückgabewert:**
- Promise<string>: Verschlüsselter Text

**Beispiel:**
```javascript
try {
  const encrypted = await signerManager.nip04Encrypt(
    'recipient-pubkey-hex',
    'Secret message'
  );
  console.log('Encrypted:', encrypted);
} catch (error) {
  console.error('Encryption failed:', error);
}
```

### nip04Decrypt(senderPubkey, ciphertext)

Entschlüsselt eine Nachricht mit NIP-04.

**Parameter:**
- `senderPubkey` (string): Public Key des Senders
- `ciphertext` (string): Verschlüsselter Text

**Rückgabewert:**
- Promise<string): Entschlüsselter Text

**Beispiel:**
```javascript
try {
  const decrypted = await signerManager.nip04Decrypt(
    'sender-pubkey-hex',
    'encrypted-message'
  );
  console.log('Decrypted:', decrypted);
} catch (error) {
  console.error('Decryption failed:', error);
}
```

### nip44Encrypt(recipientPubkey, plaintext)

Verschlüsselt eine Nachricht mit NIP-44 (moderner Standard).

**Parameter:**
- `recipientPubkey` (string): Public Key des Empfängers
- `plaintext` (string): Zu verschlüsselnder Text

**Rückgabewert:**
- Promise<string>: Verschlüsselter Text

**Beispiel:**
```javascript
try {
  const encrypted = await signerManager.nip44Encrypt(
    'recipient-pubkey-hex',
    'Secret message'
  );
  console.log('NIP-44 encrypted:', encrypted);
} catch (error) {
  console.error('NIP-44 encryption failed:', error);
}
```

### nip44Decrypt(senderPubkey, ciphertext)

Entschlüsselt eine Nachricht mit NIP-44.

**Parameter:**
- `senderPubkey` (string): Public Key des Senders
- `ciphertext` (string): Verschlüsselter Text

**Rückgabewert:**
- Promise<string>: Entschlüsselter Text

**Beispiel:**
```javascript
try {
  const decrypted = await signerManager.nip44Decrypt(
    'sender-pubkey-hex',
    'nip44-encrypted-message'
  );
  console.log('NIP-44 decrypted:', decrypted);
} catch (error) {
  console.error('NIP-44 decryption failed:', error);
}
```

### getCapabilities()

Gibt die Fähigkeiten des aktuellen Signers zurück.

**Rückgabewert:**
- Object: Fähigkeiten des Signers

**Beispiel:**
```javascript
const capabilities = signerManager.getCapabilities();
console.log('Capabilities:', capabilities);
// Output: {
//   canSign: true,
//   canEncrypt: true,
//   canDecrypt: true,
//   hasNip04: true,
//   hasNip44: true
// }
```

### on(event, callback)

Registriert einen Event-Listener für Signer-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = signerManager.on('signer:signed', (data) => {
  console.log('Event signed:', data.event.id);
});
```

## Events

Der SignerManager löst folgende Events aus:

### signer:changed

Wird ausgelöst, wenn der Signer geändert wird.

**Daten:**
```javascript
{
  type: string
}
```

### signer:cleared

Wird ausgelöst, wenn der Signer entfernt wird.

**Daten:**
```javascript
{}
```

### signer:signed

Wird ausgelöst, wenn ein Event signiert wurde.

**Daten:**
```javascript
{
  event: SignedEvent
}
```

### signer:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  method: string,
  error: Error
}
```

## Beispiele

### Basic Setup

```javascript
import { SignerManager } from './framework/core/SignerManager.js';
import { MockSigner } from './framework/plugins/signer/MockSigner.js';

const signerManager = new SignerManager();
const mockSigner = new MockSigner();

signerManager.setSigner(mockSigner);
console.log('Signer set:', mockSigner.type);
```

### Event Signing

```javascript
// Unsigniertes Event erstellen
const unsignedEvent = {
  kind: 1,
  content: 'Hello from SignerManager!',
  tags: [['t', 'test']],
  created_at: Math.floor(Date.now() / 1000)
};

// Event signieren
try {
  const signed = await signerManager.signEvent(unsignedEvent);
  console.log('Event signed:', signed.id);
  console.log('Signature:', signed.sig);
} catch (error) {
  console.error('Signing failed:', error);
}
```

### Encryption/Decryption

```javascript
// NIP-04 Verschlüsselung
try {
  const recipientPubkey = 'recipient-pubkey-hex';
  const message = 'Secret NIP-04 message';

  // Verschlüsseln
  const encrypted = await signerManager.nip04Encrypt(recipientPubkey, message);
  console.log('NIP-04 encrypted:', encrypted);

  // Entschlüsseln
  const decrypted = await signerManager.nip04Decrypt(recipientPubkey, encrypted);
  console.log('NIP-04 decrypted:', decrypted);
} catch (error) {
  console.error('NIP-04 operation failed:', error);
}

// NIP-44 Verschlüsselung (bevorzugt)
try {
  const recipientPubkey = 'recipient-pubkey-hex';
  const message = 'Secret NIP-44 message';

  // Verschlüsseln
  const encrypted = await signerManager.nip44Encrypt(recipientPubkey, message);
  console.log('NIP-44 encrypted:', encrypted);

  // Entschlüsseln
  const decrypted = await signerManager.nip44Decrypt(recipientPubkey, encrypted);
  console.log('NIP-44 decrypted:', decrypted);
} catch (error) {
  console.error('NIP-44 operation failed:', error);
}
```

### Capabilities Check

```javascript
const capabilities = signerManager.getCapabilities();

console.log('Signer capabilities:');
console.log('- Can sign:', capabilities.canSign);
console.log('- Can encrypt:', capabilities.canEncrypt);
console.log('- Can decrypt:', capabilities.canDecrypt);
console.log('- Has NIP-04:', capabilities.hasNip04);
console.log('- Has NIP-44:', capabilities.hasNip44);

// Vor Operationen prüfen
if (capabilities.canSign) {
  const signed = await signerManager.signEvent(event);
} else {
  console.error('Signer cannot sign events');
}

if (capabilities.hasNip44) {
  const encrypted = await signerManager.nip44Encrypt(pubkey, message);
} else {
  console.log('Using NIP-04 encryption');
  const encrypted = await signerManager.nip04Encrypt(pubkey, message);
}
```

### Event Handling

```javascript
// Signer-Änderungen überwachen
signerManager.on('signer:changed', ({ type }) => {
  console.log(`Signer changed to: ${type}`);
  
  // UI aktualisieren
  updateSignerStatus(type);
});

// Signierte Events überwachen
signerManager.on('signer:signed', ({ event }) => {
  console.log(`Event signed: ${event.id}`);
  
  // Event zu Queue hinzufügen
  addToPublishQueue(event);
});

// Fehler überwachen
signerManager.on('signer:error', ({ method, error }) => {
  console.error(`Signer error in ${method}:`, error);
  
  // Fehlermeldung anzeigen
  showErrorMessage(`Signing failed: ${error.message}`);
});

// Signer-Entfernung überwachen
signerManager.on('signer:cleared', () => {
  console.log('Signer cleared');
  
  // UI zurücksetzen
  resetSigningUI();
});
```

### Timeout Handling

```javascript
// Mit benutzerdefiniertem Timeout
try {
  const signed = await signerManager.signEvent(event, 15000); // 15 Sekunden
  console.log('Event signed within timeout');
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Signing timed out');
  } else {
    console.error('Signing failed:', error);
  }
}
```

## Integration mit anderen Modulen

### Mit IdentityManager

```javascript
// Signer automatisch aus IdentityManager holen
identityManager.on('identity:login', (identity) => {
  const signer = identityManager.getSigner();
  if (signer) {
    signerManager.setSigner(signer);
    console.log('Signer set from identity');
  }
});

identityManager.on('identity:logout', () => {
  signerManager.clearSigner();
  console.log('Signer cleared on logout');
});
```

### Mit EventManager

```javascript
// EventManager verwendet intern SignerManager
const result = await eventManager.createAndPublish('text-note', {
  content: 'Hello!'
});

// SignerManager wird automatisch verwendet
```

## Best Practices

1. **Signer Validation**: Immer prüfen ob Signer verfügbar ist
2. **Error Handling**: Auf `signer:error` Events lauschen
3. **Capabilities**: Fähigkeiten vor Operationen prüfen
4. **Timeouts**: Angemessene Timeouts für Netzwerkoperationen
5. **NIP-44**: Bevorzugt NIP-44 statt NIP-04 verwenden

## Sicherheit

1. **Key Protection**: Private Keys werden niemals exponiert
2. **Secure Operations**: Alle kryptographischen Operationen sind sicher
3. **Validation**: Events werden vor der Signierung validiert
4. **Memory Management**: Sensitive Daten werden sicher im Speicher behandelt

## Fehlerbehandlung

Der SignerManager fängt folgende Fehler ab:
- Kein Signer verfügbar
- Signier-Timeouts
- Kryptographische Fehler
- Invalid Event-Struktur
- Netzwerkfehler

Alle Fehler werden über `signer:error` Events gemeldet und als Promise-Rejections weitergegeben.

## Typdefinitionen

### UnsignedEvent

```javascript
{
  kind: number,           // Event-Typ
  content: string,        // Event-Inhalt
  tags: Array<string[]>,  // Event-Tags
  created_at: number      // Unix-Timestamp
}
```

### SignedEvent

```javascript
{
  id: string,             // Event-ID (Hash)
  pubkey: string,         // Public Key des Autors
  created_at: number,     // Unix-Timestamp
  kind: number,           // Event-Typ
  tags: Array<string[]>,  // Event-Tags
  content: string,        // Event-Inhalt
  sig: string             // Signatur
}
```

### Capabilities

```javascript
{
  canSign: boolean,      // Kann Events signieren
  canEncrypt: boolean,    // Kann Nachrichten verschlüsseln
  canDecrypt: boolean,    // Kann Nachrichten entschlüsseln
  hasNip04: boolean,      // Unterstützt NIP-04
  hasNip44: boolean       // Unterstützt NIP-44
}
```

## Testing

```javascript
// Mock Signer für Tests
import { MockSigner } from './framework/plugins/signer/MockSigner.js';

const mockSigner = new MockSigner('test-pubkey');
signerManager.setSigner(mockSigner);

// Test-Event signieren
const testEvent = {
  kind: 1,
  content: 'Test event',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
};

const signed = await signerManager.signEvent(testEvent);
console.log('Test event signed:', signed.id);

// Verschlüsselung testen
const encrypted = await signerManager.nip44Encrypt('recipient', 'test message');
const decrypted = await signerManager.nip44Decrypt('sender', encrypted);
console.assert(decrypted === 'test message', 'Encryption test passed');
```

## Nächste Schritte

- [SignerPlugin API](./plugins/SignerPlugin.md) - Signier-Interface
- [IdentityManager API](./IdentityManager.md) - Identitätsverwaltung
- [EventManager API](./EventManager.md) - Event-Verwaltung