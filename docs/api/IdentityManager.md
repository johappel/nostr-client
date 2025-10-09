# IdentityManager API-Referenz

Der IdentityManager verwaltet Benutzer-Identitäten und Authentifizierung über verschiedene Provider. Er unterstützt Multi-Provider-Auth, Session-Persistenz und typisierte Plugin-Registry.

## Import

```typescript
import { IdentityManager, type Identity, type AuthCredentials } from '@johappel/nostr-framework';
```

## Konstruktor

```typescript
const identityManager = new IdentityManager(eventBus?: EventBus | null);
```

**Parameter:**
- `eventBus` (EventBus | null, optional): EventBus-Instanz für die Kommunikation. Wenn nicht angegeben, wird eine neue erstellt.

**Eigenschaften:**
- `_eventBus` (EventBus): EventBus-Instanz
- `_plugins` (Map<string, any>): Registrierte Auth-Plugins mit Typisierung
- `_currentPlugin` (AuthPlugin | null): Aktueller Auth-Plugin
- `_currentIdentity` (Identity | null): Aktuelle typisierte Benutzer-Identität
- `_initialized` (boolean): Initialisierungsstatus

## Methoden

### initialize(): Promise<void>

Initialisiert den IdentityManager und alle registrierten Plugins.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```typescript
await identityManager.initialize();
console.log('IdentityManager initialized');
```

### registerPlugin(name: string, plugin: any): void

Registriert ein typisiertes Authentifizierungs-Plugin.

**Parameter:**
- `name` (string): Eindeutiger Plugin-Name
- `plugin` (AuthPlugin): Typisierte Plugin-Instanz

**Beispiel:**
```typescript
import { Nip07Plugin } from '@johappel/nostr-framework/plugins/auth/Nip07Plugin.js';

const nip07Plugin = new Nip07Plugin();
identityManager.registerPlugin('nip07', nip07Plugin);
```

### unregisterPlugin(name: string): void

Entfernt ein registriertes Auth-Plugin.

**Parameter:**
- `name` (string): Plugin-Name

**Beispiel:**
```typescript
identityManager.unregisterPlugin('nip07');
```

### getRegisteredPlugins(): string[]

Gibt eine Liste aller registrierten Plugin-Namen zurück.

**Rückgabewert:**
- string[]: Array der registrierten Plugin-Namen

**Beispiel:**
```typescript
const plugins: string[] = identityManager.getRegisteredPlugins();
console.log('Registered plugins:', plugins);
// Output: ['nip07', 'nip46', 'nsec']
```

### getAvailablePlugins(): Promise<string[]>

Gibt eine Liste der verfügbaren (verwendbaren) Plugins zurück.

**Rückgabewert:**
- Promise<string[]>: Array der verfügbaren Plugin-Namen

**Beispiel:**
```typescript
const available: string[] = await identityManager.getAvailablePlugins();
console.log('Available plugins:', available);
// Output: ['nip07'] (wenn NIP-07 Extension installiert ist)
```

### authenticate(providerName: string, credentials?: AuthCredentials): Promise<Identity>

Authentifiziert einen Benutzer mit einem bestimmten Provider und gibt eine typisierte Identity zurück.

**Parameter:**
- `providerName` (string): Name des registrierten Plugins
- `credentials` (Object, optional): Provider-spezifische Anmeldedaten

**Rückgabewert:**
- Promise<Identity>: Benutzer-Identität

**Beispiel:**
```javascript
// Mit NIP-07 (Browser Extension)
const identity = await identityManager.authenticate('nip07');

// Mit Local Key
const localIdentity = await identityManager.authenticate('local', {
  privateKey: 'nsec1...'
});

// Mit NIP-46 (Remote Signer)
const remoteIdentity = await identityManager.authenticate('nip46', {
  bunkerUrl: 'bunker://...',
  secret: 'shared-secret'
});
```

### logout()

