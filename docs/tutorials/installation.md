# Installationsanleitung

Diese Anleitung zeigt Ihnen verschiedene Möglichkeiten, das Nostr Framework zu installieren und in Ihren Projekten zu verwenden.

## Voraussetzungen

Bevor Sie mit der Installation beginnen, stellen Sie sicher, dass Sie folgende Anforderungen erfüllen:

- **Node.js** Version 14.0 oder höher (für die Entwicklung)
- **npm** Version 6.0 oder höher oder **yarn** Version 1.22 oder höher
- Ein moderner Webbrowser (Chrome 88+, Firefox 85+, Safari 14+ oder Edge 88+)
- Grundkenntnisse in JavaScript (ES6+)

## Installationsmethoden

### Methode 1: NPM (empfohlen für Produktionsprojekte)

Die Installation über NPM ist die empfohlene Methode für die meisten Projekte.

```bash
npm install @johappel/nostr-framework
```

#### Vorteile
- Automatische Verwaltung von Abhängigkeiten
- Einfache Updates mit `npm update`
- Kompatibel mit Build-Tools wie Webpack, Rollup oder Vite
- Unterstützung für TypeScript-Typen

#### Nachteile
- Erfordert einen Build-Schritt für Browser-Anwendungen

#### Verwendung

```javascript
// ES6-Module
import { NostrFramework, LocalStoragePlugin } from '@johappel/nostr-framework';

// CommonJS (Node.js)
const { NostrFramework, LocalStoragePlugin } = require('@johappel/nostr-framework');
```

### Methode 2: CDN (für schnelle Prototypen und Demos)

Die CDN-Methode ist ideal für schnelle Tests, Demos oder wenn Sie keinen Build-Prozess verwenden möchten.

```html
<!-- JSR CDN -->
<script type="module">
  import { NostrFramework } from 'https://cdn.jsr.io/@johappel/nostr-framework/framework/index.js';
</script>

<!-- jsDelivr CDN -->
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
</script>

<!-- UNPKG CDN -->
<script type="module">
  import { NostrFramework } from 'https://unpkg.com/@johappel/nostr-framework/framework/index.js';
</script>
```

#### Vorteile
- Kein Build-Prozess erforderlich
- Sofort einsatzbereit
- Ideal für CodePen, JSFiddle oder ähnliche Plattformen

#### Nachteile
- Nicht für Produktionsanwendungen geeignet
- Keine automatischen Updates
- Größere Bundle-Größe

### Methode 3: Lokale Entwicklung (für Framework-Entwickler)

Wenn Sie am Framework selbst entwickeln oder die neueste Entwicklungsversion verwenden möchten.

```bash
# Klonen des Repository
git clone https://github.com/nostr/framework.git
cd framework

# Abhängigkeiten installieren
npm install

# Framework bauen
npm run build

# Lokales Paket erstellen
npm pack
```

#### Verwendung des lokalen Pakets

```bash
# In Ihrem Projektverzeichnis
npm install /pfad/zum/framework/nostr-framework-x.x.x.tgz
```

#### Vorteile
- Zugriff auf die neuesten Funktionen
- Möglichkeit, am Framework mitzuwirken
- Volle Kontrolle über den Build-Prozess

#### Nachteile
- Erfordert manuelle Updates
- Potenziell instabile Entwicklungsversionen

## Projekt-Setup

### Browser-Anwendung

#### 1. Grundlegende HTML-Struktur

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meine Nostr-Anwendung</title>
</head>
<body>
    <div id="app">
        <h1>Nostr Framework Demo</h1>
        <div id="output"></div>
    </div>
    
    <script type="module">
        import { NostrFramework, LocalStoragePlugin } from '@johappel/nostr-framework';
        
        // Ihr Code hier
    </script>
</body>
</html>
```

#### 2. Mit Build-Tools (Vite)

```bash
# Neues Projekt erstellen
npm create vite@latest my-nostr-app -- --template vanilla
cd my-nostr-app

# Abhängigkeiten installieren
npm install

# Nostr Framework hinzufügen
npm install @johappel/nostr-framework
```

```javascript
// main.js
import { NostrFramework, LocalStoragePlugin } from '@johappel/nostr-framework';

const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io'],
    storage: new LocalStoragePlugin()
});

await nostr.initialize();
```

### Node.js-Anwendung

#### 1. Projekt einrichten

```bash
# Neues Projekt erstellen
mkdir my-nostr-server
cd my-nostr-server
npm init -y

# Abhängigkeiten installieren
npm install @johappel/nostr-framework
npm install --save-dev @types/node
```

#### 2. Polyfills für Node.js

```javascript
// server.js
import { WebSocket } from 'ws';
import { fetch } from 'node-fetch';

// Polyfills für Node.js-Umgebung
global.WebSocket = WebSocket;
global.fetch = fetch;

import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io']
});

await nostr.initialize();
```

### React-Anwendung

#### 1. Projekt erstellen

```bash
# Neues React-Projekt
npx create-react-app my-nostr-react-app
cd my-nostr-react-app

# Nostr Framework installieren
npm install @nostr/framework
```

#### 2. Hook für Nostr

```javascript
// hooks/useNostr.js
import { useState, useEffect } from 'react';
import { NostrFramework, LocalStoragePlugin } from '@nostr/framework';

export function useNostr() {
    const [nostr, setNostr] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        const initNostr = async () => {
            const nostrInstance = new NostrFramework({
                relays: ['wss://relay.damus.io'],
                storage: new LocalStoragePlugin()
            });
            
            await nostrInstance.initialize();
            setNostr(nostrInstance);
            setIsInitialized(true);
        };
        
        initNostr();
    }, []);
    
    return { nostr, isInitialized };
}
```

#### 3. Verwendung in Komponenten

```javascript
// components/NostrComponent.js
import { useNostr } from '../hooks/useNostr';

