# NostrFramework API-Referenz

Die NostrFramework-Klasse ist die Hauptklasse, die alle Framework-Module orchestriert. Sie bietet eine einheitliche Schnittstelle für die Entwicklung von Nostr-Clients.

## Import

```javascript
import { NostrFramework } from './framework/index.js';
```

## Konstruktor

```javascript
const nostr = new NostrFramework(config);
```

**Parameter:**
- `config` (Object, optional): Konfigurations-Objekt
  - `relays` (string[]): Array von Relay-URLs
  - `storage` (StoragePlugin): Storage-Plugin-Instanz
  - `standardTemplates` (boolean): Standard-Templates registrieren (Standard: true)
  - `debug` (boolean): Debug-Modus aktivieren (Standard: false)

**Beispiel:**
```javascript
import { NostrFramework, LocalStoragePlugin } from './framework/index.js';

const nostr = new NostrFramework({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ],
  storage: new LocalStoragePlugin(),
  debug: true
});
```

## Eigenschaften

### identity

**Typ:** IdentityManager  
Zugriff auf den IdentityManager für Authentifizierung und Identitätsverwaltung.

```javascript
const isAuthenticated = nostr.identity.isAuthenticated();
const currentIdentity = nostr.identity.getCurrentIdentity();
```

### signer

**Typ:** SignerManager  
Zugriff auf den SignerManager für Event-Signierung und Verschlüsselung.

```javascript
const pubkey = await nostr.signer.getPublicKey();
const signed = await nostr.signer.signEvent(unsignedEvent);
```

### templates

**Typ:** TemplateEngine  
Zugriff auf die TemplateEngine für Event-Erstellung und Parsing.

```javascript
const event = nostr.templates.build('text-note', { content: 'Hello' });
const parsed = nostr.templates.parse('text-note', receivedEvent);
```

### relay

**Typ:** RelayManager  
Zugriff auf den RelayManager für Relay-Verbindungen und -Operationen.

```javascript
const events = await nostr.relay.query([{ kinds: [1], limit: 10 }]);
const results = await nostr.relay.publish(signedEvent);
```

### storage

**Typ:** StorageManager  
Zugriff auf den StorageManager für lokale Speicherung.

```javascript
await nostr.storage.save(events);
const stored = await nostr.storage.query([{ kinds: [1] }]);
```

### events

**Typ:** EventManager  
Zugriff auf den EventManager für zentrale Event-Verwaltung.

```javascript
const result = await nostr.events.createAndPublish('text-note', {
  content: 'Hello Nostr!'
});
```

## Methoden

### initialize()

Initialisiert das Framework und alle Module.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
await nostr.initialize();
console.log('Framework initialized');
```

### isInitialized()

Prüft, ob das Framework initialisiert ist.

**Rückgabewert:**
- boolean: true wenn initialisiert, false sonst

**Beispiel:**
```javascript
if (nostr.isInitialized()) {
  console.log('Framework is ready');
}
```

### destroy()

Zerstört das Framework und räumt alle Ressourcen auf.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
await nostr.destroy();
console.log('Framework destroyed');
```

### on(event, callback)

Registriert einen Event-Listener für Framework-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = nostr.on('framework:initialized', () => {
  console.log('Framework is ready!');
});
```

### getEventBus()

Gibt den zentralen EventBus zurück.

**Rückgabewert:**
- EventBus: EventBus-Instanz

**Beispiel:**
```javascript
const eventBus = nostr.getEventBus();
eventBus.on('custom:event', (data) => {
  console.log('Custom event:', data);
});
```

## Events

Das Framework löst folgende Events aus:

### framework:initialized

Wird ausgelöst, wenn das Framework vollständig initialisiert ist.

**Daten:**
```javascript
{}
```

### framework:destroyed

Wird ausgelöst, wenn das Framework zerstört wird.

**Daten:**
```javascript
{}
```

## Beispiele

### Basic Setup

```javascript
import { NostrFramework, LocalStoragePlugin } from './framework/index.js';

// Framework mit Konfiguration erstellen
const nostr = new NostrFramework({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ],
  storage: new LocalStoragePlugin(),
  debug: true
});

// Framework initialisieren
await nostr.initialize();
console.log('Nostr Framework is ready!');
```

### Authentication

```javascript
// Authentifizierung mit NIP-07 (Browser Extension)
try {
  // Prüfen ob NIP-07 verfügbar ist
  const available = await nostr.identity.getAvailablePlugins();
  if (available.includes('nip07')) {
    const identity = await nostr.identity.authenticate('nip07');
    console.log('Authenticated as:', identity.npub);
  }
} catch (error) {
  console.error('Authentication failed:', error);
}

