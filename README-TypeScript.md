# Nostr Framework - TypeScript Unterstützung

Das Nostr Framework wurde erfolgreich zu TypeScript konvertiert und kann jetzt sicher in Next.js und anderen TypeScript-Projekten verwendet werden.

## Installation

```bash
npm install @johappel/nostr-framework
```

## TypeScript Setup

### 1. TypeScript Konfiguration

Für Next.js fügen Sie diese Konfiguration zu Ihrer `tsconfig.json` hinzu:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 2. Next.js Beispiel

```typescript
// pages/nostr-example.tsx
import { useEffect, useState } from 'react';
import {
  NostrFramework,
  EventBus,
  IdentityManager,
  FrameworkConfig
} from '@johappel/nostr-framework';

interface NostrExampleProps {
  config?: FrameworkConfig;
}

export default function NostrExample({ config }: NostrExampleProps) {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initFramework = async () => {
      try {
        const fw = new NostrFramework({
          relays: ['wss://relay.damus.io', 'wss://relay.snort.social'],
          debug: process.env.NODE_ENV === 'development',
          ...config
        });

        await fw.initialize();
        setFramework(fw);
        setIsInitialized(true);

        console.log('Nostr Framework initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Nostr Framework:', error);
      }
    };

    initFramework();

    return () => {
      framework?.destroy();
    };
  }, [config]);

  if (!isInitialized) {
    return <div>Initializing Nostr Framework...</div>;
  }

  return (
    <div>
      <h1>Nostr Framework Example</h1>
      <p>Framework is ready to use!</p>
      <p>Current relays: {framework?.relay?.relays?.join(', ') || 'None'}</p>
    </div>
  );
}
```

## Verfügbare Typen

### Grundlegende Typen

```typescript
import type {
  UnsignedEvent,
  SignedEvent,
  Identity,
  FrameworkConfig,
  NostrProfile
} from '@johappel/nostr-framework';

// Event Struktur
interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
}

// Erweiterte Event Struktur mit Signatur
interface SignedEvent extends UnsignedEvent {
  id: string;
  sig: string;
  pubkey: string;
}

// Benutzer-Identität
interface Identity {
  pubkey: string;
  npub: string;
  provider: string;
  displayName?: string;
  metadata?: NostrProfile;
  capabilities: IdentityCapabilities;
}
```

### Framework-Konfiguration

```typescript
import type { FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nostr.wine'
  ],
  nostrToolsBaseUrl: 'https://esm.sh/nostr-tools@2.8.1',
  metadataCacheDuration: 3600000, // 1 Stunde
  relayTimeout: 5000,
  maxCacheSize: 1000,
  debug: process.env.NODE_ENV === 'development',
  standardTemplates: true
};
```

### EventBus

```typescript
import { EventBus, EventCallback } from '@johappel/nostr-framework';

const eventBus = new EventBus();

// Typensichere Event-Handler
const handleIdentityChange: EventCallback<Identity | null> = (identity) => {
  if (identity) {
    console.log('User logged in:', identity.displayName || identity.npub);
  } else {
    console.log('User logged out');
  }
};

// Event-Listener registrieren
const unsubscribe = eventBus.on('identity:changed', handleIdentityChange);

// Event emitieren
eventBus.emit('custom:event', { data: 'Hello World' });

// Aufräumen
unsubscribe();
```

### Identity Manager

```typescript
import { IdentityManager, AuthCredentials } from '@johappel/nostr-framework';

const identityManager = new IdentityManager(eventBus);

// Typensichere Authentifizierung
const authenticateNIP07 = async () => {
  try {
    const identity = await identityManager.authenticate('nip07');
    console.log('Authenticated as:', identity.displayName);
  } catch (error) {
    console.error('Authentication failed:', error);
  }
};

// Verfügbare Plugins abrufen
const availablePlugins = await identityManager.getAvailablePlugins();
console.log('Available auth methods:', availablePlugins);
```

## Migration von JavaScript

### Vorher (JavaScript)

```javascript
import { NostrFramework } from '@johappel/nostr-framework';

const framework = new NostrFramework({
  relays: ['wss://relay.damus.io']
});

await framework.initialize();
```

### Nachher (TypeScript)

```typescript
import { NostrFramework, FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io']
};

const framework = new NostrFramework(config);
await framework.initialize();
```

## Best Practices

1. **Typen importieren**: Importieren Sie immer die benötigten Typen explizit
2. **Konfiguration typisieren**: Verwenden Sie das `FrameworkConfig` Interface für die Konfiguration
3. **Event-Handler typisieren**: Verwenden Sie `EventCallback<T>` für typensichere Event-Handler
4. **Error Handling**: Nutzen Sie die bereitgestellten Error-Interfaces
5. **Async/Await**: Alle Framework-Methoden sind async und geben Promises zurück

## Unterstützte Features

✅ **EventBus** - Typensicheres Event-System
✅ **IdentityManager** - Authentifizierungsmanagement mit NIP-07, NIP-46 Unterstützung
✅ **TemplateEngine** - Event-Template-System für strukturierte Events
✅ **Plugin-Architektur** - Erweiterbares Plugin-System
✅ **Storage-Integration** - Verschiedene Storage-Adapter (localStorage, IndexedDB, SQLite)
✅ **Relay-Management** - Verbindung zu mehreren Nostr-Relays

## Nächste Schritte

Die folgenden Module werden als nächstes zu TypeScript konvertiert:
- RelayManager
- StorageManager
- EventManager
- SignerManager
- Alle Plugin-Implementierungen
- Template-Implementierungen

## Support

Bei Fragen zur TypeScript-Integration öffnen Sie bitte ein Issue auf GitHub oder konsultieren Sie die Dokumentation.