function NostrComponent() {
    const { nostr, isInitialized } = useNostr();
    
    if (!isInitialized) {
        return <div>Lade...</div>;
    }
    
    const publishNote = async () => {
        // Ihre Logik hier
    };
    
    return (
        <div>
            <button onClick={publishNote}>Note veröffentlichen</button>
        </div>
    );
}
```

### Vue-Anwendung

#### 1. Projekt erstellen

```bash
# Neues Vue-Projekt
npm create vue@latest my-nostr-vue-app
cd my-nostr-vue-app
npm install

# Nostr Framework installieren
npm install @nostr/framework
```

#### 2. Plugin für Vue

```javascript
// plugins/nostr.js
import { NostrFramework, LocalStoragePlugin } from '@nostr/framework';

export default {
    install: async (app) => {
        const nostr = new NostrFramework({
            relays: ['wss://relay.damus.io'],
            storage: new LocalStoragePlugin()
        });
        
        await nostr.initialize();
        
        app.config.globalProperties.$nostr = nostr;
        app.provide('nostr', nostr);
    }
};
```

#### 3. Verwendung in Komponenten

```javascript
// components/NostrComponent.vue
<template>
    <div>
        <button @click="publishNote">Note veröffentlichen</button>
    </div>
</template>

<script>
import { inject } from 'vue';

export default {
    name: 'NostrComponent',
    setup() {
        const nostr = inject('nostr');
        
        const publishNote = async () => {
            // Ihre Logik hier
        };
        
        return { publishNote };
    }
};
</script>
```

## Konfiguration

### Grundlegende Konfiguration

```javascript
const nostr = new NostrFramework({
    // Relay-Liste
    relays: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social'
    ],
    
    // Storage-Plugin
    storage: new LocalStoragePlugin(),
    
    // Debug-Modus
    debug: process.env.NODE_ENV === 'development',
    
    // Zeitüberschreitungen
    timeouts: {
        connect: 5000,
        publish: 10000,
        fetch: 15000
    },
    
    // Wiederholungsversuche
    retryAttempts: 3,
    
    // Automatische Synchronisation
    autoSync: true,
    
    // Cache-Konfiguration
    cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 300000 // 5 Minuten
    }
});
```

### Umgebungsvariablen

```bash
# .env
VITE_NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol
VITE_NOSTR_DEBUG=true
VITE_NOSTR_STORAGE_TYPE=local
```

```javascript
// Verwendung in Ihrer Anwendung
const nostr = new NostrFramework({
    relays: import.meta.env.VITE_NOSTR_RELAYS.split(','),
    debug: import.meta.env.VITE_NOSTR_DEBUG === 'true'
});
```

## Fehlerbehebung

### Häufige Installationsprobleme

#### 1. Modul nicht gefunden

**Problem:** `Cannot resolve '@johappel/nostr-framework'`

**Lösung:**
```bash
# Überprüfen Sie die Installation
npm list @johappel/nostr-framework

# Neu installieren
npm uninstall @johappel/nostr-framework
npm install @johappel/nostr-framework
```

#### 2. TypeScript-Fehler

**Problem:** `Cannot find module '@johappel/nostr-framework' or its corresponding type declarations.`

**Lösung:**
```bash
# TypeScript-Typen installieren
npm install --save-dev @types/node

# tsconfig.json überprüfen
{
    "compilerOptions": {
        "moduleResolution": "node",
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true
    }
}
```

#### 3. CORS-Fehler im Browser

**Problem:** `Access to fetch at 'wss://relay.damus.io' has been blocked by CORS policy.`

**Lösung:**
```javascript
// Stellen Sie sicher, dass Sie über HTTPS oder localhost arbeiten
// Für die Entwicklung können Sie ein lokales Zertifikat verwenden
npm install --save-dev mkcert
mkcert create-ca
mkcert create-cert
```

#### 4. WebSocket-Verbindungsprobleme

**Problem:** `WebSocket connection to 'wss://relay.damus.io' failed`

**Lösung:**
```javascript
// Verbindungs-Timeout erhöhen
const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io'],
    timeouts: {
        connect: 10000 // 10 Sekunden
    }
});

// Alternative Relays versuchen
const nostr = new NostrFramework({
    relays: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social'
    ]
});
```

### Entwicklertools

#### Debug-Modus aktivieren

```javascript
const nostr = new NostrFramework({
    debug: true // Aktiviert detaillierte Logs
});
```

#### Event-Listener für Fehler

```javascript
nostr.on('error', (error) => {
    console.error('Framework-Fehler:', error);
});

nostr.on('relay:error', (relay, error) => {
    console.error(`Relay-Fehler (${relay.url}):`, error);
});
```

## Nächste Schritte

Nach der erfolgreichen Installation können Sie:

1. [Getting Started Tutorial](./getting-started.md) - Grundlegende Konzepte lernen
2. [Quick Start Tutorial](./quick-start.md) - Schnelle Demo-Anwendung erstellen
3. [API-Referenz](../api/) - Alle Funktionen erkunden
4. [Beispiele](../examples/) - Praktische Anwendungen ansehen

## Unterstützung

Bei Problemen mit der Installation:

1. Überprüfen Sie die [FAQ](../faq.md)
2. Suchen Sie nach [bestehenden Issues](https://github.com/nostr/framework/issues)
3. Erstellen Sie ein [neues Issue](https://github.com/nostr/framework/issues/new)
4. Treten Sie der [Community-Diskussion](https://github.com/nostr/framework/discussions) bei