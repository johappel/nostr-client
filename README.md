# Nostr Framework

Ein modulares, plugin-basiertes Framework für Nostr-Client-Entwicklung mit Multi-Provider-Authentifizierung.

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

```javascript
import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

await nostr.initialize();

// Authentifizierung
const identity = await nostr.authenticate('nip07');
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

### Core Module

#### 1. EventBus
- Event-Bus für Framework-interne Kommunikation
- Observer-Pattern
- Debug-Modus

**Datei**: [`framework/core/EventBus.js`](framework/core/EventBus.js)

#### 2. IdentityManager
- Zentrale Identity-Verwaltung
- Multi-Provider-Authentifizierung
- Plugin-Registry-System
- Session-Persistenz (localStorage)
- 7 Events für Identity-Änderungen

**Datei**: [`framework/core/IdentityManager.js`](framework/core/IdentityManager.js)

#### 3. RelayManager
- Multi-Relay-Verbindung
- Automatische Reconnect-Logik
- Event-Filterung und Subscription

**Datei**: [`framework/core/RelayManager.js`](framework/core/RelayManager.js)

#### 4. EventManager
- Event-Erstellung und -Validierung
- Templates für verschiedene Event-Typen
- Signierung über verschiedene Provider

**Datei**: [`framework/core/EventManager.js`](framework/core/EventManager.js)

#### 5. SignerManager
- Zentrale Signier-Verwaltung
- Multi-Provider-Unterstützung
- Verschlüsselung (NIP-04, NIP-44)

**Datei**: [`framework/core/SignerManager.js`](framework/core/SignerManager.js)

#### 6. StorageManager
- Plugin-basiertes Storage
- LocalStorage und SQLite Unterstützung
- Daten-Persistenz

**Datei**: [`framework/core/StorageManager.js`](framework/core/StorageManager.js)

#### 7. TemplateEngine
- Event-Templates
- NIP-konforme Event-Erstellung
- Wiederverwendbare Vorlagen

**Datei**: [`framework/core/TemplateEngine.js`](framework/core/TemplateEngine.js)

### Auth Plugins

#### AuthPlugin (Base Interface)
- Base-Klasse für alle Auth-Plugins
- Definiert Interface-Methoden

**Datei**: [`framework/plugins/auth/AuthPlugin.js`](framework/plugins/auth/AuthPlugin.js)

#### NIP-07 Plugin ✨
- Browser-Extension-Unterstützung (Alby, nos2x, Flamingo)
- Event-Signierung
- NIP-04 Verschlüsselung/Entschlüsselung
- NIP-44 Verschlüsselung/Entschlüsselung
- Automatische Session-Wiederherstellung
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/Nip07Plugin.js`](framework/plugins/auth/Nip07Plugin.js)

#### NIP-46 Plugin 🔗
- Remote Signer (Bunker) Unterstützung
- bunker:// und nostrconnect:// URIs
- Auto-Reconnect
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/Nip46Plugin.js`](framework/plugins/auth/Nip46Plugin.js)

#### NSEC Plugin ⚠️
- **UNSAFE** - Nur für Testing/Entwicklung
- Lokale nsec/hex Schlüssel
- Volle NIP-04/NIP-44 Unterstützung
- Test-Schlüssel-Generator
- **Metadaten-Abruf** (displayName, profile info)

**Datei**: [`framework/plugins/auth/NsecPlugin.js`](framework/plugins/auth/NsecPlugin.js)

### Konfiguration

#### Zentrale Config
- Überschreibbare Standard-Werte
- Relays, nostr-tools URL, Cache-Dauer
- User-spezifische Konfiguration

**Datei**: [`framework/config.js`](framework/config.js)
**Beispiel**: [`config.example.html`](config.example.html)

## 💻 Verwendung

### Basic Example

```javascript
import { NostrFramework } from '@johappel/nostr-framework';

// Initialize mit Standard-Config
const nostr = new NostrFramework();
await nostr.initialize();

// Login mit NIP-07 Extension
const identity = await nostr.authenticate('nip07');
console.log('Logged in:', identity.displayName || identity.npub);

// Event erstellen und signieren
const event = await nostr.createEvent({
  kind: 1,
  content: 'Hello Nostr!'
});

