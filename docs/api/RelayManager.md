# RelayManager API-Referenz

Der RelayManager verwaltet Relay-Verbindungen und -Operationen mit nostr-tools SimplePool. Er unterstützt Event-Publishing, Queries, Subscriptions und Fastest-Relay-Detection.

## Import

```javascript
import { RelayManager } from './framework/core/RelayManager.js';
```

## Konstruktor

```javascript
const relayManager = new RelayManager(eventBus, config);
```

**Parameter:**
- `eventBus` (EventBus, optional): EventBus-Instanz für die Kommunikation
- `config` (Object, optional): Konfigurations-Objekt
  - `relays` (string[]): Array von Relay-URLs

**Beispiel:**
```javascript
const relayManager = new RelayManager(null, {
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ]
});
```

## Methoden

### initialize()

Initialisiert den Relay-Pool und lädt nostr-tools.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
await relayManager.initialize();
```

### addRelays(relayUrls)

Fügt Relays zum Pool hinzu.

**Parameter:**
- `relayUrls` (string|string[]): Relay-URLs

**Beispiel:**
```javascript
relayManager.addRelays(['wss://new.relay.io']);
// oder
relayManager.addRelays('wss://single.relay.io');
```

### removeRelays(relayUrls)

Entfernt Relays aus dem Pool.

**Parameter:**
- `relayUrls` (string|string[]): Zu entfernende Relay-URLs

**Beispiel:**
```javascript
relayManager.removeRelays(['wss://old.relay.io']);
```

### getRelays()

Gibt eine Liste aller konfigurierten Relays zurück.

**Rückgabewert:**
- string[]: Array der Relay-URLs

**Beispiel:**
```javascript
const relays = relayManager.getRelays();
console.log('Configured relays:', relays);
```

### publish(event, relayUrls, timeout)

Veröffentlicht ein Event auf Relays.

**Parameter:**
- `event` (SignedEvent): Zu veröffentlichendes Event
- `relayUrls` (string[], optional): Spezifische Relays (verwendet alle wenn nicht angegeben)
- `timeout` (number, optional): Timeout in Millisekunden (Standard: 5000)

**Rückgabewert:**
- Promise<PublishResult[]>: Array von Veröffentlichungsergebnissen

**Beispiel:**
```javascript
const results = await relayManager.publish(signedEvent);
console.log(`Published to ${results.filter(r => r.success).length} relays`);

// Auf spezifische Relays veröffentlichen
const specificResults = await relayManager.publish(signedEvent, [
  'wss://relay.damus.io',
  'wss://nos.lol'
]);
```

### query(filters, options)

Fragt Events von Relays ab.

**Parameter:**
- `filters` (Filter[]): Nostr-Filter
- `options` (Object, optional): Query-Optionen
  - `relays` (string[]): Zu verwendende Relays
  - `timeout` (number): Timeout in Millisekunden (Standard: 3500)
  - `limit` (number): Maximale Anzahl von Events

**Rückgabewert:**
- Promise<Event[]>: Array von Events

**Beispiel:**
```javascript
// Text Notes abfragen
const textNotes = await relayManager.query([
  { kinds: [1], limit: 10 }
]);

// Events eines bestimmten Autors
const userEvents = await relayManager.query([
  { authors: ['user-pubkey'], kinds: [1, 6, 7] }
]);

// Mit benutzerdefinierten Optionen
const recentEvents = await relayManager.query([
  { kinds: [1], since: Math.floor(Date.now() / 1000) - 3600 }
], {
  timeout: 10000,
  limit: 50
});
```

### subscribe(filters, onEvent, options)

Abonniert Events von Relays.

**Parameter:**
- `filters` (Filter[]): Nostr-Filter
- `onEvent` (Function): Callback-Funktion für Events
- `options` (Object, optional): Subscription-Optionen
  - `relays` (string[]): Zu verwendende Relays
  - `id` (string): Subscription-ID

**Rückgabewert:**
- Subscription: Subscription-Objekt mit close()-Methode

**Beispiel:**
```javascript
const subscription = relayManager.subscribe(
  [{ kinds: [1], limit: 100 }],
  (event) => {
    console.log('Received text note:', event.content);
  }
);

// Subscription nach 30 Sekunden beenden
setTimeout(() => {
  subscription.close();
}, 30000);
```

### closeAllSubscriptions()

Schließt alle aktiven Subscriptions.

**Beispiel:**
```javascript
relayManager.closeAllSubscriptions();
```

### getFastestRelay(timeout)

Ermittelt den schnellsten Relay mit Caching.

**Parameter:**
- `timeout` (number, optional): Timeout für Geschwindigkeitstest (Standard: 1200)

**Rückgabewert:**
- Promise<string>: URL des schnellsten Relays

**Beispiel:**
```javascript
const fastest = await relayManager.getFastestRelay();
console.log('Fastest relay:', fastest);

