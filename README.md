# Nostr Framework

Ein modulares, plugin-basiertes Framework für Nostr-Client-Entwicklung mit Multi-Provider-Authentifizierung und vollständiger TypeScript-Unterstützung.

[![npm version](https://badge.fury.io/js/@johappel%2Fnostr-framework.svg)](https://badge.fury.io/js/@johappel%2Fnostr-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### 1. Installation

#### NPM (für Projekte)
```bash
# 1. Installiere das Framework
npm install @johappel/nostr-framework

# 2. Installiere nostr-tools als Peer Dependency
npm install nostr-tools@^2.8.1
```

#### CDN (für schnelle Tests)
```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
</script>
```

### 2. Basic Usage

```typescript
import { NostrFramework, type FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
    relays: ['wss://relay.damus.io', 'wss://nos.lol']
};

const nostr = new NostrFramework(config);
await nostr.initialize();

// Authentifizierung
const identity = await nostr.identity.authenticate('nip07');
console.log('Logged in:', identity.displayName || identity.npub);
```

### 3. Development Setup

For local development:

```bash
git clone https://github.com/johappel/nostr-client.git
cd nostr-client
npm install
```

Für lokale Entwicklung müssen Sie auch `nostr-tools` installieren:
```bash
npm install nostr-tools@^2.8.1
```

### 4. Development Server starten

Verwende VS Code Live Server oder einen anderen lokalen Webserver:

```bash
# VS Code: Rechtsklick auf HTML-Datei → "Open with Live Server"
# Oder nutze einen anderen Server, z.B.:
npx serve .
```

### 5. Tests ausführen

Öffne eine der Test-Dateien im Browser:

- **NIP-07 Tests**: http://127.0.0.1:5500/test-nip07.html
- **NIP-46 Tests**: http://127.0.0.1:5500/test-nip46.html
- **NSEC Tests**: http://127.0.0.1:5500/test-nsec.html
- **Relay Tests**: http://127.0.0.1:5500/test-relay.html

## 🔗 Peer Dependencies

Das Framework verwendet `nostr-tools` als **Peer Dependency**. Das bedeutet:

### Vorteile:
- ✅ **Keine Versions-Konflikte** zwischen Ihren und Framework-Abhängigkeiten
- ✅ **Reduzierte Bundle-Größe** - nur eine Version von nostr-tools
- ✅ **Flexibilität** - Sie können die gewünschte Version verwenden
- ✅ **Baum-Schüttelbar** - ungenutzte Teile werden entfernt

### Installation:
```bash
# Framework installieren
npm install @johappel/nostr-framework

# nostr-tools als Ihr Dependency installieren
npm install nostr-tools@^2.8.1
```

### Fehlerbehebung:
Falls Sie einen Fehler wie "Failed to load nostr-tools" erhalten:
```bash
npm install nostr-tools@^2.8.1
```

## 📦 Implementierte Module

### Core Module (TypeScript)

#### 1. EventBus
- Event-Bus für Framework-interne Kommunikation
- Observer-Pattern mit TypeScript-Unterstützung
- Debug-Modus und Typisierte Events

**Datei**: [`framework/core/EventBus.ts`](framework/core/EventBus.ts)

#### 2. IdentityManager
- Zentrale Identity-Verwaltung
- Multi-Provider-Authentifizierung
- Plugin-Registry-System mit Typen
- Session-Persistenz (localStorage)
- Typisierte Events für Identity-Änderungen

**Datei**: [`framework/core/IdentityManager.ts`](framework/core/IdentityManager.ts)

#### 3. RelayManager
- Multi-Relay-Verbindung mit ConnectionPool
- Automatische Reconnect-Logik
- Event-Filterung und Subscription-Management
- Typisierte Relay-Status und -Events

**Datei**: [`framework/core/RelayManager.ts`](framework/core/RelayManager.ts)

#### 4. EventManager
- Event-Erstellung und -Validierung
- Templates für verschiedene Event-Typen
- Signierung über verschiedene Provider
- TypeScript Event-Interfaces

**Datei**: [`framework/core/EventManager.ts`](framework/core/EventManager.ts)

#### 5. SignerManager
- Zentrale Signier-Verwaltung
- Multi-Provider-Unterstützung
- Verschlüsselung (NIP-04, NIP-44)
- Typisierte Signer-Capabilities

**Datei**: [`framework/core/SignerManager.ts`](framework/core/SignerManager.ts)

#### 6. StorageManager
- Plugin-basiertes Storage-System
- LocalStorage und SQLite Unterstützung
- Daten-Persistenz mit TypeScript-Interfaces

**Datei**: [`framework/core/StorageManager.ts`](framework/core/StorageManager.ts)

#### 7. TemplateEngine
- Event-Templates mit Schema-Validierung
- NIP-konforme Event-Erstellung
- Wiederverwendbare typisierte Vorlagen

**Datei**: [`framework/core/TemplateEngine.ts`](framework/core/TemplateEngine.ts)

### Auth Plugins (TypeScript)

#### AuthPlugin (Base Interface)
- TypeScript Base-Klasse für alle Auth-Plugins
- Definiert typisierte Interface-Methoden
- Vollständige Kapabilitäts-Deklaration

**Datei**: [`framework/plugins/auth/AuthPlugin.ts`](framework/plugins/auth/AuthPlugin.ts)

#### NIP-07 Plugin ✨
- Browser-Extension-Unterstützung (Alby, nos2x, Flamingo)
- Event-Signierung mit TypeScript-Interfaces
- NIP-04 Verschlüsselung/Entschlüsselung
- NIP-44 Verschlüsselung/Entschlüsselung
- Automatische Session-Wiederherstellung
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/Nip07Plugin.ts`](framework/plugins/auth/Nip07Plugin.ts)

#### NIP-46 Plugin 🔗
- Remote Signer (Bunker) Unterstützung
- bunker:// und nostrconnect:// URIs
- Auto-Reconnect mit typed Events
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/Nip46Plugin.ts`](framework/plugins/auth/Nip46Plugin.ts)

#### NSEC Plugin ⚠️
- **UNSAFE** - Nur für Testing/Entwicklung
- Lokale nsec/hex Schlüssel mit TypeScript-Validation
- Volle NIP-04/NIP-44 Unterstützung
- Test-Schlüssel-Generator
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/NsecPlugin.ts`](framework/plugins/auth/NsecPlugin.ts)

### Konfiguration & Type System

#### Zentrale Config mit TypeScript
- Überschreibbare Standard-Werte mit Typen
- FrameworkConfig Interface
- Relays, nostr-tools URL, Cache-Dauer
- User-spezifische Konfiguration

**Dateien**: 
- [`framework/config.ts`](framework/config.ts)
- [`framework/types/index.ts`](framework/types/index.ts) - Alle TypeScript-Interfaces

## 💻 Verwendung

### Basic Example (TypeScript)

```typescript
import { NostrFramework, type FrameworkConfig } from '@johappel/nostr-framework';

// Initialize mit typisierter Config
const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  debug: true
};