Meldet den aktuellen Benutzer ab.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
await identityManager.logout();
console.log('Logged out');
```

### isAuthenticated()

Prüft, ob ein Benutzer aktuell authentifiziert ist.

**Rückgabewert:**
- boolean: true wenn authentifiziert, false sonst

**Beispiel:**
```javascript
if (identityManager.isAuthenticated()) {
  console.log('User is logged in');
} else {
  console.log('User is not logged in');
}
```

### getCurrentIdentity()

Gibt die aktuelle Benutzer-Identität zurück.

**Rückgabewert:**
- Identity|null: Aktuelle Identität oder null

**Beispiel:**
```javascript
const identity = identityManager.getCurrentIdentity();
if (identity) {
  console.log('Current user:', identity.displayName || identity.npub);
}
```

### getCurrentPlugin()

Gibt das aktuelle Auth-Plugin zurück.

**Rückgabewert:**
- AuthPlugin|null: Aktuelles Plugin oder null

**Beispiel:**
```javascript
const plugin = identityManager.getCurrentPlugin();
if (plugin) {
  console.log('Current provider:', plugin.displayName);
}
```

### getPublicKey()

Gibt den Public Key der aktuellen Identität zurück.

**Rückgabewert:**
- string|null: Hex Public Key oder null

**Beispiel:**
```javascript
const pubkey = identityManager.getPublicKey();
if (pubkey) {
  console.log('User pubkey:', pubkey);
}
```

### getNpub()

Gibt den npub der aktuellen Identität zurück.

**Rückgabewert:**
- string|null: Bech32 npub oder null

**Beispiel:**
```javascript
const npub = identityManager.getNpub();
if (npub) {
  console.log('User npub:', npub);
}
```

### getSigner()

Gibt den Signer des aktuellen Plugins zurück.

**Rückgabewert:**
- SignerPlugin|null: Signer-Instanz oder null

**Beispiel:**
```javascript
const signer = identityManager.getSigner();
if (signer) {
  const pubkey = await signer.getPublicKey();
  console.log('Signer pubkey:', pubkey);
}
```

### on(event, callback)

Registriert einen Event-Listener für Identity-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = identityManager.on('identity:login', (identity) => {
  console.log('User logged in:', identity.npub);
});
```

### getEventBus()

Gibt den EventBus zurück.

**Rückgabewert:**
- EventBus: EventBus-Instanz

**Beispiel:**
```javascript
const eventBus = identityManager.getEventBus();
eventBus.on('custom:event', (data) => {
  console.log('Custom event:', data);
});
```

## Events

Der IdentityManager löst folgende Events aus:

### identity:initialized

Wird ausgelöst, wenn der IdentityManager initialisiert ist.

**Daten:**
```javascript
{
  manager: IdentityManager
}
```

### identity:plugin-registered

Wird ausgelöst, wenn ein Plugin registriert wird.

**Daten:**
```javascript
{
  name: string,
  plugin: AuthPlugin
}
```

### identity:plugin-unregistered

Wird ausgelöst, wenn ein Plugin entfernt wird.

**Daten:**
```javascript
{
  name: string
}
```

### identity:login

Wird ausgelöst, wenn ein Benutzer sich anmeldet.

**Daten:**
```javascript
{
  provider: string,
  identity: Identity
}
```

### identity:logout

Wird ausgelöst, wenn ein Benutzer sich abmeldet.

**Daten:**
```javascript
{
  identity: Identity
}
```

### identity:changed

Wird ausgelöst, wenn sich die Identität ändert (Login/Logout).

**Daten:**
```javascript
{
  identity: Identity|null
}
```

### identity:restored

Wird ausgelöst, wenn eine vorherige Session wiederhergestellt wird.

**Daten:**
```javascript
{
  identity: Identity
}
```

### identity:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  provider: string,
  error: Error
}
```

## Beispiele

### Basic Setup

```javascript
import { IdentityManager } from './framework/core/IdentityManager.js';
import { Nip07Plugin } from './framework/plugins/auth/Nip07Plugin.js';
import { LocalKeyPlugin } from './framework/plugins/auth/LocalKeyPlugin.js';

const identityManager = new IdentityManager();

// Plugins registrieren
identityManager.registerPlugin('nip07', new Nip07Plugin());
identityManager.registerPlugin('local', new LocalKeyPlugin());

// Initialisieren
await identityManager.initialize();
```

### Authentication Flow

```javascript
// Verfügbarkeit prüfen
const available = await identityManager.getAvailablePlugins();
console.log('Available providers:', available);

