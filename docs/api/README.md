
# Nostr Framework API-Referenz

Willkommen zur umfassenden API-Referenz des Nostr Frameworks. Diese Dokumentation behandelt alle Module, Plugins und Templates des Frameworks.

## Übersicht

Das Nostr Framework ist ein modulares JavaScript-Framework für die Entwicklung von Nostr-Clients. Es besteht aus folgenden Hauptkomponenten:

- **Core Module**: Basis-Funktionalität (EventBus, IdentityManager, etc.)
- **Plugins**: Erweiterbare Authentifizierungs-, Signier- und Speicher-Module
- **Templates**: Vorlagen für verschiedene Nostr Event-Typen
- **Main Framework**: Zentrale Orchestrierungsklasse

## Schnellstart

```javascript
import { NostrFramework, LocalStoragePlugin } from './framework/index.js';

// Framework initialisieren
const nostr = new NostrFramework({
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  storage: new LocalStoragePlugin(),
  debug: true
});

await nostr.initialize();

// Authentifizieren (NIP-07)
if (window.nostr) {
  const identity = await nostr.identity.authenticate('nip07');
  console.log('Authenticated as:', identity.npub);
}

// Text Note erstellen und veröffentlichen
const result = await nostr.events.createAndPublish('text-note', {
  content: 'Hello from Nostr Framework!',
  tags: [['t', 'greeting']]
});

console.log('Event published:', result.success);
```

## Core Module

### EventBus

Zentrales Event-System für Framework-interne Kommunikation.

- [EventBus API](./EventBus.md) - Vollständige API-Referenz

### IdentityManager

Verwaltung von Benutzer-Identitäten und Authentifizierung.

- [IdentityManager API](./IdentityManager.md) - Vollständige API-Referenz

### SignerManager

Event-Signierung und Verschlüsselung.

- [SignerManager API](./SignerManager.md) - Vollständige API-Referenz

### TemplateEngine

Verwaltung von Event-Templates für verschiedene NIPs.

- [TemplateEngine API](./TemplateEngine.md) - Vollständige API-Referenz

### RelayManager

Relay-Verbindungen und -Operationen.

- [RelayManager API](./RelayManager.md) - Vollständige API-Referenz

### EventManager

Zentrale Event-Verwaltung und Orchestrierung.

- [EventManager API](./EventManager.md) - Vollständige API-Referenz

### StorageManager

Lokale Speicherung und Synchronisation.

- [StorageManager API](./StorageManager.md) - Vollständige API-Referenz

### NostrFramework

Hauptklasse, die alle Module orchestriert.

- [NostrFramework API](./NostrFramework.md) - Vollständige API-Referenz

## Plugins

Das Framework verwendet eine plugin-basierte Architektur für erweiterbare Funktionalität.

- [Plugin APIs](./plugins/) - Alle Plugin-Interfaces und Implementierungen

### Authentifizierungs-Plugins

- [AuthPlugin](./plugins/AuthPlugin.md) - Basis-Interface
- [Nip07Plugin](./plugins/Nip07Plugin.md) - Browser Extension
- [Nip46Plugin](./plugins/Nip46Plugin.md) - Remote Signer
- [LocalKeyPlugin](./plugins/LocalKeyPlugin.md) - Lokale Private Keys

### Signier-Plugins

- [SignerPlugin](./plugins/SignerPlugin.md) - Basis-Interface
- [MockSigner](./plugins/MockSigner.md) - Mock für Tests

### Speicher-Plugins

- [StoragePlugin](./plugins/StoragePlugin.md) - Basis-Interface
- [LocalStoragePlugin](./plugins/LocalStoragePlugin.md) - Browser localStorage
- [IndexedDBPlugin](./plugins/IndexedDBPlugin.md) - IndexedDB Storage
- [SQLitePlugin](./plugins/SQLitePlugin.md) - SQLite Database

## Templates

Templates für die Erstellung und Validierung von Nostr Events.

- [Template APIs](./templates/) - Alle Template-Referenzen

### NIP-01 Templates

- [NIP-01 Templates](./templates/nip01.md) - Basic Protocol Events
  - TextNoteTemplate (kind: 1) - Text Notes
  - SetMetadataTemplate (kind: 0) - User Profile Metadata