// Authentifizierungsstatus prüfen
if (nostr.identity.isAuthenticated()) {
  const identity = nostr.identity.getCurrentIdentity();
  console.log('Current user:', identity.displayName || identity.npub);
}
```

### Creating and Publishing Events

```javascript
// Text Note erstellen und veröffentlichen
if (nostr.identity.isAuthenticated()) {
  const result = await nostr.events.createAndPublish('text-note', {
    content: 'Hello from Nostr Framework!',
    tags: [['t', 'greeting'], [['a', 'custom-tag']]]
  });
  
  if (result.success) {
    console.log(`Event published to ${result.successCount} relays`);
    console.log('Event ID:', result.event.id);
  }
}

// Kalender-Event erstellen
const calendarResult = await nostr.events.createAndPublish('calendar-event', {
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  location: 'Berlin, Germany',
  description: 'Monthly community meetup'
});
```

### Querying Events

```javascript
// Text Notes abfragen
const textNotes = await nostr.events.queryEvents([
  { kinds: [1], limit: 20 }
]);

console.log(`Found ${textNotes.length} text notes`);
textNotes.forEach(event => {
  console.log(`- ${event.content.substring(0, 50)}...`);
});

// Events eines bestimmten Autors
const authorEvents = await nostr.events.queryEvents([
  { authors: ['author-pubkey'], kinds: [1, 6, 7] }
]);

// Live-Subscription für neue Events
const subscription = nostr.events.subscribe(
  [{ kinds: [1], limit: 100 }],
  (event) => {
    console.log('New text note:', event.content);
  }
);

// Subscription nach 30 Sekunden schließen
setTimeout(() => subscription.close(), 30000);
```

### Storage Operations

```javascript
// Events lokal speichern
const recentEvents = await nostr.events.queryEvents([
  { kinds: [1], since: Math.floor(Date.now() / 1000) - 3600 }
]);

await nostr.storage.save(recentEvents);
console.log(`Saved ${recentEvents.length} events to local storage`);

// Gespeicherte Events abfragen
const storedEvents = await nostr.storage.query([
  { kinds: [1], limit: 50 }
]);

console.log(`Found ${storedEvents.length} stored events`);

// Storage-Statistiken
const stats = await nostr.storage.getStats();
console.log('Storage stats:', stats);

// Synchronisation mit Relays
const syncResult = await nostr.storage.sync({
  filters: [{ kinds: [1], limit: 100 }],
  bidirectional: true
});

console.log(`Synced ${syncResult.saved} events`);
```

### Encryption/Decryption

```javascript
// Nachricht verschlüsseln (NIP-44)
const recipientPubkey = 'recipient-public-key-hex';
const message = 'Secret message';

try {
  const encrypted = await nostr.signer.nip44Encrypt(recipientPubkey, message);
  console.log('Encrypted message:', encrypted);

  // Nachricht entschlüsseln
  const decrypted = await nostr.signer.nip44Decrypt(recipientPubkey, encrypted);
  console.log('Decrypted message:', decrypted);
} catch (error) {
  console.error('Encryption/decryption failed:', error);
}
```

### Event Deletion

```javascript
// Event löschen
const eventIdToDelete = 'event-id-to-delete';
const result = await nostr.events.deleteEvent(
  eventIdToDelete,
  'Mistake - wrong content'
);

if (result.success) {
  console.log('Deletion event published');
}
```

### Advanced Configuration

```javascript
// Framework mit erweiterter Konfiguration
const nostr = new NostrFramework({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.snort.social'
  ],
  storage: new LocalStoragePlugin({
    keyPrefix: 'myapp_events_'
  }),
  standardTemplates: true, // Standard-Templates registrieren
  debug: true // Debug-Modus aktivieren
});

// Event-Listener für Framework-Events
nostr.on('framework:initialized', () => {
  console.log('🚀 Nostr Framework is ready!');
});

nostr.on('identity:login', (identity) => {
  console.log(`👤 Logged in as ${identity.npub}`);
});

nostr.on('event:published', (data) => {
  console.log(`📝 Event ${data.event.id} published`);
});

// Framework initialisieren
await nostr.initialize();
```

### Custom Templates

```javascript
// Eigenes Template registrieren
import { EventTemplate } from './framework/templates/EventTemplate.js';

class PollTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'poll',
      kind: 6969,
      nip: 'custom',
      description: 'Poll event with multiple options'
    });
  }

  build(data) {
    const tags = [
      ['poll', data.question],
      ...data.options.map((option, index) => ['option', index.toString(), option])
    ];

    return {
      kind: 6969,
      content: data.description || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.question) throw new Error('Question is required');
    if (!data.options || data.options.length < 2) {
      throw new Error('At least 2 options required');
    }
    return true;
  }

  getRequiredFields() {
    return ['question', 'options'];
  }

  getOptionalFields() {
    return ['description', 'created_at'];
  }
}

// Template registrieren
nostr.templates.register('poll', new PollTemplate());

// Eigenes Template verwenden
const pollEvent = await nostr.events.createAndPublish('poll', {
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'Rust', 'Go'],
  description: 'Poll for developers'
});
```

### Error Handling

```javascript
// Globale Fehlerbehandlung
nostr.on('identity:error', ({ provider, error }) => {
  console.error(`Authentication error with ${provider}:`, error);
});

nostr.on('signer:error', ({ method, error }) => {
  console.error(`Signer error in ${method}:`, error);
});

nostr.on('relay:error', ({ method, error }) => {
  console.error(`Relay error in ${method}:`, error);
});

nostr.on('storage:error', ({ method, error }) => {
  console.error(`Storage error in ${method}:`, error);
});

// Try-catch für Operationen
try {
  const result = await nostr.events.createAndPublish('text-note', {
    content: 'Test message'
  });
  console.log('Success:', result.success);
} catch (error) {
  console.error('Operation failed:', error);
}
```

### Cleanup

```javascript
// In einer Single-Page-Application
window.addEventListener('beforeunload', async () => {
  if (nostr.isInitialized()) {
    await nostr.destroy();
  }
});

// Manuelles Cleanup
await nostr.relay.closeAllSubscriptions();
nostr.storage.setAutoSync(false);
await nostr.destroy();
```

## Integration mit anderen Bibliotheken

### Mit React

```javascript
// React Hook für Nostr Framework
import { useState, useEffect } from 'react';

export function useNostrFramework() {
  const [nostr, setNostr] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initFramework = async () => {
      const framework = new NostrFramework({
        relays: ['wss://relay.damus.io'],
        debug: true
      });
      
      await framework.initialize();
      
      framework.on('identity:changed', (identity) => {
        setIsAuthenticated(!!identity);
      });
      
      setNostr(framework);
    };

    initFramework();

    return () => {
      if (nostr) {
        nostr.destroy();
      }
    };
  }, []);

  return { nostr, isAuthenticated };
}
```

### Mit Vue.js

```javascript
// Vue Plugin für Nostr Framework
import { NostrFramework } from './framework/index.js';

export const NostrPlugin = {
  install(app, config) {
    const nostr = new NostrFramework(config);
    
    nostr.initialize().then(() => {
      app.provide('nostr', nostr);
      app.config.globalProperties.$nostr = nostr;
    });
  }
};

// In main.js
app.use(NostrPlugin, {
  relays: ['wss://relay.damus.io'],
  debug: process.env.NODE_ENV === 'development'
});
```

## Best Practices

1. **Initialisierung**: Immer `await nostr.initialize()` vor der Verwendung aufrufen
2. **Error Handling**: Globale Fehler-Listener für alle Module registrieren
3. **Cleanup**: `destroy()` aufrufen beim Verlassen der Anwendung
4. **Authentication**: Authentifizierungsstatus prüfen vor Operationen
5. **Storage**: Lokale Speicherung für Offline-Funktionalität nutzen

## Performance

- **Lazy Loading**: Module werden bei Bedarf initialisiert
- **Event Caching**: Intelligenter Cache für häufig verwendete Events
- **Connection Pooling**: Wiederverwendung von Relay-Verbindungen
- **Async Operations**: Alle Operationen sind nicht-blockierend

## Sicherheit

1. **Private Keys**: Werden niemals im Klartext gespeichert
2. **Event Validation**: Alle Events werden vor der Veröffentlichung validiert
3. **Secure Storage**: Verschlüsselung für sensible Daten
4. **Relay Verification**: Relay-URLs werden validiert

## Fehlerbehandlung

Das Framework fängt folgende Fehler ab:
- Initialisierungsfehler
- Authentifizierungsfehler
- Netzwerkfehler
- Validierungsfehler
- Storage-Fehler

Alle Fehler werden durch entsprechende Events gemeldet und als Promise-Rejections weitergegeben.