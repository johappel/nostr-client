# Quick Start - Schneller Einstieg in 5 Minuten (TypeScript)

Dieses Tutorial zeigt Ihnen, wie Sie in nur 5 Minuten eine funktionierende Nostr-Anwendung mit dem Framework v2.0.0 und TypeScript erstellen.

## Schritt 1: Projekt einrichten (TypeScript)

### Option A: NPM/Vite Setup

```bash
# Erstelle ein neues Vite TypeScript Projekt
npm create vite@latest nostr-quick-start -- --template vanilla-ts
cd nostr-quick-start

# Installiere Framework
npm install @johappel/nostr-framework
npm install nostr-tools@^2.8.1

# Starte Development Server
npm run dev
```

Ersetzen Sie `src/main.ts` mit:

```typescript
import { NostrFramework, type FrameworkConfig, type Identity } from '@johappel/nostr-framework';

// TypeScript-typisierte Konfiguration
const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  debug: true
};

// Framework initialisieren
const nostr = new NostrFramework(config);

async function initApp() {
  await nostr.initialize();
  console.log('Framework initialized');
  
  // Event Listeners mit Typen
  const authBtn = document.getElementById('authBtn') as HTMLButtonElement;
  const publishBtn = document.getElementById('publishBtn') as HTMLButtonElement;
  
  authBtn?.addEventListener('click', async () => {
    try {
      const identity: Identity = await nostr.identity.authenticate('nip07');
      console.log('Authenticated:', identity.displayName || identity.npub);
    } catch (error) {
      console.error('Auth failed:', error);
    }
  });
}

initApp();
```

### Option B: HTML mit CDN (einfacher Start)