const nostr = new NostrFramework(config);
await nostr.initialize();

// Login mit NIP-07 Extension
const identity = await nostr.identity.authenticate('nip07');
console.log('Logged in:', identity.displayName || identity.npub);

// Event erstellen und signieren über EventManager
const event = await nostr.events.create('text-note', {
  content: 'Hello Nostr!'
});

const result = await nostr.events.publish(event);
console.log('Published:', result);
```

### Mit detaillierter Konfiguration

```typescript
import { NostrFramework, type FrameworkConfig, type StorageConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ],
  metadataCacheDuration: 1800000, // 30 Minuten
  debug: process.env.NODE_ENV === 'development',
  standardTemplates: true,
  storage: {
    type: 'localStorage'
  } as StorageConfig
};

const nostr = new NostrFramework(config);
await nostr.initialize();
```

### Verschiedene Auth-Methoden (TypeScript)

```typescript
import { NostrFramework, type Identity, type AuthCredentials } from '@johappel/nostr-framework';

const nostr = new NostrFramework();
await nostr.initialize();

// NIP-07 (Browser Extension)
const identity1: Identity = await nostr.identity.authenticate('nip07');

// NIP-46 (Remote Bunker)  
const credentials: AuthCredentials = { uri: 'bunker://...' };
const identity2: Identity = await nostr.identity.authenticate('nip46', credentials);

// NSEC (⚠️ UNSAFE - nur für Tests)
const nsecCredentials: AuthCredentials = { nsec: 'nsec1...' };
const identity3: Identity = await nostr.identity.authenticate('nsec', nsecCredentials);

// Test-Schlüssel generieren (⚠️ UNSAFE)
const { NsecPlugin } = await import('@johappel/nostr-framework/plugins/auth/NsecPlugin.js');
const testKey = await NsecPlugin.generateTestKey();
console.log('Test nsec:', testKey.nsec);
```### Mit Event Listeners (TypeScript)

```typescript
import { NostrFramework, type Identity, type FrameworkEvents } from '@johappel/nostr-framework';

const nostr = new NostrFramework();

// Typisierte Event Listeners
nostr.on('identity:login', (data: FrameworkEvents['identity:login']) => {
  console.log('User logged in:', data.identity.displayName);
});

nostr.on('identity:logout', (data: FrameworkEvents['identity:logout']) => {
  console.log('User logged out');
});

nostr.on('identity:changed', (identity: Identity | null) => {
  if (identity) {
    console.log('Identity changed:', identity.displayName || identity.npub);
  } else {
    console.log('Identity cleared');
  }
});

