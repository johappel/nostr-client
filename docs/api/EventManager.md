# EventManager API-Referenz

Der EventManager ist das zentrale Event-Management-System, das TemplateEngine, SignerManager und RelayManager orchestriert. Er vereinfacht die Erstellung, Signierung und Veröffentlichung von Events.

## Import

```javascript
import { EventManager } from './framework/core/EventManager.js';
```

## Konstruktor

```javascript
const eventManager = new EventManager(config);
```

**Parameter:**
- `config` (Object, optional): Konfigurations-Objekt
  - `eventBus` (EventBus): EventBus-Instanz
  - `templateEngine` (TemplateEngine): TemplateEngine-Instanz
  - `signerManager` (SignerManager): SignerManager-Instanz
  - `relayManager` (RelayManager): RelayManager-Instanz
  - `maxCacheSize` (number): Maximale Cache-Größe (Standard: 1000)

**Beispiel:**
```javascript
const eventManager = new EventManager({
  maxCacheSize: 500
});
```

## Methoden

### setTemplateEngine(templateEngine)

Setzt die TemplateEngine-Instanz.

**Parameter:**
- `templateEngine` (TemplateEngine): TemplateEngine-Instanz

**Beispiel:**
```javascript
eventManager.setTemplateEngine(templateEngine);
```

### setSignerManager(signerManager)

Setzt den SignerManager.

**Parameter:**
- `signerManager` (SignerManager): SignerManager-Instanz

**Beispiel:**
```javascript
eventManager.setSignerManager(signerManager);
```

### setRelayManager(relayManager)

Setzt den RelayManager.

**Parameter:**
- `relayManager` (RelayManager): RelayManager-Instanz

**Beispiel:**
```javascript
eventManager.setRelayManager(relayManager);
```

### createUnsignedEvent(templateName, data)

Erstellt ein unsigniertes Event aus einem Template.

**Parameter:**
- `templateName` (string): Template-Name
- `data` (Object): Event-Daten

**Rückgabewert:**
- UnsignedEvent: Erstelltes Event

**Beispiel:**
```javascript
const unsigned = eventManager.createUnsignedEvent('text-note', {
  content: 'Hello Nostr!',
  tags: [['t', 'greeting']]
});

console.log('Unsigned event:', unsigned);
```

### createEvent(templateName, data, options)

Erstellt und signiert ein Event.

**Parameter:**
- `templateName` (string): Template-Name
- `data` (Object): Event-Daten
- `options` (Object, optional): Optionen
  - `timeout` (number): Signier-Timeout

**Rückgabewert:**
- Promise<SignedEvent>: Signiertes Event

**Beispiel:**
```javascript
const signed = await eventManager.createEvent('text-note', {
  content: 'Hello from EventManager!'
});

console.log('Signed event:', signed.id);
```

### publishEvent(event, options)

Veröffentlicht ein signiertes Event auf Relays.

**Parameter:**
- `event` (SignedEvent): Zu veröffentlichendes Event
- `options` (Object, optional): Veröffentlichungsoptionen
  - `relays` (string[]): Spezifische Relays
  - `timeout` (number): Timeout in Millisekunden

**Rückgabewert:**
- Promise<PublishResult>: Veröffentlichungsergebnis

**Beispiel:**
```javascript
const result = await eventManager.publishEvent(signedEvent, {
  relays: ['wss://relay.damus.io'],
  timeout: 10000
});

console.log(`Published to ${result.successCount}/${result.totalCount} relays`);
```

### createAndPublish(templateName, data, options)

Erstellt, signiert und veröffentlicht ein Event in einem Aufruf.

**Parameter:**
- `templateName` (string): Template-Name
- `data` (Object): Event-Daten
- `options` (Object, optional): Optionen für Signierung und Veröffentlichung

**Rückgabewert:**
- Promise<PublishResult>: Veröffentlichungsergebnis

**Beispiel:**
```javascript
const result = await eventManager.createAndPublish('text-note', {
  content: 'Hello Nostr World!',
  tags: [['t', 'intro']]
});

console.log('Event published:', result.success);
```

### queryEvents(filters, options)

Fragt Events von Relays ab.

**Parameter:**
- `filters` (Filter[]): Nostr-Filter
- `options` (Object, optional): Query-Optionen