// Mit NIP-07 authentifizieren
if (available.includes('nip07')) {
  try {
    const identity = await identityManager.authenticate('nip07');
    console.log('Authenticated as:', identity.npub);
    console.log('Display name:', identity.displayName);
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

// Authentifizierungsstatus prüfen
if (identityManager.isAuthenticated()) {
  const identity = identityManager.getCurrentIdentity();
  console.log('Current user:', identity);
}
```

### Event Handling

```javascript
// Login-Events überwachen
identityManager.on('identity:login', ({ provider, identity }) => {
  console.log(`Logged in with ${provider}:`, identity.npub);
  
  // UI aktualisieren
  updateLoginButton(true);
  showUserProfile(identity);
});

// Logout-Events überwachen
identityManager.on('identity:logout', ({ identity }) => {
  console.log('Logged out:', identity.npub);
  
  // UI aktualisieren
  updateLoginButton(false);
  hideUserProfile();
});

// Fehler überwachen
identityManager.on('identity:error', ({ provider, error }) => {
  console.error(`Authentication error with ${provider}:`, error);
  showErrorMessage(error.message);
});

// Session-Wiederherstellung überwachen
identityManager.on('identity:restored', (identity) => {
  console.log('Session restored:', identity.npub);
  showWelcomeBack(identity);
});
```

### Plugin Management

```javascript
// Plugin-Status prüfen
const registered = identityManager.getRegisteredPlugins();
const available = await identityManager.getAvailablePlugins();

console.log('Registered plugins:', registered);
console.log('Available plugins:', available);

// Dynamisches Plugin-Registrieren
if (window.nostr) {
  identityManager.registerPlugin('nip07', new Nip07Plugin());
}

// Plugin entfernen
identityManager.unregisterPlugin('unused-plugin');
```

### Session Management

```javascript
// Session persistiert automatisch in localStorage
// Bei Seitenneuladung wird Session wiederhergestellt

await identityManager.initialize();

// Prüfen ob Session wiederhergestellt wurde
if (identityManager.isAuthenticated()) {
  console.log('Session restored automatically');
  const identity = identityManager.getCurrentIdentity();
  console.log('Welcome back:', identity.displayName);
}
```

## Integration mit anderen Modulen

### Mit SignerManager

```javascript
// Signer automatisch aus aktueller Identität holen
if (identityManager.isAuthenticated()) {
  const signer = identityManager.getSigner();
  signerManager.setSigner(signer);
  
  // Events signieren
  const signed = await signerManager.signEvent(unsignedEvent);
}
```

### Mit EventManager

```javascript
// Authentifizierungsstatus für Event-Erstellung nutzen
identityManager.on('identity:changed', (identity) => {
  if (identity) {
    // Event-Buttons aktivieren
    enableEventCreation();
  } else {
    // Event-Buttons deaktivieren
    disableEventCreation();
  }
});
```

## Best Practices

1. **Plugin-Registrierung**: Alle Plugins vor der Initialisierung registrieren
2. **Error Handling**: Auf `identity:error` Events lauschen
3. **Session Management**: Automatische Session-Wiederherstellung nutzen
4. **UI Updates**: Über Events reagieren statt direkter Abfrage
5. **Security**: Private Keys niemals im Klartext speichern

## Sicherheit

1. **Session Storage**: Sessions werden verschlüsselt in localStorage gespeichert
2. **Plugin Validation**: Plugins werden vor der Registrierung validiert
3. **Secure Storage**: Sensitive Daten werden sicher gespeichert
4. **Permission Checks**: Berechtigungen werden vor Operationen geprüft

## Fehlerbehandlung

Der IdentityManager fängt folgende Fehler ab:
- Plugin nicht gefunden
- Authentifizierungsfehler
- Session-Wiederherstellungsfehler
- Plugin-Initialisierungsfehler

Alle Fehler werden über `identity:error` Events gemeldet und als Promise-Rejections weitergegeben.

## Typdefinitionen

### Identity

```javascript
{
  pubkey: string,        // Hex public key
  npub: string,          // Bech32 npub
  provider: string,      // Provider name
  displayName?: string,  // Display name
  metadata?: Object,     // NIP-01 profile metadata
  capabilities: {
    canSign: boolean,    // Can sign events
    canEncrypt: boolean, // Can encrypt messages
    canDecrypt: boolean  // Can decrypt messages
  }
}
```

## Testing

```javascript
// Mock Plugin für Tests
class MockAuthPlugin extends AuthPlugin {
  constructor() {
    super();
    this.name = 'mock';
    this.displayName = 'Mock Auth';
  }

  async initialize() {
    this._markInitialized();
  }

  async isLoggedIn() {
    return true;
  }

  async getIdentity() {
    return {
      pubkey: 'mock-pubkey',
      npub: 'npub1mock',
      provider: 'mock',
      capabilities: { canSign: true, canEncrypt: true, canDecrypt: true }
    };
  }

  async login() {
    return await this.getIdentity();
  }

  async logout() {
    // Mock logout
  }

  getSigner() {
    return new MockSigner();
  }
}

// Test durchführen
const mockPlugin = new MockAuthPlugin();
identityManager.registerPlugin('mock', mockPlugin);

const identity = await identityManager.authenticate('mock');
console.log('Test identity:', identity);
```

## Nächste Schritte

- [AuthPlugin API](./plugins/AuthPlugin.md) - Authentifizierungs-Interface
- [SignerManager API](./SignerManager.md) - Event-Signierung
- [NostrFramework API](./NostrFramework.md) - Haupt-Framework-Klasse