const signed = await nostr.signEvent(event);
await nostr.publishEvent(signed);
```

### Mit Konfiguration

```javascript
// Config vor Framework-Laden definieren
window.NostrConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ],
  metadataCacheDuration: 1800000 // 30 Minuten
};

import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework();
await nostr.initialize();
```

### Verschiedene Auth-Methoden

```javascript
// NIP-07 (Browser Extension)
const identity1 = await nostr.authenticate('nip07');

// NIP-46 (Remote Bunker)
const identity2 = await nostr.authenticate('nip46', {
  uri: 'bunker://...'
});

// NSEC (⚠️ UNSAFE - nur für Tests)
const identity3 = await nostr.authenticate('nsec', {
  nsec: 'nsec1...'
});

// Test-Schlüssel generieren (⚠️ UNSAFE)
const { NsecPlugin } = await import('@johappel/nostr-framework/plugins/auth/NsecPlugin.js');
const testKey = await NsecPlugin.generateTestKey();
console.log('Test nsec:', testKey.nsec);
```

### Mit Event Listeners

```javascript
// Identity-Änderungen überwachen
nostr.on('identity:login', (data) => {
  console.log('User logged in:', data.identity.displayName);
});

nostr.on('identity:logout', (data) => {
  console.log('User logged out');
});

nostr.on('identity:changed', (identity) => {
  if (identity) {
    console.log('Identity changed:', identity.displayName || identity.npub);
  } else {
    console.log('Identity cleared');
  }
});
```

### Verschlüsselung (NIP-04/NIP-44)

```javascript
const signer = nostr.getSigner();

// NIP-04 Encrypt
const encrypted04 = await signer.nip04Encrypt(
  recipientPubkey,
  'Secret message'
);

// NIP-04 Decrypt
const decrypted04 = await signer.nip04Decrypt(
  senderPubkey,
  encrypted04
);

// NIP-44 Encrypt (moderner)
const encrypted44 = await signer.nip44Encrypt(
  recipientPubkey,
  'Secret message'
);

// NIP-44 Decrypt
const decrypted44 = await signer.nip44Decrypt(
  senderPubkey,
  encrypted44
);
```

### Metadaten abrufen

```javascript
// Metadaten werden automatisch geholt
const identity = await nostr.authenticate('nip07');
console.log('Display Name:', identity.displayName);
console.log('Profile:', identity.metadata);

// Manuell Metadaten aktualisieren
const updatedIdentity = await nostr.refreshMetadata();
console.log('Updated:', updatedIdentity.metadata);
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
│   ├── core/                    # Core Module
│   │   ├── EventBus.js
│   │   ├── IdentityManager.js
│   │   ├── RelayManager.js
│   │   ├── EventManager.js
│   │   ├── SignerManager.js
│   │   ├── StorageManager.js
│   │   └── TemplateEngine.js
│   │
│   ├── plugins/
│   │   ├── auth/               # Auth-Plugins
│   │   │   ├── AuthPlugin.js
│   │   │   ├── Nip07Plugin.js
│   │   │   ├── Nip46Plugin.js
│   │   │   └── NsecPlugin.js
│   │   ├── storage/            # Storage-Plugins
│   │   │   ├── StoragePlugin.js
│   │   │   ├── LocalStoragePlugin.js
│   │   │   └── SQLitePlugin.js
│   │   └── signer/             # Signer-Plugins
│   │       ├── SignerPlugin.js
│   │       └── MockSigner.js
│   │
│   ├── templates/              # Event-Templates
│   │   ├── EventTemplate.js
│   │   ├── nip01.js
│   │   ├── nip09.js
│   │   └── nip52.js
│   │
│   ├── config.js               # Zentrale Konfiguration
│   └── index.js               # Main export
│
├── docs/                      # Dokumentation
├── test-*.html               # Test-Dateien
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

### ✅ Features (v1.1.2)
- [x] TypeScript Support

### 🔮 Zukünftige Features
- [ ] WordPress API Plugin
- [ ] NIP-05 Verifikation
- [ ] NIP-57 Zap Handling
- [ ] NIP-28 Group Chat
- [ ] Erweiterte Templates

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

**Version**: 1.1.6
**Letztes Update**: Metadaten-Abruf, zentrale Konfiguration, NSEC Plugin