### NIP-09 Templates

- [NIP-09 Templates](./templates/nip09.md) - Event Deletion
  - EventDeletionTemplate (kind: 5) - Event Deletion Request

### NIP-52 Templates

- [NIP-52 Templates](./templates/nip52.md) - Calendar Events
  - CalendarEventTemplate (kind: 31923) - Calendar Time-based Event

## Architektur

### Modul-Abhängigkeiten

```
EventBus (keine Abhängigkeiten)
   ↓
IdentityManager (nutzt EventBus)
   ↓
SignerManager (nutzt EventBus)
   ↓
TemplateEngine (nutzt EventBus)
   ↓
RelayManager (nutzt EventBus)
   ↓
EventManager (nutzt alle Manager)
   ↓
StorageManager (nutzt EventBus + RelayManager)
   ↓
NostrFramework (integriert alles)
```

### Event-Flow

1. **Event Creation**: TemplateEngine erstellt unsigniertes Event
2. **Signing**: SignerManager signiert das Event
3. **Publishing**: RelayManager veröffentlicht auf Relays
4. **Storage**: StorageManager speichert lokal
5. **Sync**: Bidirektionale Synchronisation

## Beispiele

### Basic Application

```javascript
import { NostrFramework, LocalStoragePlugin } from './framework/index.js';

class NostrApp {
  constructor() {
    this.nostr = new NostrFramework({
      relays: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ],
      storage: new LocalStoragePlugin(),
      debug: true
    });
  }

  async init() {
    await this.nostr.initialize();
    this.setupEventListeners();
    await this.authenticate();
  }

  setupEventListeners() {
    this.nostr.on('identity:login', (identity) => {
      console.log('Logged in:', identity.npub);
      this.updateUI();
    });

    this.nostr.events.subscribe(
      [{ kinds: [1], limit: 100 }],
      (event) => {
        this.displayEvent(event);
      }
    );
  }

  async authenticate() {
    if (!this.nostr.identity.isAuthenticated()) {
      try {
        await this.nostr.identity.authenticate('nip07');
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    }
  }

  async postMessage(content) {
    try {
      const result = await this.nostr.events.createAndPublish('text-note', {
        content,
        tags: [['t', 'post']]
      });
      
      if (result.success) {
        console.log('Message posted successfully');
      }
    } catch (error) {
      console.error('Failed to post message:', error);
    }
  }

  displayEvent(event) {
    const container = document.getElementById('events');
    const element = document.createElement('div');
    element.innerHTML = `
      <p><strong>${event.pubkey.substring(0, 8)}...</strong></p>
      <p>${event.content}</p>
      <small>${new Date(event.created_at * 1000).toLocaleString()}</small>
    `;
    container.appendChild(element);
  }

  updateUI() {
    const authButton = document.getElementById('auth-button');
    if (this.nostr.identity.isAuthenticated()) {
      authButton.textContent = 'Logout';
      authButton.onclick = () => this.nostr.identity.logout();
    } else {
      authButton.textContent = 'Login';
      authButton.onclick = () => this.authenticate();
    }
  }
}

// Anwendung starten
const app = new NostrApp();
app.init();
```

### Custom Template

```javascript
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

  parse(event) {
    const question = event.tags.find(t => t[0] === 'poll')?.[1];
    const options = event.tags
      .filter(t => t[0] === 'option')
      .map(t => ({ index: parseInt(t[1]), text: t[2] }))
      .sort((a, b) => a.index - b.index);

    return {
      question,
      options,
      description: event.content,
      author: event.pubkey,
      created_at: event.created_at
    };
  }

  getRequiredFields() {
    return ['question', 'options'];
  }

  getOptionalFields() {
    return ['description', 'created_at'];
  }
}

// Template registrieren und verwenden
const nostr = new NostrFramework();
await nostr.initialize();

nostr.templates.register('poll', new PollTemplate());

const pollEvent = await nostr.events.createAndPublish('poll', {
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'Rust', 'Go'],
  description: 'Poll for developers'
});
```

## Best Practices

