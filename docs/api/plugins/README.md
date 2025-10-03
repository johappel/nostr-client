# Plugin APIs

Das Nostr Framework verwendet ein plugin-basiertes Architektur für erweiterbare Funktionalität. Diese Sektion dokumentiert alle verfügbaren Plugin-Interfaces und Implementierungen.

## Plugin-Typen

- [AuthPlugin](./AuthPlugin.md) - Authentifizierungs-Plugins
- [SignerPlugin](./SignerPlugin.md) - Signier-Plugins  
- [StoragePlugin](./StoragePlugin.md) - Speicher-Plugins

## Authentifizierungs-Plugins

### Verfügbare Implementierungen

- [Nip07Plugin](./Nip07Plugin.md) - Browser Extension (NIP-07)
- [Nip46Plugin](./Nip46Plugin.md) - Remote Signer (NIP-46)
- [LocalKeyPlugin](./LocalKeyPlugin.md) - Lokale Private Keys
- [WordPressPlugin](./WordPressPlugin.md) - WordPress.com Integration

## Signier-Plugins

### Verfügbare Implementierungen

- [MockSigner](./MockSigner.md) - Mock Signer für Tests
- [BrowserSigner](./BrowserSigner.md) - Browser-basierter Signer
- [RemoteSigner](./RemoteSigner.md) - Remote Signer

## Speicher-Plugins

### Verfügbare Implementierungen

- [LocalStoragePlugin](./LocalStoragePlugin.md) - Browser localStorage
- [IndexedDBPlugin](./IndexedDBPlugin.md) - IndexedDB Storage
- [SQLitePlugin](./SQLitePlugin.md) - SQLite Database (WASM)
- [SQLiteFilePlugin](./SQLiteFilePlugin.md) - SQLite File Storage

## Plugin-Entwicklung

### Eigenes Plugin erstellen

1. **Interface implementieren**: Erben vom Basis-Interface
2. **Methoden implementieren**: Alle erforderlichen Methoden implementieren
3. **Registrieren**: Plugin im entsprechenden Manager registrieren
4. **Testen**: Plugin mit Testsuite validieren

### Beispiel: Eigenes Auth-Plugin

```javascript
import { AuthPlugin } from './framework/plugins/auth/AuthPlugin.js';

class CustomAuthPlugin extends AuthPlugin {
  constructor() {
    super();
    this.name = 'custom';
    this.displayName = 'Custom Auth';
  }

  async initialize() {
    this._markInitialized();
  }

  async isLoggedIn() {
    return localStorage.getItem('custom_token') !== null;
  }

  async login(credentials) {
    const token = credentials.token;
    localStorage.setItem('custom_token', token);
    
    return {
      pubkey: 'user-pubkey',
      npub: 'npub1...',
      provider: 'custom',
      capabilities: {
        canSign: true,
        canEncrypt: true,
        canDecrypt: true
      }
    };
  }

  async logout() {
    localStorage.removeItem('custom_token');
  }

  getSigner() {
    return new CustomSigner();
  }
}

// Plugin registrieren
identityManager.registerPlugin('custom', new CustomAuthPlugin());
```

## Plugin-Konventionen

1. **Namensgebung**: Kleinbuchstaben mit Bindestrichen
2. **Initialisierung**: `initialize()`-Methode implementieren
3. **Error Handling**: Konsistente Fehlerbehandlung
4. **Dokumentation**: Klare API-Dokumentation
5. **Tests**: Unit-Tests für alle Methoden

## Deployment

### Browser-Umgebung

```javascript
import { NostrFramework } from './framework/index.js';
import { CustomPlugin } from './plugins/CustomPlugin.js';

const nostr = new NostrFramework({
  plugins: {
    auth: [new CustomPlugin()],
    storage: [new CustomStoragePlugin()]
  }
});
```

### Node.js-Umgebung

```javascript
import { NostrFramework } from '@nostr/framework';
import { NodePlugin } from '@nostr/node-plugin';

const nostr = new NostrFramework({
  plugins: {
    auth: [new NodePlugin()],
    storage: [new FileStoragePlugin()]
  }
});
```

## Best Practices

1. **Interface-Konformität**: Alle Interface-Methoden implementieren
2. **Async/Await**: Konsistente asynchrone Operationen
3. **Error Handling**: Robuste Fehlerbehandlung
4. **Resource Management**: Ressourcen sauber freigeben
5. **Testing**: Umfassende Tests

## Sicherheit

1. **Private Keys**: Niemals im Klartext speichern
2. **Validation**: Eingaben validieren
3. **Sanitization**: Daten bereinigen
4. **Permissions**: Minimale Rechte anfordern
5. **Audit**: Regelmäßige Sicherheits-Audits

## Performance

1. **Lazy Loading**: Ressourcen bei Bedarf laden
2. **Caching**: Intelligentes Caching implementieren
3. **Batching**: Operationen bündeln
4. **Async**: Nicht-blockierende Operationen
5. **Memory**: Speicher effizient nutzen

## Troubleshooting

### Häufige Probleme

1. **Plugin nicht gefunden**: Plugin korrekt registrieren
2. **Initialisierung fehlgeschlagen**: Dependencies prüfen
3. **Permission Denied**: Berechtigungen prüfen
4. **Storage voll**: Speicherplatz prüfen
5. **Network Fehler**: Verbindung prüfen

### Debugging

```javascript
// Debug-Modus aktivieren
const nostr = new NostrFramework({
  debug: true
});

// Plugin-Status prüfen
console.log('Auth plugins:', identityManager.getRegisteredPlugins());
console.log('Available plugins:', await identityManager.getAvailablePlugins());

// Event-Listener für Debugging
eventBus.on('plugin:error', ({ plugin, error }) => {
  console.error(`Plugin ${plugin} error:`, error);
});
```

## Nächste Schritte

- [AuthPlugin API](./AuthPlugin.md) - Authentifizierungs-Interface
- [SignerPlugin API](./SignerPlugin.md) - Signier-Interface
- [StoragePlugin API](./StoragePlugin.md) - Speicher-Interface
- [Implementierungen](./implementations/) - Konkrete Plugin-Implementierungen