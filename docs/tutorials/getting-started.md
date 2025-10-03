# Getting Started mit dem Nostr Framework

Dieses Tutorial führt Sie durch die grundlegenden Konzepte und die ersten Schritte mit dem Nostr Framework.

## Voraussetzungen

Bevor Sie beginnen, stellen Sie sicher, dass Sie Folgendes haben:

- Grundkenntnisse in JavaScript (ES6+)
- Ein moderner Webbrowser (Chrome 88+, Firefox 85+, Safari 14+ oder Edge 88+)
- Optional: Node.js für serverseitige Entwicklung

## Grundlegende Konzepte

### Was ist Nostr?

Nostr (Notes and Other Stuff Transmitted by Relays) ist ein dezentralisiertes Protokoll für kryptographisch sichere, zensurresistente soziale Netzwerke.

### Framework-Architektur

Das Nostr Framework ist modular aufgebaut und besteht aus folgenden Hauptkomponenten:

- **EventBus**: Zentrales Event-System für die Kommunikation zwischen Modulen
- **IdentityManager**: Verwaltung von Identitäten und Authentifizierung
- **SignerManager**: Signierung und Verschlüsselung von Events
- **TemplateEngine**: Vorlagen für die Erstellung von Events
- **RelayManager**: Verbindung zu Nostr-Relays
- **EventManager**: Verwaltung von Events
- **StorageManager**: Lokale Speicherung von Daten

## Erstes Projekt einrichten

### 1. Installation

Sie haben mehrere Möglichkeiten, das Framework zu installieren:

#### NPM (empfohlen)

```bash
npm install @nostr/framework
```

#### CDN

```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@nostr/framework/dist/index.js';
</script>
```

#### Lokal

```bash
git clone https://github.com/nostr/framework.git
cd framework
npm install
npm run build
```

### 2. Grundlegende Anwendung erstellen

Erstellen Sie eine neue HTML-Datei:

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meine erste Nostr-Anwendung</title>
</head>
<body>
    <h1>Meine erste Nostr-Anwendung</h1>
    <div id="output"></div>
    
    <script type="module">
        import { NostrFramework, LocalStoragePlugin } from './framework/index.js';
        
        // Framework initialisieren
        const nostr = new NostrFramework({
            relays: ['wss://relay.damus.io', 'wss://nos.lol'],
            storage: new LocalStoragePlugin(),
            debug: true
        });
        
        // Anwendung starten
        async function startApp() {
            try {
                await nostr.initialize();
                document.getElementById('output').textContent = 'Framework initialisiert!';
                
                // Authentifizieren (NIP-07)
                if (window.nostr) {
                    const identity = await nostr.identity.authenticate('nip07');
                    console.log('Authenticated as:', identity.npub);
                    document.getElementById('output').textContent += '\nAuthentifiziert als: ' + identity.npub;
                } else {
                    document.getElementById('output').textContent += '\nNIP-07 Wallet nicht gefunden. Bitte installieren Sie eine Nostr-Erweiterung.';
                }
            } catch (error) {
                console.error('Fehler bei der Initialisierung:', error);
                document.getElementById('output').textContent = 'Fehler: ' + error.message;
            }
        }
        
        startApp();
    </script>
</body>
</html>
```

### 3. Events erstellen und veröffentlichen

Fügen Sie die folgende Funktion hinzu, um Text Notes zu erstellen:

```javascript
async function publishTextNote(content) {
    try {
        const result = await nostr.events.createAndPublish('text-note', {
            content: content,
            tags: [['t', 'getting-started']]
        });
        
        if (result.success) {
            console.log('Event veröffentlicht:', result.event);
            return result.event;
        } else {
            console.error('Fehler beim Veröffentlichen:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Fehler:', error);
        return null;
    }
}

// Beispielaufruf
publishTextNote('Hallo von meiner ersten Nostr-Anwendung!');
```

### 4. Events abrufen

Fügen Sie die folgende Funktion hinzu, um Events von Relays abzurufen:

```javascript
async function fetchTextNotes(limit = 10) {
    try {
        const events = await nostr.events.fetch({
            kinds: [1], // Text Notes
            limit: limit
        });
        
        console.log('Gefundene Events:', events);
        return events;
    } catch (error) {
        console.error('Fehler beim Abrufen:', error);
        return [];
    }
}

// Beispielaufruf
fetchTextNotes(5).then(events => {
    const output = document.getElementById('output');
    events.forEach(event => {
        const div = document.createElement('div');
        div.textContent = `${event.content} - ${new Date(event.created_at * 1000).toLocaleString()}`;
        output.appendChild(div);
    });
});
```

## Nächste Schritte

Nachdem Sie die Grundlagen verstanden haben, können Sie:

1. [Quick Start Tutorial](./quick-start.md) - Schneller Einstieg in 5 Minuten
2. [Installation Guide](./installation.md) - Detaillierte Installationsanleitung
3. [API-Referenz](../api/) - Vollständige API-Dokumentation
4. [Beispiele](../examples/) - Praktische Code-Beispiele

## Häufige Probleme

### NIP-07 Wallet nicht gefunden

Stellen Sie sicher, dass Sie eine Nostr-Browsererweiterung installiert haben, wie z.B.:
- [Alby](https://getalby.com/)
- [nos2x](https://github.com/fiatjaf/nos2x)
- [Flamingo](https://flamingo.zone/)

### Relay-Verbindungsprobleme

Überprüfen Sie, ob die Relay-URLs korrekt sind und ob die Relays online sind. Sie können die Verbindung mit dem Debug-Modus überwachen:

```javascript
const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io'],
    debug: true // Aktiviert detaillierte Logs
});
```

### Events werden nicht veröffentlicht

Stellen Sie sicher, dass:
1. Sie authentifiziert sind
2. Die Relay-Verbindung besteht
3. Das Event korrekt formatiert ist

## Ressourcen

- [Nostr-Protokoll-Spezifikation](https://github.com/nostr-protocol/nostr)
- [NIPs (Nostr Improvement Proposals)](https://github.com/nostr-protocol/nips)
- [Community-Discussions](https://github.com/nostr-protocol/nostr/discussions)