**Rückgabewert:**
- Promise<Event[]>: Array von Events

**Beispiel:**
```javascript
const events = await eventManager.queryEvents([
  { kinds: [1], limit: 10 }
]);

console.log(`Found ${events.length} events`);
```

### subscribe(filters, callback, options)

Abonniert Events von Relays.

**Parameter:**
- `filters` (Filter[]): Nostr-Filter
- `callback` (Function): Event-Callback
- `options` (Object, optional): Subscription-Optionen

**Rückgabewert:**
- Subscription: Subscription-Objekt

**Beispiel:**
```javascript
const subscription = eventManager.subscribe(
  [{ kinds: [1] }],
  (event) => {
    console.log('New text note:', event.content);
  }
);
```

### parseEvent(templateName, event)

Parst ein empfangenes Event mit einem Template.

**Parameter:**
- `templateName` (string): Template-Name
- `event` (SignedEvent): Zu parsendes Event

**Rückgabewert:**
- Object: Geparste Event-Daten

**Beispiel:**
```javascript
const parsed = eventManager.parseEvent('text-note', receivedEvent);
console.log('Parsed content:', parsed.content);
```

### deleteEvent(eventIds, reason, options)

Löscht Events (erstellt Kind 5 Deletion Event).

**Parameter:**
- `eventIds` (string|string[]): Zu löschende Event-IDs
- `reason` (string, optional): Löschgrund
- `options` (Object, optional): Veröffentlichungsoptionen

**Rückgabewert:**
- Promise<PublishResult>: Veröffentlichungsergebnis

**Beispiel:**
```javascript
const result = await eventManager.deleteEvent(
  'event-id-to-delete',
  'Mistake - wrong content'
);

console.log('Deletion event published:', result.success);
```

### getCachedEvent(eventId)

Gibt ein Event aus dem Cache zurück.

**Parameter:**
- `eventId` (string): Event-ID

**Rückgabewert:**
- Event|null: Event oder null

**Beispiel:**
```javascript
const cached = eventManager.getCachedEvent('event-id');
if (cached) {
  console.log('Found cached event:', cached.content);
}
```

### getAllCachedEvents()

Gibt alle gecachten Events zurück.

**Rückgabewert:**
- Event[]: Array der gecachten Events

**Beispiel:**
```javascript
const cached = eventManager.getAllCachedEvents();
console.log(`Cached events: ${cached.length}`);
```

### clearCache()

Leert den Event-Cache.

**Beispiel:**
```javascript
eventManager.clearCache();
console.log('Cache cleared');
```

### getCacheStats()

Gibt Cache-Statistiken zurück.

**Rückgabewert:**
- Object: Cache-Statistiken

**Beispiel:**
```javascript
const stats = eventManager.getCacheStats();
console.log(`Cache utilization: ${stats.utilizationPercent}%`);
```

### on(event, callback)

Registriert einen Event-Listener für EventManager-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = eventManager.on('event:published', (data) => {
  console.log(`Event ${data.event.id} published`);
});
```

## Events

Der EventManager löst folgende Events aus:

### event:created

Wird ausgelöst, wenn ein Event erstellt wurde.

**Daten:**
```javascript
{
  templateName: string,
  event: UnsignedEvent
}
```

### event:signed

Wird ausgelöst, wenn ein Event signiert wurde.

**Daten:**
```javascript
{
  templateName: string,
  event: SignedEvent
}
```

### event:published

Wird ausgelöst, wenn ein Event veröffentlicht wurde.

**Daten:**
```javascript
{
  success: boolean,
  event: SignedEvent,
  results: PublishResult[],
  successCount: number,
  totalCount: number
}
```

### event:received

Wird ausgelöst, wenn ein Event über Subscription empfangen wird.

**Daten:**
```javascript
{
  event: Event
}
```

### event:parsed

Wird ausgelöst, wenn ein Event geparst wurde.

**Daten:**
```javascript
{
  templateName: string,
  event: SignedEvent,
  parsed: Object
}
```

### event:queried

Wird ausgelöst, wenn eine Query ausgeführt wurde.

**Daten:**
```javascript
{
  filters: Filter[],
  count: number
}
```

### event:subscribed

Wird ausgelöst, wenn eine Subscription erstellt wird.

**Daten:**
```javascript
{
  subscriptionId: string,
  filters: Filter[]
}
```

### event:cache-cleared

Wird ausgelöst, wenn der Cache geleert wird.

**Daten:**
```javascript
{}
```

### event:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  method: string,
  error: Error
}
```