// Framework Events
nostr.on('framework:initialized', () => {
  console.log('Framework ready');
});
```

### Verschlüsselung (NIP-04/NIP-44) TypeScript

```typescript
import { NostrFramework, type SignerPlugin } from '@johappel/nostr-framework';

const nostr = new NostrFramework();
await nostr.initialize();

// Typisierter Signer
const signer: SignerPlugin | null = nostr.signer.getSigner();

if (signer) {
  const recipientPubkey = '...';
  const senderPubkey = '...';

  // NIP-04 Encrypt (mit Capability-Check)
  if (signer.nip04Encrypt) {
    const encrypted04: string = await signer.nip04Encrypt(
      recipientPubkey,
      'Secret message'
    );
    
    // NIP-04 Decrypt
    if (signer.nip04Decrypt) {
      const decrypted04: string = await signer.nip04Decrypt(
        senderPubkey,
        encrypted04
      );
    }
  }

  // NIP-44 Encrypt (moderner, mit Capability-Check)
  if (signer.nip44Encrypt) {
    const encrypted44: string = await signer.nip44Encrypt(
      recipientPubkey,
      'Secret message'
    );
    
    // NIP-44 Decrypt
    if (signer.nip44Decrypt) {
      const decrypted44: string = await signer.nip44Decrypt(
        senderPubkey,
        encrypted44
      );
    }
  }

  // Capabilities prüfen
  const capabilities = signer.getCapabilities();
  console.log('Signer capabilities:', capabilities);
}
```

### Metadaten abrufen (TypeScript)

```typescript
import { NostrFramework, type Identity, type NostrProfile } from '@johappel/nostr-framework';

const nostr = new NostrFramework();

// Metadaten werden automatisch geholt und typisiert
const identity: Identity = await nostr.identity.authenticate('nip07');
console.log('Display Name:', identity.displayName);

// Typisierte Metadaten
const profile: NostrProfile | undefined = identity.metadata;
if (profile) {
  console.log('Name:', profile.name);
  console.log('About:', profile.about);
  console.log('Picture:', profile.picture);
  console.log('NIP-05:', profile.nip05);
  console.log('LUD16:', profile.lud16);
}

// Manuell Metadaten aktualisieren
const updatedIdentity: Identity | null = await nostr.identity.refreshMetadata();
if (updatedIdentity?.metadata) {
  console.log('Updated profile:', updatedIdentity.metadata);
}
```

## 🧪 Testing

### Live Tests (Browser)

Öffne diese Dateien direkt im Browser:

- **NIP-07 Tests**: [test-nip07.html](test-nip07.html)
- **NIP-46 Tests**: [test-nip46.html](test-nip46.html)
- **NSEC Tests**: [test-nsec.html](test-nsec.html)
- **Relay Tests**: [test-relay.html](test-relay.html)
- **Storage Tests**: [test-storage.html](test-storage.html)

### Automatische Tests

```javascript
// In Browser Console:
import { runEventBusTests } from './framework/core/EventBus.test.js';
import { runIdentityManagerTests } from './framework/core/IdentityManager.test.js';

const results1 = runEventBusTests();
const results2 = await runIdentityManagerTests();

