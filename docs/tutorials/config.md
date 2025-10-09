# Nostr Framework v2.0 - Konfiguration (TypeScript)

## Standard-Konfiguration

Das Framework v2.0 verwendet folgende Standard-Werte:

* **Relays:** relay.damus.io, relay.snort.social, nostr.wine, nos.lol, relay.nostr.band
* **nostr-tools CDN:** https://esm.sh/nostr-tools@2.8.1
* **Metadata Cache:** 1 Stunde (3600000 ms)
* **Relay Timeout:** 5000 ms
* **Max Cache Size:** 1000 Events
* **Debug Mode:** false
* **Standard Templates:** true

## TypeScript-Konfiguration

Mit TypeScript können Sie die Konfiguration vollständig typisiert erstellen:

```typescript
import { NostrFramework, type FrameworkConfig, type StorageConfig } from '@johappel/nostr-framework';

// Vollständig typisierte Konfiguration
const config: FrameworkConfig = {
  // Eigene Relays
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://mein-eigener-relay.com'
  ],
  
  // Anderen nostr-tools CDN verwenden
  nostrToolsBaseUrl: 'https://cdn.jsdelivr.net/npm/nostr-tools@2.8.1',
  
  // Metadata-Cache auf 30 Minuten setzen
  metadataCacheDuration: 1800000,
  
  // Relay-Timeout erhöhen
  relayTimeout: 10000,
  
  // Cache-Größe anpassen
  maxCacheSize: 2000,
  
  // Debug-Modus für Entwicklung
  debug: process.env.NODE_ENV === 'development',
  
  // Standard-Templates laden
  standardTemplates: true,
  
  // Storage-Konfiguration
  storage: {
    type: 'localStorage'
  } as StorageConfig
};

// Framework mit Konfiguration initialisieren
const nostr = new NostrFramework(config);
await nostr.initialize();
```

## Browser-Konfiguration (CDN)

Für Browser-Nutzung mit CDN:

```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
  
  // Konfiguration direkt an Konstruktor übergeben
  const nostr = new NostrFramework({
    relays: [
      'wss://relay.damus.io',
      'wss://nos.lol'
    ],
    debug: true,
    metadataCacheDuration: 1800000
  });
  
  await nostr.initialize();
</script>
```

## Teilweise Konfiguration

Mit TypeScript können Sie auch nur einzelne Werte konfigurieren:

```typescript
// Minimale Konfiguration
const simpleConfig: FrameworkConfig = {
  relays: ['wss://relay.damus.io'],
  debug: true
};

// Nur Debug aktivieren
const debugConfig: FrameworkConfig = {
  debug: true
};

// Nur Storage konfigurieren
const storageConfig: FrameworkConfig = {
  storage: {
    type: 'indexedDB'
  }
};
```

## Umgebungsspezifische Konfiguration

```typescript
// Unterschiedliche Configs für verschiedene Umgebungen
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const config: FrameworkConfig = {
  relays: isDevelopment 
    ? ['wss://relay.damus.io'] // Weniger Relays in Dev
    : [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social'
      ],
  debug: isDevelopment,
  metadataCacheDuration: isDevelopment ? 300000 : 3600000, // 5min vs 1h
  relayTimeout: isDevelopment ? 10000 : 5000
};
```

## Konfiguration mit Validierung

```typescript
import { NostrFramework, type FrameworkConfig } from '@johappel/nostr-framework';

function createValidatedConfig(userConfig: Partial<FrameworkConfig>): FrameworkConfig {
  // Standardwerte mit Typsicherheit
  const defaultConfig: FrameworkConfig = {
    relays: ['wss://relay.damus.io'],
    debug: false,
    metadataCacheDuration: 3600000,
    relayTimeout: 5000,
    maxCacheSize: 1000,
    standardTemplates: true
  };

  // User-Config mit Defaults mergen
  const config: FrameworkConfig = {
    ...defaultConfig,
    ...userConfig
  };

  // Validierung
  if (config.relays && config.relays.length === 0) {
    throw new Error('At least one relay must be configured');
  }

  if (config.metadataCacheDuration && config.metadataCacheDuration < 0) {
    throw new Error('Metadata cache duration must be positive');
  }

  return config;
}

// Verwendung
const config = createValidatedConfig({
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  debug: true
});

const nostr = new NostrFramework(config);
```

```
<script>
  // Nur Relays hinzufügen, Rest bleibt Standard
  window.NostrConfig = {
    relays: ['wss://mein-relay.com']
  };
</script>

<script type="module" src="framework/index.js"></script>
  
```

## Vollständiges Beispiel

## Hinweise

* Die `relays` Liste wird zu den Standard-Relays**hinzugefügt** , nicht ersetzt
* Um Duplikate zu vermeiden, werden Relays automatisch dedupliziert
* Die aktive Config wird in `window.NostrFrameworkConfig` gespeichert
* Auf localhost wird die Config automatisch in der Console geloggt

  ## Programmatischer Zugriff

  Sie können auch programmatisch auf die Config zugreifen:

```
import { Config } from './framework/config.js';

console.log('Configured relays:', Config.relays);
console.log('CDN URL:', Config.nostrToolsBaseUrl);
console.log('Cache duration:', Config.metadataCacheDuration);
  
```

```
  ### Aktive Konfiguration:
```

```
{
  "relays": [
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nostr.wine",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://relay.example.com"
  ],
  "nostrToolsBaseUrl": "https://esm.sh/nostr-tools@2.8.1",
  "metadataCacheDuration": 1800000,
  "relayTimeout": 8000,
  "maxCacheSize": 1000
}
```