### event:kind:{kind}

Wird für spezifische Event-Typen ausgelöst.

**Daten:**
```javascript
{
  type: 'published' | 'received',
  event: Event
}
```

## Beispiele

### Basic Setup

```javascript
import { EventManager } from './framework/core/EventManager.js';
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { SignerManager } from './framework/core/SignerManager.js';
import { RelayManager } from './framework/core/RelayManager.js';
import { MockSigner } from './framework/plugins/signer/MockSigner.js';
import { TextNoteTemplate } from './framework/templates/nip01.js';

// Komponenten einrichten
const templateEngine = new TemplateEngine();
templateEngine.register('text-note', new TextNoteTemplate());

const signerManager = new SignerManager();
signerManager.setSigner(new MockSigner());

const relayManager = new RelayManager(null, {
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});
await relayManager.initialize();

// EventManager einrichten
const eventManager = new EventManager();
eventManager.setTemplateEngine(templateEngine);
eventManager.setSignerManager(signerManager);
eventManager.setRelayManager(relayManager);
```

### Creating and Publishing Events

```javascript
// Einzelschritte
const unsigned = eventManager.createUnsignedEvent('text-note', {
  content: 'Hello Nostr!',
  tags: [['t', 'greeting']]
});

const signed = await eventManager.createEvent('text-note', {
  content: 'Hello Nostr!'
});

const result = await eventManager.publishEvent(signed);
console.log('Published:', result.success);

// Ein-Aufruf
const result = await eventManager.createAndPublish('text-note', {
  content: 'Hello from EventManager!',
  tags: [['t', 'test']]
});

console.log(`Event ${result.event.id} published to ${result.successCount} relays`);
```

### Querying Events

```javascript
// Text Notes abfragen
const textNotes = await eventManager.queryEvents([
  { kinds: [1], limit: 20 }
]);

console.log(`Found ${textNotes.length} text notes`);

// Komplexe Query
const recentEvents = await eventManager.queryEvents([
  {
    kinds: [1, 6, 7],
    since: Math.floor(Date.now() / 1000) - 3600, // Letzte Stunde
    limit: 50
  }
]);

// Events eines bestimmten Autors
const userEvents = await eventManager.queryEvents([
  { authors: ['user-pubkey'], kinds: [1] }
]);
```

### Subscriptions

```javascript
// Live-Subscription für Text Notes
const subscription = eventManager.subscribe(
  [{ kinds: [1] }],
  (event) => {
    console.log('New text note:', event.content);
    console.log('Author:', event.pubkey);
  }
);

// Subscription für Hashtags
const hashtagSub = eventManager.subscribe(
  [{ '#t': ['nostr'], kinds: [1] }],
  (event) => {
    console.log('Nostr-related post:', event.content);
  }
);

// Subscription nach Zeit schließen
setTimeout(() => {
  subscription.close();
  hashtagSub.close();
}, 60000);
```

### Event Parsing

```javascript
// Empfangenes Event parsen
const parsed = eventManager.parseEvent('text-note', receivedEvent);

console.log('Parsed data:', {
  content: parsed.content,
  author: parsed.author,
  created_at: parsed.created_at,
  tags: parsed.tags
});

// Kalender-Event parsen
const calendarParsed = eventManager.parseEvent('calendar-event', calendarEvent);
console.log('Calendar event:', {
  title: calendarParsed.title,
  start: calendarParsed.start,
  location: calendarParsed.location
});
```

### Event Deletion

```javascript
// Einzelnes Event löschen
const result = await eventManager.deleteEvent(
  'event-id-to-delete',
  'Mistake in content'
);

console.log('Deletion published:', result.success);

// Mehrere Events löschen
const batchResult = await eventManager.deleteEvent([
  'event-id-1',
  'event-id-2',
  'event-id-3'
], 'Cleaning up old posts');
```

### Cache Management