// Auf dem schnellsten Relay veröffentlichen
const results = await relayManager.publish(event, [fastest]);
```

### getRelayStatus()

Gibt den Status-Map aller Relays zurück.

**Rückgabewert:**
- Map<string, Object>: Status-Map mit Relay-Informationen

**Beispiel:**
```javascript
const status = relayManager.getRelayStatus();
status.forEach((info, url) => {
  console.log(`${url}: ${info.status} (last seen: ${info.lastSeen})`);
});
```

### getSubscriptionCount()

Gibt die Anzahl der aktiven Subscriptions zurück.

**Rückgabewert:**
- number: Anzahl der aktiven Subscriptions

**Beispiel:**
```javascript
const count = relayManager.getSubscriptionCount();
console.log(`Active subscriptions: ${count}`);
```

### destroy()

Zerstört den RelayManager und räumt auf.

**Beispiel:**
```javascript
relayManager.destroy();
```

### on(event, callback)

Registriert einen Event-Listener für Relay-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = relayManager.on('relay:published', (data) => {
  console.log(`Event ${data.eventId} published to ${data.successCount} relays`);
});
```

## Events

Der RelayManager löst folgende Events aus:

### relay:initialized

Wird ausgelöst, wenn der RelayManager initialisiert ist.

**Daten:**
```javascript
{
  relays: string[]
}
```

### relay:added

Wird ausgelöst, wenn Relays hinzugefügt werden.

**Daten:**
```javascript
{
  relays: string[]
}
```

### relay:removed

Wird ausgelöst, wenn Relays entfernt werden.

**Daten:**
```javascript
{
  relays: string[]
}
```

### relay:published

Wird ausgelöst, wenn ein Event veröffentlicht wurde.

**Daten:**
```javascript
{
  eventId: string,
  results: PublishResult[],
  successCount: number,
  totalCount: number
}
```

### relay:queried

Wird ausgelöst, wenn eine Query ausgeführt wurde.

**Daten:**
```javascript
{
  filters: Filter[],
  count: number
}
```

### relay:event

Wird ausgelöst, wenn ein Event über Subscription empfangen wird.

**Daten:**
```javascript
{
  subscriptionId: string,
  event: Event
}
```

### relay:eose

Wird ausgelöst, wenn das Ende von gespeicherten Events erreicht ist.

**Daten:**
```javascript
{
  subscriptionId: string
}
```

### relay:subscribed

Wird ausgelöst, wenn eine Subscription erstellt wird.

**Daten:**
```javascript
{
  subscriptionId: string,
  filters: Filter[]
}
```

### relay:subscription-closed

Wird ausgelöst, wenn eine Subscription geschlossen wird.

**Daten:**
```javascript
{
  subscriptionId: string
}
```

### relay:fastest-found

Wird ausgelöst, wenn der schnellste Relay ermittelt wurde.

**Daten:**
```javascript
{
  relay: string
}
```

### relay:destroyed

Wird ausgelöst, wenn der RelayManager zerstört wird.

**Daten:**
```javascript
{}
```

### relay:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  method: string,
  error: Error
}
```

## Typdefinitionen

### Filter

```javascript
{
  ids?: string[],          // Event-IDs
  authors?: string[],      // Autoren-Public-Keys
  kinds?: number[],        // Event-Typen
  '#e'?: string[],         // Event-Tags
  '#p'?: string[],         // Public-Key-Tags
  since?: number,          // Unix-Timestamp (seit)
  until?: number,          // Unix-Timestamp (bis)
  limit?: number           // Maximale Anzahl
}
```

### PublishResult

```javascript
{
  relay: string,           // Relay-URL
  success: boolean,        // Erfolgreich?
  ok?: boolean,            // Relay hat Event akzeptiert
  error?: Error            // Fehler bei Misserfolg
}
```

### Subscription

```javascript
{
  id: string,              // Subscription-ID
  close: Function          // Subscription schließen
}
```

## Beispiele

### Basic Setup

```javascript
import { RelayManager } from './framework/core/RelayManager.js';

const relayManager = new RelayManager(null, {
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ]
});

await relayManager.initialize();
console.log('RelayManager initialized');
```

### Publishing Events

```javascript
// Event veröffentlichen
const signedEvent = {
  id: 'event-id',
  pubkey: 'author-pubkey',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Hello Nostr!',
  sig: 'signature'
};

const results = await relayManager.publish(signedEvent);
console.log('Publish results:', results);

// Erfolgreiche Veröffentlichungen zählen
const successCount = results.filter(r => r.success).length;
console.log(`Published to ${successCount}/${results.length} relays`);

// Auf spezifische Relays veröffentlichen
const specificResults = await relayManager.publish(signedEvent, [
  'wss://relay.damus.io'
], 10000); // 10 Sekunden Timeout
```

### Querying Events

```javascript
// Text Notes abfragen
const textNotes = await relayManager.query([
  { kinds: [1], limit: 20 }
]);

console.log(`Found ${textNotes.length} text notes`);
textNotes.forEach(event => {
  console.log(`- ${event.content} (by ${event.pubkey})`);
});