Erstellen Sie eine neue HTML-Datei namens `index.html`:

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nostr Quick Start</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        input { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; }
        .event { border: 1px solid #eee; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <h1>Nostr Quick Start Demo</h1>
    
    <div id="status" class="status info">Initialisiere Framework...</div>
    
    <div class="container">
        <h2>Authentifizierung</h2>
        <button id="authBtn">Mit NIP-07 verbinden</button>
        <div id="authInfo"></div>
    </div>
    
    <div class="container">
        <h2>Text Note veröffentlichen</h2>
        <input type="text" id="noteContent" placeholder="Was möchten Sie teilen?">
        <button id="publishBtn">Veröffentlichen</button>
        <div id="publishResult"></div>
    </div>
    
    <div class="container">
        <h2>Neueste Text Notes</h2>
        <button id="fetchBtn">Aktualisieren</button>
        <div id="eventsList"></div>
    </div>
    
    <script type="module">
        import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
        
        // Framework mit TypeScript-ähnlicher Nutzung initialisieren
        const nostr = new NostrFramework({
            relays: ['wss://relay.damus.io', 'wss://nos.lol'],
            debug: true
        });
        
        let currentIdentity = null;
        
        // Status-Update-Funktion
        function updateStatus(message, type = 'info') {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = `status ${type}`;
        }
        
        // Framework initialisieren
        async function initializeFramework() {
            try {
                await nostr.initialize();
                updateStatus('Framework initialisiert. Bereit für die Verbindung!', 'success');
                
                // Event-Listener für Framework-Events
                nostr.on('relay:connected', (relay) => {
                    console.log('Verbunden mit Relay:', relay.url);
                });
                
                nostr.on('relay:error', (error) => {
                    console.error('Relay-Fehler:', error);
                });
                
            } catch (error) {
                updateStatus(`Fehler bei der Initialisierung: ${error.message}`, 'error');
            }
        }
        
        // Authentifizierung
        document.getElementById('authBtn').addEventListener('click', async () => {
            try {
                if (!window.nostr) {
                    updateStatus('NIP-07 Wallet nicht gefunden. Bitte installieren Sie eine Nostr-Erweiterung.', 'error');
                    return;
                }
                
                updateStatus('Authentifiziere...', 'info');
                currentIdentity = await nostr.identity.authenticate('nip07');
                
                document.getElementById('authInfo').innerHTML = `
                    <p><strong>Authentifiziert als:</strong></p>
                    <p>npub: ${currentIdentity.npub}</p>
                    <p>Name: ${currentIdentity.name || 'Unbekannt'}</p>
                `;
                
                updateStatus('Erfolgreich authentifiziert!', 'success');
            } catch (error) {
                updateStatus(`Authentifizierung fehlgeschlagen: ${error.message}`, 'error');
            }
        });
        
        // Text Note veröffentlichen
        document.getElementById('publishBtn').addEventListener('click', async () => {
            const content = document.getElementById('noteContent').value.trim();
            
            if (!content) {
                updateStatus('Bitte geben Sie einen Text ein.', 'error');
                return;
            }
            
            if (!currentIdentity) {
                updateStatus('Bitte authentifizieren Sie sich zuerst.', 'error');
                return;
            }
            
            try {
                updateStatus('Veröffentliche Text Note...', 'info');
                
                const result = await nostr.events.createAndPublish('text-note', {
                    content: content,
                    tags: [['t', 'quick-start-demo']]
                });
                
                if (result.success) {
                    document.getElementById('publishResult').innerHTML = `
                        <p><strong>Erfolgreich veröffentlicht!</strong></p>
                        <p>Event ID: ${result.event.id}</p>
                        <p>Zeitstempel: ${new Date(result.event.created_at * 1000).toLocaleString()}</p>
                    `;
                    document.getElementById('noteContent').value = '';
                    updateStatus('Text Note veröffentlicht!', 'success');
                    
                    // Events aktualisieren
                    fetchTextNotes();
                } else {
                    updateStatus(`Veröffentlichung fehlgeschlagen: ${result.error}`, 'error');
                }
            } catch (error) {
                updateStatus(`Fehler bei der Veröffentlichung: ${error.message}`, 'error');
            }
        });
        
        // Text Notes abrufen
        async function fetchTextNotes() {
            try {
                updateStatus('Rufe Text Notes ab...', 'info');
                
                const events = await nostr.events.fetch({
                    kinds: [1], // Text Notes
                    limit: 10,
                    tags: [['t', 'quick-start-demo']]
                });
                
                const eventsList = document.getElementById('eventsList');
                
                if (events.length === 0) {
                    eventsList.innerHTML = '<p>Keine Events gefunden.</p>';
                } else {
                    eventsList.innerHTML = events.map(event => `
                        <div class="event">
                            <p><strong>${event.content}</strong></p>
                            <p>
                                <small>
                                    Von: ${event.pubkey.substring(0, 8)}... | 
                                    ${new Date(event.created_at * 1000).toLocaleString()}
                                </small>
                            </p>
                        </div>
                    `).join('');
                }
                
                updateStatus(`${events.length} Text Notes geladen`, 'success');
            } catch (error) {
                updateStatus(`Fehler beim Abrufen: ${error.message}`, 'error');
            }
        }
        
        // Event-Listener für den Aktualisierungs-Button
        document.getElementById('fetchBtn').addEventListener('click', fetchTextNotes);
        
        // Anwendung starten
        initializeFramework().then(() => {
            // Initiale Events laden
            setTimeout(fetchTextNotes, 1000);
        });
    </script>
</body>
</html>
```

## Schritt 2: Anwendung ausführen

1. Speichern Sie die Datei als `index.html` im Hauptverzeichnis Ihres Projekts
2. Öffnen Sie die Datei in einem modernen Webbrowser
3. Installieren Sie eine NIP-07 Wallet-Erweiterung wie [Alby](https://getalby.com/) oder [nos2x](https://github.com/fiatjaf/nos2x)
4. Klicken Sie auf "Mit NIP-07 verbinden" und erlauben Sie den Zugriff
5. Geben Sie einen Text ein und klicken Sie auf "Veröffentlichen"

## Schritt 3: Was passiert hier?

### Framework-Initialisierung
```javascript
const nostr = new NostrFramework({
    relays: ['wss://relay.damus.io', 'wss://nos.lol'],
    storage: new LocalStoragePlugin(),
    debug: true
});
```
- Verbindung zu zwei öffentlichen Relays
- Lokale Speicherung mit LocalStorage
- Debug-Modus für detaillierte Logs

### Authentifizierung
```javascript
currentIdentity = await nostr.identity.authenticate('nip07');
```
- Verwendung der NIP-07 Browser-Erweiterung
- Sicherer Zugriff auf den privaten Schlüssel
- Die Anwendung erhält nur die öffentlichen Daten

### Event-Erstellung und -Veröffentlichung
```javascript
const result = await nostr.events.createAndPublish('text-note', {
    content: content,
    tags: [['t', 'quick-start-demo']]
});
```
- Erstellung eines Text Notes mit dem Template-System
- Automatische Signierung mit dem privaten Schlüssel
- Veröffentlichung auf allen konfigurierten Relays

### Event-Abruf
```javascript
const events = await nostr.events.fetch({
    kinds: [1], // Text Notes
    limit: 10,
    tags: [['t', 'quick-start-demo']]
});
```
- Abruf der neuesten Text Notes
- Filterung nach Tag `quick-start-demo`
- Begrenzung auf 10 Events

## Nächste Schritte

Nachdem Sie diese Demo ausprobiert haben, können Sie:

1. [Getting Started Tutorial](./getting-started.md) - Detaillierte Einführung in die Konzepte
2. [Installation Guide](./installation.md) - Verschiedene Installationsmethoden
3. [API-Referenz](../api/) - Vollständige Dokumentation aller Funktionen
4. [Beispiele](../examples/) - Weitere praktische Beispiele

## Erweiterungsmöglichkeiten

Versuchen Sie, die Anwendung zu erweitern:

- **User Metadata**: Abrufen und Anzeigen von Benutzerprofilen
- **Reactions**: Hinzufügen von Reaktionen auf Events
- **Direct Messages**: Verschlüsselte Nachrichten senden
- **Media Upload**: Bilder und andere Medien teilen
- **Custom Tags**: Eigene Tags für bessere Organisation

## Häufige Fragen

### Warum sehe ich keine Events?

Mögliche Ursachen:
- Keine Verbindung zu den Relays (prüfen Sie die Konsole)
- Noch keine Events mit dem Tag `quick-start-demo`
- Firewall oder Netzwerkprobleme

### Was ist NIP-07?

NIP-07 ist ein Standard für die Integration von Nostr-Wallets in Browser. Er ermöglicht sichere Interaktionen mit Nostr, ohne dass private Schlüssel die Wallet verlassen müssen.

### Kann ich ohne Wallet-Erweiterung arbeiten?

Ja, das Framework unterstützt auch andere Authentifizierungsmethoden:
- Lokale Schlüssel (nur für Entwicklung)
- NIP-46 (Remote-Signierung)
- OAuth2-Integrationen

## Ressourcen

- [Nostr-Protokoll](https://github.com/nostr-protocol/nostr)
- [NIPs-Dokumentation](https://github.com/nostr-protocol/nips)
- [Community](https://github.com/nostr-protocol/nostr/discussions)
- [Relay-Liste](https://nostr.watch/relays)