```javascript
// Cache-Statistiken
const stats = eventManager.getCacheStats();
console.log('Cache stats:', stats);
// Output: { size: 150, maxSize: 1000, utilizationPercent: 15 }

// Gecachtes Event abrufen
const cached = eventManager.getCachedEvent('event-id');
if (cached) {
  console.log('Found in cache:', cached.content);
}

// Alle gecachten Events
const allCached = eventManager.getAllCachedEvents();
console.log(`Total cached events: ${allCached.length}`);

// Cache leeren
eventManager.clearCache();
console.log('Cache cleared');
```

### Event Handling

```javascript
// Event-Erstellung überwachen
eventManager.on('event:created', ({ templateName, event }) => {
  console.log(`Event created with ${templateName}:`, event.id);
});

// Signierung überwachen
eventManager.on('event:signed', ({ templateName, event }) => {
  console.log(`Event signed:`, event.id);
});

// Veröffentlichung überwachen
eventManager.on('event:published', ({ success, event, successCount }) => {
  if (success) {
    console.log(`Event ${event.id} published to ${successCount} relays`);
  } else {
    console.log(`Failed to publish event ${event.id}`);
  }
});

// Empfangene Events überwachen
eventManager.on('event:received', ({ event }) => {
  console.log(`Received event: ${event.id} (kind ${event.kind})`);
});

// Spezifische Event-Typen überwachen
eventManager.on('event:kind:1', ({ type, event }) => {
  if (type === 'received') {
    console.log('New text note received:', event.content);
  }
});

// Fehler überwachen
eventManager.on('event:error', ({ method, error }) => {
  console.error(`EventManager error in ${method}:`, error);
});
```

### Advanced Usage

```javascript
// Mit benutzerdefinierten Optionen
const result = await eventManager.createAndPublish('text-note', {
  content: 'Important message',
  tags: [['t', 'important'], ['p', 'recipient-pubkey']]
}, {
  timeout: 15000, // 15 Sekunden Timeout
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

// Mit Kalender-Event
const calendarResult = await eventManager.createAndPublish('calendar-event', {
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  location: 'Berlin',
  description: 'Monthly community meetup'
});

// Batch-Operationen
const events = [
  { content: 'First post', tags: [['t', 'batch']] },
  { content: 'Second post', tags: [['t', 'batch']] },
  { content: 'Third post', tags: [['t', 'batch']] }
];

const results = await Promise.all(
  events.map(data => 
    eventManager.createAndPublish('text-note', data)
  )
);

console.log(`Published ${results.filter(r => r.success).length} events`);
```

## Integration mit anderen Modulen

### Mit IdentityManager

```javascript
// Automatische Signer-Aktualisierung
identityManager.on('identity:changed', (identity) => {
  if (identity) {
    const signer = identityManager.getSigner();
    signerManager.setSigner(signer);
  }
});

// Events als aktueller Benutzer erstellen
if (identityManager.isAuthenticated()) {
  const result = await eventManager.createAndPublish('text-note', {
    content: 'Authenticated post'
  });
}
```

### Mit StorageManager

```javascript
// Events automatisch speichern
eventManager.on('event:received', async ({ event }) => {
  await storageManager.save(event);
});

// Gecachte Events speichern
const cached = eventManager.getAllCachedEvents();
await storageManager.save(cached);
```

## Best Practices

1. **Manager-Setup**: Alle Manager vor der Verwendung konfigurieren
2. **Error Handling**: Auf `event:error` Events lauschen
3. **Cache-Nutzung**: Cache für häufig verwendete Events nutzen
4. **Subscriptions**: Subscriptions immer schließen wenn nicht mehr benötigt
5. **Event-Typen**: Templates für konsistente Event-Erstellung verwenden

## Performance

- **Event-Caching**: LRU-Cache für häufig verwendete Events
- **Batch-Operations**: Mehrere Events effizient verarbeiten
- **Subscription-Management**: Optimiertes Handling von Subscriptions
- **Memory-Management**: Automatische Cache-Bereinigung

## Fehlerbehandlung

Der EventManager fängt folgende Fehler ab:
- Template nicht gefunden
- Signier-Fehler
- Veröffentlichungsfehler
- Query-Fehler
- Parsing-Fehler

Alle Fehler werden über `event:error` Events gemeldet und als Promise-Rejections weitergegeben.