// Komplexe Query
const recentUserEvents = await relayManager.query([
  {
    authors: ['user-pubkey-hex'],
    kinds: [1, 6, 7],  // Text notes, reactions, reposts
    since: Math.floor(Date.now() / 1000) - 86400, // Letzte 24h
    limit: 50
  }
], {
  timeout: 10000,
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});
```

### Subscriptions

```javascript
// Live-Subscription für Text Notes
const subscription = relayManager.subscribe(
  [{ kinds: [1], limit: 100 }],
  (event) => {
    console.log('New text note:', event.content);
    console.log('Author:', event.pubkey);
    console.log('Created:', new Date(event.created_at * 1000));
  }
);

// Subscription mit Filter
const hashtagSubscription = relayManager.subscribe(
  [{ '#t': ['nostr'], kinds: [1] }],
  (event) => {
    console.log('Nostr-related post:', event.content);
  },
  {
    relays: ['wss://relay.damus.io'],
    id: 'nostr-hashtag-sub'
  }
);

// Subscription nach Zeit schließen
setTimeout(() => {
  subscription.close();
  hashtagSubscription.close();
  console.log('Subscriptions closed');
}, 60000); // 1 Minute
```

### Fastest Relay Detection

```javascript
// Schnellsten Relay ermitteln
const fastest = await relayManager.getFastestRelay();
console.log('Fastest relay:', fastest);

// Auf schnellstem Relay veröffentlichen
const results = await relayManager.publish(event, [fastest]);
console.log('Published to fastest relay:', results[0]);

// Geschwindigkeitstest mit Timeout
try {
  const fastestWithTimeout = await relayManager.getFastestRelay(500);
  console.log('Fastest (500ms timeout):', fastestWithTimeout);
} catch (error) {
  console.error('Fastest relay detection failed:', error);
}
```

### Relay Management

```javascript
// Relays hinzufügen/entfernen
relayManager.addRelays([
  'wss://new.relay1.io',
  'wss://new.relay2.io'
]);

console.log('Current relays:', relayManager.getRelays());

relayManager.removeRelays(['wss://old.relay.io']);

// Relay-Status prüfen
const status = relayManager.getRelayStatus();
status.forEach((info, url) => {
  console.log(`${url}: ${info.status}`);
  if (info.error) {
    console.log(`  Error: ${info.error}`);
  }
});

// Subscription-Status
console.log('Active subscriptions:', relayManager.getSubscriptionCount());
```

### Event Handling

```javascript
// Publishing überwachen
relayManager.on('relay:published', ({ eventId, results, successCount }) => {
  console.log(`Event ${eventId} published to ${successCount}/${results.length} relays`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`  ✓ ${result.relay}`);
    } else {
      console.log(`  ✗ ${result.relay}: ${result.error?.message}`);
    }
  });
});

// Events überwachen
relayManager.on('relay:event', ({ subscriptionId, event }) => {
  console.log(`Event via ${subscriptionId}:`, event.id);
});

// EOSE (End of Stored Events) überwachen
relayManager.on('relay:eose', ({ subscriptionId }) => {
  console.log(`EOSE for subscription ${subscriptionId}`);
});

// Fehler überwachen
relayManager.on('relay:error', ({ method, error }) => {
  console.error(`Relay error in ${method}:`, error);
});
```

### Cleanup

```javascript
// Alle Subscriptions schließen
relayManager.closeAllSubscriptions();

// RelayManager zerstören
relayManager.destroy();

// In einer Anwendung
window.addEventListener('beforeunload', () => {
  relayManager.destroy();
});
```

## Integration mit anderen Modulen

### Mit EventManager

```javascript
// EventManager verwendet intern den RelayManager
const events = await eventManager.queryEvents([
  { kinds: [1], limit: 10 }
]);

const result = await eventManager.publishEvent(signedEvent);
```

### Mit StorageManager

```javascript
// StorageManager synchronisiert mit Relays
await storageManager.sync({
  filters: [{ kinds: [1], since: yesterday }],
  bidirectional: true
});
```

## Best Practices

1. **Initialisierung**: Immer `initialize()` vor der Verwendung aufrufen
2. **Timeouts**: Angemessene Timeouts für Netzwerkoperationen
3. **Error Handling**: Auf `relay:error` Events lauschen
4. **Cleanup**: Subscriptions schließen und `destroy()` aufrufen
5. **Fastest Relay**: Für kritische Operationen den schnellsten Relay verwenden

## Performance

- **Connection Pooling**: Wiederverwendung von WebSocket-Verbindungen
- **Timeout Management**: Verhindert von Blockierung durch langsame Relays
- **Subscription Management**: Effizientes Handling von Subscriptions
- **Fastest Relay Caching**: Caching der schnellsten Relay für 5 Minuten

## Fehlerbehandlung

Der RelayManager fängt folgende Fehler ab:
- Netzwerkverbindungsfehler
- Timeout bei Operationen
- Invalid Relay URLs
- nostr-tools Lade-Fehler
- WebSocket-Fehler

Alle Fehler werden über `relay:error` Events gemeldet und als Promise-Rejections weitergegeben.