# Nostr Framework

Ein modulares, plugin-basiertes Framework für Nostr-Client-Entwicklung mit Multi-Provider-Authentifizierung.

[![npm version](https://badge.fury.io/js/@johappel%2Fnostr-framework.svg)](https://badge.fury.io/js/@johappel%2Fnostr-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### 1. Installation

```bash
npm install @johappel/nostr-framework
```

### 2. Basic Usage

```javascript
import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

await nostr.initialize();
```

### 3. Development Setup

For local development:

```bash
git clone https://github.com/johappel/nostr-client.git
cd nostr-client
npm install
```

Dies installiert:
- `nostr-tools` (v2.8.1) - Für NIP-19 encoding/decoding und andere Nostr-Utilities

### 2. Development Server starten

Verwende VS Code Live Server oder einen anderen lokalen Webserver:

```bash
# VS Code: Rechtsklick auf HTML-Datei → "Open with Live Server"
# Oder nutze einen anderen Server, z.B.:
npx serve .
```

### 3. Tests ausführen

Öffne eine der Test-Dateien im Browser:

- **EventBus Tests**: http://127.0.0.1:5500/test-eventbus.html
- **IdentityManager Tests**: http://127.0.0.1:5500/test-identity.html
- **NIP-07 Plugin Tests**: http://127.0.0.1:5500/test-nip07.html

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

**Datei**: [`framework/plugins/auth/Nip07Plugin.js`](framework/plugins/auth/Nip07Plugin.js)

## 💻 Verwendung

### Basic Example

```javascript
import { IdentityManager } from './framework/index.js';
import { Nip07Plugin } from './framework/index.js';

// Initialize
const manager = new IdentityManager();
const plugin = new Nip07Plugin();

await plugin.initialize();
manager.registerPlugin('nip07', plugin);

// Login
const identity = await manager.authenticate('nip07');
console.log('Logged in:', identity.npub);

// Get signer
const signer = manager.getSigner();

// Sign event
const event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'Hello Nostr!'
};

const signed = await signer.signEvent(event);
console.log('Signed event:', signed);
```

### Mit Event Listeners

```javascript
// Listen to identity changes
manager.on('identity:login', (data) => {
  console.log('User logged in:', data.identity);
});

manager.on('identity:logout', (data) => {
  console.log('User logged out');
});

manager.on('identity:changed', (identity) => {
  if (identity) {
    console.log('Identity changed:', identity.npub);
  } else {
    console.log('Identity cleared');
  }
});
```

### Verschlüsselung (NIP-04)

```javascript
const signer = manager.getSigner();

// Encrypt
const encrypted = await signer.nip04Encrypt(
  recipientPubkey,
  'Secret message'
);

// Decrypt
const decrypted = await signer.nip04Decrypt(
  senderPubkey,
  encrypted
);
```

## 🧪 Testing

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

### Manuelle Tests

Die Test-HTML-Dateien bieten interaktive UIs zum Testen aller Funktionen:
- Plugin-Registrierung
- Login/Logout
- Event-Signierung
- Verschlüsselung
- Event-Monitoring

## 📁 Projektstruktur

```
nostr-client/
├── framework/
│   ├── core/
│   │   ├── EventBus.js
│   │   ├── EventBus.test.js
│   │   ├── EventBus.VALIDATION.md
│   │   ├── IdentityManager.js
│   │   ├── IdentityManager.test.js
│   │   └── IdentityManager.VALIDATION.md
│   │
│   ├── plugins/
│   │   └── auth/
│   │       ├── AuthPlugin.js
│   │       └── Nip07Plugin.js
│   │
│   ├── index.js (Main export)
│   └── AGENTS.md (Implementation roadmap)
│
├── test-eventbus.html
├── test-identity.html
├── test-nip07.html
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

### ✅ Phase 1: Core Module (Abgeschlossen)
- [x] EventBus
- [x] IdentityManager
- [x] AuthPlugin Interface
- [x] NIP-07 Plugin

### ⏳ Phase 2: Weitere Module (In Planung)
- [x] SignerManager
- [x] TemplateEngine
- [x] RelayManager
- [x] EventManager
- [x] StorageManager

### 🔮 Phase 3: Weitere Auth-Plugins
- [x] NIP-46 Plugin (Bunker)
- [ ] Local Key Plugin (nsec)
- [ ] WordPress API Plugin

### 🔮 Phase 4: Dokumentation
- [x] API-Dokumentation
- [x] Quickstart & Installation
- [ ] Tutorials
- [ ] Beispiele


## 📚 Dokumentation

Detaillierte Dokumentation für jedes Modul:

- [EventBus Validierung](framework/core/EventBus.VALIDATION.md)
- [IdentityManager Validierung](framework/core/IdentityManager.VALIDATION.md)
- [Implementierungs-Roadmap](framework/AGENTS.md)

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