console.table(results1.tests);
console.table(results2.tests);
```

### Test-Features

Die Test-HTML-Dateien bieten interaktive UIs zum Testen aller Funktionen:
- ✅ Plugin-Registrierung
- ✅ Login/Logout mit allen Auth-Methoden
- ✅ Event-Signierung
- ✅ Verschlüsselung (NIP-04/NIP-44)
- ✅ Metadaten-Abruf
- ✅ Relay-Verbindungen
- ✅ Storage-Operationen

## 📁 Projektstruktur

```
nostr-client/
├── framework/
│   ├── core/                    # Core Module (TypeScript)
│   │   ├── EventBus.ts
│   │   ├── IdentityManager.ts
│   │   ├── RelayManager.ts
│   │   ├── EventManager.ts
│   │   ├── SignerManager.ts
│   │   ├── StorageManager.ts
│   │   └── TemplateEngine.ts
│   │
│   ├── plugins/
│   │   ├── auth/               # Auth-Plugins (TypeScript)
│   │   │   ├── AuthPlugin.ts
│   │   │   ├── Nip07Plugin.ts
│   │   │   ├── Nip46Plugin.ts
│   │   │   └── NsecPlugin.ts
│   │   ├── storage/            # Storage-Plugins
│   │   │   ├── StoragePlugin.ts
│   │   │   ├── LocalStoragePlugin.js
│   │   │   └── SQLitePlugin.js
│   │   └── signer/             # Signer-Plugins
│   │       ├── SignerPlugin.ts
│   │       └── MockSigner.js
│   │
│   ├── templates/              # Event-Templates
│   │   ├── EventTemplate.ts
│   │   ├── nip01.js
│   │   ├── nip09.js
│   │   └── nip52.js
│   │
│   ├── types/                  # TypeScript Definitions
│   │   └── index.ts           # Alle Framework-Typen
│   │
│   ├── config.ts              # Zentrale Konfiguration (TypeScript)
│   ├── index.ts              # Main export (TypeScript)
│   ├── tsconfig.json         # TypeScript Config
│   └── package.json          # Framework Package
│
├── docs/                      # Dokumentation
├── tests/                     # Next.js Test App
├── test-*.html               # Browser Test-Dateien
├── config.example.html       # Konfigurations-Beispiel
├── package.json
└── README.md
```

## 🔌 Verfügbare Events

### IdentityManager Events

- `identity:initialized` - Manager wurde initialisiert
- `identity:plugin-registered` - Plugin wurde registriert
- `identity:plugin-unregistered` - Plugin wurde entfernt
- `identity:login` - Login erfolgreich
- `identity:logout` - Logout erfolgreich
- `identity:changed` - Identity hat sich geändert
- `identity:error` - Fehler aufgetreten
- `identity:restored` - Session wurde wiederhergestellt

## 🔧 NIP-07 Requirements

Das NIP-07 Plugin benötigt eine installierte Browser-Extension:

- [Alby](https://getalby.com) (empfohlen)
- [nos2x](https://github.com/fiatjaf/nos2x)
- [Flamingo](https://www.flamingo.me)

## 🗺️ Roadmap

### ✅ Core Module (v1.0.0)
- [x] EventBus
- [x] IdentityManager
- [x] SignerManager
- [x] TemplateEngine
- [x] RelayManager
- [x] EventManager
- [x] StorageManager

### ✅ Auth-Plugins (v1.1.0)
- [x] AuthPlugin Interface
- [x] NIP-07 Plugin (Browser Extensions)
- [x] NIP-46 Plugin (Remote Bunker)
- [x] NSEC Plugin (⚠️ Unsafe - Testing Only)
- [x] Metadaten-Abruf für alle Plugins

### ✅ Features (v1.1.0)
- [x] Zentrale Konfiguration
- [x] CDN-Unterstützung
- [x] Metadaten-Caching
- [x] Test-Schlüssel-Generator
- [x] Vollständige NIP-04/NIP-44 Unterstützung

### ✅ Features (v2.0.0) - TypeScript Migration
- [x] Vollständige TypeScript-Unterstützung
- [x] Typisierte Core-Module
- [x] Type-Safe Plugin-Interfaces
- [x] Framework Event Types
- [x] Comprehensive Type Definitions
- [x] IntelliSense & Auto-Completion

### 🔮 Zukünftige Features
- [ ] Vollständige Plugin-Migration zu TypeScript
- [ ] Template-System zu TypeScript
- [ ] WordPress API Plugin
- [ ] NIP-05 Verifikation
- [ ] NIP-57 Zap Handling  
- [ ] NIP-28 Group Chat
- [ ] Erweiterte Templates
- [ ] React/Next.js Integration Hooks

### 🔮 Dokumentation
- [x] API-Dokumentation
- [x] Quickstart & Installation
- [x] Konfigurations-Guide
- [ ] Tutorials
- [ ] Beispiel-Projekte



## 🐛 Debugging

### Debug-Modus aktivieren

```javascript
const eventBus = new EventBus();
eventBus.setDebugMode(true);

// Alle Events werden jetzt in der Console geloggt
```

### Session prüfen

```javascript
// Session-Daten ansehen
const session = localStorage.getItem('nostr_framework_session');
console.log(JSON.parse(session));

// Session löschen
localStorage.removeItem('nostr_framework_session');
```

## 🤝 Contributing

Beiträge sind willkommen! Das Projekt folgt einem modularen, plugin-basierten Ansatz:

1. Jedes Modul ist unabhängig testbar
2. Plugins implementieren definierte Interfaces
3. Event-Bus für lose Kopplung
4. Ausführliche Tests für jedes Modul

## 📄 License

MIT

## 🙏 Credits

Gebaut mit:
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) - Nostr protocol utilities
- [Nostr NIPs](https://github.com/nostr-protocol/nips) - Nostr Implementation Possibilities

## 📦 CDN Link

Für schnelle Tests und Prototyping:

```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
  
  const nostr = new NostrFramework();
  await nostr.initialize();
  
  const identity = await nostr.authenticate('nip07');
  console.log('Hello from Nostr Framework!', identity.displayName);
</script>
```

**Version**: 2.0.0
**Letztes Update**: Vollständige TypeScript-Migration, typisierte Core-Module, Framework Event Types