1. **Initialization**: Immer `await nostr.initialize()` vor der Verwendung aufrufen
2. **Error Handling**: Globale Fehler-Listener für alle Module registrieren
3. **Authentication**: Authentifizierungsstatus prüfen vor Operationen
4. **Storage**: Lokale Speicherung für Offline-Funktionalität nutzen
5. **Cleanup**: `destroy()` aufrufen beim Verlassen der Anwendung

##
## Sicherheit

1. **Private Keys**: Werden niemals im Klartext gespeichert
2. **Event Validation**: Alle Events werden vor der Veröffentlichung validiert
3. **Secure Storage**: Verschlüsselung für sensible Daten
4. **Relay Verification**: Relay-URLs werden validiert
5. **Input Sanitization**: Benutzereingaben werden bereinigt

## Performance

- **Lazy Loading**: Module werden bei Bedarf initialisiert
- **Event Caching**: Intelligenter Cache für häufig verwendete Events
- **Connection Pooling**: Wiederverwendung von Relay-Verbindungen
- **Async Operations**: Alle Operationen sind nicht-blockierend
- **Batch Processing**: Effiziente Verarbeitung von mehreren Events

## Browser-Support

Das Framework unterstützt alle modernen Browser:
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Node.js-Support

Das Framework kann auch in Node.js-Umgebungen verwendet werden mit entsprechenden Polyfills.

## Fehlerbehandlung

Das Framework fängt folgende Fehler ab:
- Initialisierungsfehler
- Authentifizierungsfehler
- Netzwerkfehler
- Validierungsfehler
- Storage-Fehler

Alle Fehler werden durch entsprechende Events gemeldet und als Promise-Rejections weitergegeben.

## Testing

Das Framework enthält umfassende Tests für alle Module:

```javascript
// Tests ausführen
import { runEventBusTests } from './framework/core/EventBus.test.js';
import { runIdentityManagerTests } from './framework/core/IdentityManager.test.js';

const eventBusResults = runEventBusTests();
const identityResults = runIdentityManagerTests();

console.log('EventBus tests:', eventBusResults);
console.log('IdentityManager tests:', identityResults);
```

## Contributing

Beiträge zum Framework sind willkommen! Bitte beachten Sie:

1. **Code Style**: Konsistente Code-Stil-Richtlinien befolgen
2. **Tests**: Neue Features müssen Tests enthalten
3. **Documentation**: API-Dokumentation aktualisieren
4. **NIP Compliance**: Einhaltung der relevanten NIPs

## Lizenz

Das Framework ist unter der MIT-Lizenz veröffentlicht.

## Support

- **Issues**: [GitHub Issues](https://github.com/nostr-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nostr-framework/discussions)
- **Documentation**: [Full Documentation](https://nostr-framework.dev)

## Changelog

### Version 1.0.0

- Initiale Veröffentlichung
- Core Module implementiert
- Plugin-Architektur
- Template-System
- Storage-Plugins
- Vollständige API-Dokumentation

## Roadmap

### Version 1.1.0 (Geplant)

- [ ] NIP-04/NIP-44 Direct Messages
- [ ] NIP-23 Long-form Content
- [ ] NIP-57 Zap Support
- [ ] Enhanced Caching
- [ ] Performance Optimierungen

### Version 1.2.0 (Geplant)

- [ ] NIP-33 Parameterized Replaceable Events
- [ ] NIP-36 Sensitive Content
- [ ] NIP-40 Expiration Timestamps
- [ ] NIP-51 Lists
- [ ] Advanced Search Features

## Glossar

- **NIP**: Nostr Improvement Proposal
- **Event**: Grundlegende Datenstruktur in Nostr
- **Relay**: Server, der Nostr Events speichert und verteilt
- **Plugin**: Erweiterbares Modul für spezifische Funktionalität
- **Template**: Vorlage für die Erstellung von Events
- **Signer**: Komponente für die digitale Signatur von Events

## Nächste Schritte

1. **Tutorial durchlesen**: [Getting Started Guide](../tutorials/getting-started.md)
2. **Beispiele ansehen**: [Examples](../examples/app/)
3. **API-Referenz studieren**: [Module APIs](./)
4. **Erste Anwendung erstellen**: [Quick Start](../tutorials/quick-start.md)

---

*Diese API-Referenz wird kontinuierlich aktualisiert. Für die neueste Version besuchen Sie [nostr-framework.dev](https://nostr-framework.dev).*