# Nostr Framework - Konfigurationsbeispiel

## Standard-Konfiguration

Das Framework verwendet folgende Standard-Werte:

* **Relays:** relay.damus.io, relay.snort.social, nostr.wine, nos.lol, relay.nostr.band
* **nostr-tools CDN:** https://esm.sh/nostr-tools@2.8.1
* **Metadata Cache:** 1 Stunde (3600000 ms)
* **Relay Timeout:** 5000 ms
* **Max Cache Size:** 1000 Events

  ## Eigene Konfiguration

  Um die Standard-Werte zu überschreiben, definieren Sie ein `window.NostrConfig` Objekt
  **VOR** dem Laden des Frameworks:

```
<!-- Eigene Konfiguration definieren -->
<script>
  window.NostrConfig = {
    // Eigene Relays hinzufügen (werden zu Standard-Relays hinzugefügt)
    relays: [
      'wss://mein-eigener-relay.com',
      'wss://noch-ein-relay.de'
    ],
  
    // Anderen nostr-tools CDN verwenden
    nostrToolsBaseUrl: 'https://cdn.jsdelivr.net/npm/nostr-tools@2.8.1',
  
    // Metadata-Cache auf 30 Minuten setzen
    metadataCacheDuration: 1800000,
  
    // Relay-Timeout erhöhen
    relayTimeout: 10000,
  
    // Cache-Größe anpassen
    maxCacheSize: 2000
  };
</script>

<!-- Dann Framework laden -->
<script type="module" src="framework/index.js"></script>
  
```

## Teilweise Überschreibung

Sie können auch nur einzelne Werte überschreiben:

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
