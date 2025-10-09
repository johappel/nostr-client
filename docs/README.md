# Nostr Framework Dokumentation

Willkommen zur umfassenden Dokumentation des Nostr Frameworks. Diese Dokumentation enthält alles, was Sie für die Entwicklung von Nostr-Clients mit dem Framework benötigen.

## Übersicht

Das Nostr Framework ist ein modulares TypeScript-Framework für die Entwicklung von Nostr-Clients. Es bietet vollständige Typsicherheit, eine saubere Architektur, plugin-basierte Erweiterbarkeit und umfassende APIs für alle Aspekte der Nostr-Entwicklung.

## Dokumentationsstruktur

### 📚 API-Referenz

Vollständige API-Dokumentation aller Framework-Module:

- [**API-Referenz**](./api/) - Komplette API-Dokumentation
  - [Core Module](./api/#core-module) - Basis-Funktionalität
  - [Plugins](./api/#plugins) - Erweiterbare Module
  - [Templates](./api/#templates) - Event-Templates
  - [Examples](./api/#beispiele) - Code-Beispiele

### 🚀 Schnellstart

- [**Getting Started**](./tutorials/getting-started.md) - Erste Schritte mit dem Framework
- [**Quick Start**](./tutorials/quick-start.md) - Schneller Einstieg in 5 Minuten
- [**Installation**](./tutorials/installation.md) - Installationsanleitung

### 📖 Tutorials

Detaillierte Anleitungen für verschiedene Anwendungsfälle:

- [**Grundlagen**](./tutorials/) - Grundlegende Konzepte und Nutzung
- [**Fortgeschritten**](./tutorials/advanced/) - Erweiterte Techniken
- [**Integration**](./tutorials/integration/) - Integration mit anderen Bibliotheken

### 🛠️ Beispiele

Praktische Code-Beispiele und vollständige Anwendungen:

- [**Beispiele**](./examples/) - Sammlung von Code-Beispielen
- [**Demos**](./examples/demos/) - Live-Demos
- [**Templates**](./examples/templates/) - Projekt-Templates

### 🔧 Entwicklung

Informationen für Framework-Entwickler:

- [**Contributing**](./development/contributing.md) - Mitwirken am Framework
- [**Architecture**](./development/architecture.md) - Architektur-Dokumentation
- [**Testing**](./development/testing.md) - Test-Strategien

## Schnellstart-Beispiel

```typescript
import { NostrFramework, type FrameworkConfig, type Identity } from '@johappel/nostr-framework';

// Framework mit typisierten Konfigurationen initialisieren
const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  debug: true,
  standardTemplates: true
};

const nostr = new NostrFramework(config);
await nostr.initialize();

// Authentifizieren (NIP-07) mit Type Safety
if (typeof window !== 'undefined' && window.nostr) {
  const identity: Identity = await nostr.identity.authenticate('nip07');
  console.log('Authenticated as:', identity.npub);
  console.log('Display name:', identity.displayName);
}

// Text Note erstellen und veröffentlichen mit Event Manager
const event = await nostr.events.create('text-note', {
  content: 'Hello from Nostr Framework!',
  tags: [['t', 'greeting']]
});

const result = await nostr.events.publish(event);
console.log('Event published:', result);
```

## Hauptkomponenten

### Core Module (TypeScript)

- **EventBus** - Zentrales Event-System mit typisierten Events
- **IdentityManager** - Authentifizierung und Identitätsverwaltung mit typed Identity interfaces
- **SignerManager** - Event-Signierung und Verschlüsselung mit Capability-System
- **TemplateEngine** - Event-Templates mit Schema-Validierung
- **RelayManager** - Relay-Verbindungen mit Connection Pooling und Status-Tracking
- **EventManager** - Zentrale Event-Verwaltung mit Template-Integration
- **StorageManager** - Plugin-basierte lokale Speicherung mit typisierten Adaptern
- **NostrFramework** - Hauptklasse mit vollständiger TypeScript-Integration

### Plugins (TypeScript)

- **Auth Plugins** - NIP-07, NIP-46, NSEC mit typisierten Interfaces
- **Signer Plugins** - Verschiedene Signier-Implementierungen mit Capability-System
- **Storage Plugins** - LocalStorage, IndexedDB, SQLite mit typisierten Adaptern

### Templates

- **NIP-01** - Text Notes, User Metadata
- **NIP-09** - Event Deletion
- **NIP-52** - Calendar Events
- **Custom** - Erweiterbare Templates

## Features

### ✅ Kernfunktionen

- [x] Modulare Architektur
- [x] Plugin-basierte Erweiterbarkeit
- [x] Multi-Provider-Authentifizierung
- [x] Event-Signierung und -Validierung
- [x] Relay-Management
- [x] Lokale Speicherung
- [x] Template-System
- [x] Verschlüsselung (NIP-04/NIP-44)

### 🚀 Erweiterte Funktionen

- [x] Fastest Relay Detection
- [x] Auto-Synchronisation
- [x] Event-Caching
- [x] Batch-Operations
- [x] Error Handling
- [x] Debug-Modus
- [x] TypeScript-Unterstützung
- [x] Comprehensive Testing

### 📱 Plattform-Unterstützung

- [x] Browser (Chrome, Firefox, Safari, Edge)
- [x] Node.js (mit Polyfills)
- [x] React, Vue, Angular Integration
- [x] Mobile Web Apps
- [x] Progressive Web Apps

## Browser-Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 88+ | ✅ Voll |
| Firefox | 85+ | ✅ Voll |
| Safari | 14+ | ✅ Voll |
| Edge | 88+ | ✅ Voll |

## Installation

### NPM

```bash
npm install @nostr/framework
```

### CDN

```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@nostr/framework/dist/index.js';
</script>
```

### Lokal

```bash
git clone https://github.com/nostr/framework.git
cd framework
npm install
npm run build
```

## Konzepte

### Event-Flow

1. **Creation**: Templates erstellen unsignierte Events
2. **Signing**: Signer signiert Events
3. **Publishing**: RelayManager veröffentlicht auf Relays
4. **Storage**: StorageManager speichert lokal
5. **Sync**: Bidirektionale Synchronisation

### Plugin-Architektur

Das Framework verwendet eine plugin-basierte Architektur für maximale Flexibilität:

- **Auth Plugins** - Verschiedene Authentifizierungsmethoden
- **Signer Plugins** - Verschiedene Signier-Implementierungen
- **Storage Plugins** - Verschiedene Speicher-Backends

### Template-System

Templates definieren die Struktur und Validierung von Events:

- **Standard Templates** - NIP-konforme Templates
- **Custom Templates** - Benutzerdefinierte Event-Typen
- **Validation** - Automatische Validierung
- **Parsing** - Strukturiertes Parsing empfangener Events

## Community

- **GitHub**: [github.com/nostr/framework](https://github.com/nostr/framework)
- **Discussions**: [github.com/nostr/framework/discussions](https://github.com/nostr/framework/discussions)
- **Issues**: [github.com/nostr/framework/issues](https://github.com/nostr/framework/issues)
- **Discord**: [Nostr Framework Discord](https://discord.gg/nostr-framework)

## Lizenz

Das Framework ist unter der [MIT-Lizenz](https://opensource.org/licenses/MIT) veröffentlicht.

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

## Beitrag leisten

Wir freuen uns über Beiträge! Bitte lesen Sie unsere [Contributing Guidelines](./development/contributing.md).

### Wie Sie helfen können

1. **Issues melden** - Bugs und Feature-Requests
2. **Code beitragen** - Pull-Requests willkommen
3. **Dokumentation verbessern** - Docs und Beispiele
4. **Tests schreiben** - Test-Coverage verbessern
5. **Feedback geben** - Anregungen und Verbesserungen

## Support

- **Dokumentation**: [nostr-framework.dev](https://nostr-framework.dev)
- **API-Referenz**: [nostr-framework.dev/api](https://nostr-framework.dev/api)
- **Tutorials**: [nostr-framework.dev/tutorials](https://nostr-framework.dev/tutorials)
- **Beispiele**: [nostr-framework.dev/examples](https://nostr-framework.dev/examples)

## Glossar

- **NIP**: Nostr Improvement Proposal
- **Event**: Grundlegende Datenstruktur in Nostr
- **Relay**: Server, der Nostr Events speichert und verteilt
- **Plugin**: Erweiterbares Modul für spezifische Funktionalität
- **Template**: Vorlage für die Erstellung von Events
- **Signer**: Komponente für die digitale Signatur von Events

---

*Diese Dokumentation wird kontinuierlich aktualisiert. Für die neueste Version besuchen Sie [nostr-framework.dev](https://nostr-framework.dev).*