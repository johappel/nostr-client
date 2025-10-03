# StorageManager API-Referenz

Der StorageManager verwaltet die lokale Speicherung von Events mit plugin-basierter Architektur. Er unterstützt verschiedene Storage-Backends (localStorage, IndexedDB, SQLite) und Synchronisation mit Relays.

## Import

```javascript
import { StorageManager } from './framework/core/StorageManager.js';
```

## Konstruktor

```javascript
const storageManager = new StorageManager(eventBus);
```

**Parameter:**
- `eventBus` (EventBus, optional): EventBus-Instanz für die Kommunikation. Wenn nicht angegeben, wird eine neue erstellt.

## Methoden

### initialize(plugin)

Initialisiert den StorageManager mit einem Storage-Plugin.

**Parameter:**
- `plugin` (StoragePlugin): Storage-Plugin-Instanz

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

const localStoragePlugin = new LocalStoragePlugin();
await storageManager.initialize(localStoragePlugin);
```

### setRelayManager(relayManager)

Setzt den RelayManager für Synchronisations-Operationen.

**Parameter:**
- `relayManager` (RelayManager): RelayManager-Instanz

**Beispiel:**
```javascript
storageManager.setRelayManager(relayManager);
```

### save(events)

Speichert Events im lokalen Storage.

**Parameter:**
- `events` (Event|Event[]): Zu speichernde Events

**Rückgabewert:**
- Promise<number>: Anzahl der gespeicherten Events

**Beispiel:**
```javascript
// Einzelnes Event speichern
const count = await storageManager.save(event);
console.log(`Saved ${count} event`);

// Mehrere Events speichern
const events = [event1, event2, event3];
const savedCount = await storageManager.save(events);
console.log(`Saved ${savedCount} events`);
```

### query(filters)

Fragt Events aus dem lokalen Storage ab.

**Parameter:**
- `filters` (Filter[]): Nostr-Filter

**Rückgabewert:**
- Promise<Event[]>: Array von Events

**Beispiel:**
```javascript
// Text Notes abfragen
const textNotes = await storageManager.query([
  { kinds: [1], limit: 20 }
]);

// Events eines Autors
const userEvents = await storageManager.query([
  { authors: ['user-pubkey'], kinds: [1, 6, 7] }
]);

// Zeitbasierte Abfrage
const recentEvents = await storageManager.query([
  {
    kinds: [1],
    since: Math.floor(Date.now() / 1000) - 86400 // Letzte 24h
  }
]);
```

### delete(eventIds)

Löscht Events aus dem lokalen Storage.

**Parameter:**
- `eventIds` (string|string[]): Zu löschende Event-IDs

**Rückgabewert:**
- Promise<number>: Anzahl der gelöschten Events

**Beispiel:**
```javascript
// Einzelnes Event löschen
const deletedCount = await storageManager.delete('event-id');
console.log(`Deleted ${deletedCount} event`);

// Mehrere Events löschen
const deleted = await storageManager.delete([
  'event-id-1',
  'event-id-2',
  'event-id-3'
]);
console.log(`Deleted ${deleted} events`);
```

### clear()

Löscht alle Events aus dem lokalen Storage.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
await storageManager.clear();
console.log('All events cleared from storage');
```

### getStats()

Gibt Storage-Statistiken zurück.

**Rückgabewert:**
- Promise<Object>: Storage-Statistiken

**Beispiel:**
```javascript
const stats = await storageManager.getStats();
console.log('Storage stats:', stats);
// Output: { eventCount: 150, approximateSizeKB: 245 }
```

### sync(options)

Synchronisiert lokale Events mit Relays.

**Parameter:**
- `options` (Object, optional): Sync-Optionen
  - `filters` (Filter[]): Filter für die Synchronisation (Standard: [{}])
  - `since` (number): Unix-Timestamp für "seit" (Standard: letzter Sync)
  - `bidirectional` (boolean): Bidirektionale Synchronisation (Standard: false)

**Rückgabewert:**
- Promise<Object>: Sync-Ergebnis

**Beispiel:**
```javascript
// Einfache Synchronisation
const result = await storageManager.sync();
console.log(`Synced ${result.saved} events`);

// Mit Filtern
const filteredSync = await storageManager.sync({
  filters: [{ kinds: [1], limit: 100 }],
  since: Math.floor(Date.now() / 1000) - 3600 // Letzte Stunde
});

// Bidirektionale Synchronisation
const bidirectionalSync = await storageManager.sync({
  bidirectional: true,
  filters: [{ authors: ['my-pubkey'] }]
});
```

### setAutoSync(enabled, intervalMs)

Aktiviert/deaktiviert automatische Synchronisation.

**Parameter:**
- `enabled` (boolean): Auto-Sync aktivieren/deaktivieren
- `intervalMs` (number, optional): Sync-Intervall in Millisekunden (Standard: 60000)

**Beispiel:**
```javascript
// Auto-Sync alle 5 Minuten aktivieren
storageManager.setAutoSync(true, 300000);

// Auto-Sync deaktivieren
storageManager.setAutoSync(false);
```

### on(event, callback)

Registriert einen Event-Listener für Storage-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = storageManager.on('storage:saved', (data) => {
  console.log(`Saved ${data.count} events`);
});
```

## Events

Der StorageManager löst folgende Events aus:

### storage:initialized

Wird ausgelöst, wenn der StorageManager initialisiert ist.

**Daten:**
```javascript
{
  plugin: string
}
```

### storage:saved

Wird ausgelöst, wenn Events gespeichert wurden.

**Daten:**
```javascript
{
  count: number,
  total: number
}
```

### storage:queried

Wird ausgelöst, wenn eine Query ausgeführt wurde.

**Daten:**
```javascript
{
  filters: Filter[],
  count: number
}
```

### storage:deleted

Wird ausgelöst, wenn Events gelöscht wurden.

**Daten:**
```javascript
{
  count: number,
  total: number
}
```

### storage:cleared

Wird ausgelöst, wenn der Storage geleert wurde.

**Daten:**
```javascript
{}
```

### storage:synced

Wird ausgelöst, wenn eine Synchronisation abgeschlossen wurde.

**Daten:**
```javascript
{
  saved: number,
  total: number
}
```

### storage:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  method: string,
  error: Error
}
```

## Storage-Plugins

### LocalStoragePlugin

Basiert auf Browser localStorage, begrenzt durch Speichergröße (~5-10MB).

**Konstruktor:**
```javascript
const plugin = new LocalStoragePlugin(config);
```

**Parameter:**
- `config` (Object, optional): Konfiguration
  - `keyPrefix` (string): Schlüssel-Präfix (Standard: 'nostr_events_')

**Beispiel:**
```javascript
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

const localStoragePlugin = new LocalStoragePlugin({
  keyPrefix: 'myapp_events_'
});

await storageManager.initialize(localStoragePlugin);
```

### SQLitePlugin

SQLite-basiertes Storage für größere Datenmengen (WASM-basiert).

**Konstruktor:**
```javascript
const plugin = new SQLitePlugin(config);
```

**Parameter:**
- `config` (Object, optional): Konfiguration
  - `dbName` (string): Datenbankname (Standard: 'nostr_events')
  - `version` (number): Datenbankversion (Standard: 1)

**Beispiel:**
```javascript
import { SQLitePlugin } from './framework/plugins/storage/SQLitePlugin.js';

const sqlitePlugin = new SQLitePlugin({
  dbName: 'myapp_nostr',
  version: 1
});

await storageManager.initialize(sqlitePlugin);
```

### IndexedDBPlugin

IndexedDB-basiertes Storage für bessere Performance mit großen Datenmengen.

**Konstruktor:**
```javascript
const plugin = new IndexedDBPlugin(config);
```

**Parameter:**
- `config` (Object, optional): Konfiguration
  - `dbName` (string): Datenbankname (Standard: 'nostr_events')
  - `storeName` (string): Store-Name (Standard: 'events')
  - `version` (number): Datenbankversion (Standard: 1)

**Beispiel:**
```javascript
import { IndexedDBPlugin } from './framework/plugins/storage/IndexedDBPlugin.js';

const indexedDBPlugin = new IndexedDBPlugin({
  dbName: 'myapp_nostr',
  storeName: 'events',
  version: 1
});

await storageManager.initialize(indexedDBPlugin);
```

## Beispiele

### Basic Setup

```javascript
import { StorageManager } from './framework/core/StorageManager.js';
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

const storageManager = new StorageManager();

// LocalStorage Plugin initialisieren
const localStoragePlugin = new LocalStoragePlugin();
await storageManager.initialize(localStoragePlugin);

// RelayManager für Synchronisation setzen
storageManager.setRelayManager(relayManager);
```

### Saving and Querying Events

```javascript
// Events speichern
const events = [
  {
    id: 'event-1',
    pubkey: 'author-1',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [],
    content: 'First post',
    sig: 'signature-1'
  },
  {
    id: 'event-2',
    pubkey: 'author-2',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [['t', 'nostr']],
    content: 'Second post',
    sig: 'signature-2'
  }
];

const savedCount = await storageManager.save(events);
console.log(`Saved ${savedCount} events`);

// Events abfragen
const allEvents = await storageManager.query([{}]);
console.log(`Total events in storage: ${allEvents.length}`);

// Gefilterte Abfrage
const textNotes = await storageManager.query([
  { kinds: [1], limit: 10 }
]);

console.log(`Found ${textNotes.length} text notes`);
```

### Event Management

```javascript
// Event löschen
const deletedCount = await storageManager.delete('event-1');
console.log(`Deleted ${deletedCount} event`);

// Mehrere Events löschen
const deleted = await storageManager.delete(['event-2', 'event-3']);
console.log(`Deleted ${deleted} events`);

// Storage leeren
await storageManager.clear();
console.log('Storage cleared');

// Storage-Statistiken
const stats = await storageManager.getStats();
console.log('Storage statistics:', stats);
// Output: { eventCount: 0, approximateSizeKB: 0 }
```

### Synchronization

```javascript
// Manuelles Sync
const syncResult = await storageManager.sync();
console.log(`Synced ${syncResult.saved} events`);

// Sync mit Filtern
const filteredSync = await storageManager.sync({
  filters: [
    { kinds: [1], limit: 100 },
    { kinds: [6], limit: 50 }
  ],
  since: Math.floor(Date.now() / 1000) - 86400 // Letzte 24h
});

console.log(`Filtered sync: ${filteredSync.saved} events`);

// Auto-Sync aktivieren
storageManager.setAutoSync(true, 300000); // Alle 5 Minuten

// Auto-Sync deaktivieren
storageManager.setAutoSync(false);
```

### Event Handling

```javascript
// Speichern überwachen
storageManager.on('storage:saved', ({ count, total }) => {
  console.log(`Saved ${count}/${total} events to storage`);
});

// Abfragen überwachen
storageManager.on('storage:queried', ({ filters, count }) => {
  console.log(`Query returned ${count} events for filters:`, filters);
});

// Synchronisation überwachen
storageManager.on('storage:synced', ({ saved, total }) => {
  console.log(`Synced ${saved}/${total} events from relays`);
});

// Fehler überwachen
storageManager.on('storage:error', ({ method, error }) => {
  console.error(`Storage error in ${method}:`, error);
});
```

### Advanced Usage

```javascript
// Mit SQLite Plugin
import { SQLitePlugin } from './framework/plugins/storage/SQLitePlugin.js';

const sqlitePlugin = new SQLitePlugin({
  dbName: 'nostr_client',
  version: 1
});

await storageManager.initialize(sqlitePlugin);

// Große Datenmengen speichern
const largeEventSet = await fetchEventsFromRelays();
const saved = await storageManager.save(largeEventSet);
console.log(`Saved ${saved} events to SQLite`);

// Komplexe Abfragen
const complexQuery = await storageManager.query([
  {
    kinds: [1, 6, 7],
    authors: ['author-pubkey'],
    '#t': ['nostr', 'javascript'],
    since: Math.floor(Date.now() / 1000) - 604800 // Letzte Woche
  }
]);

// Performance-Überwachung
const stats = await storageManager.getStats();
console.log(`Storage contains ${stats.eventCount} events`);
console.log(`Approximate size: ${stats.approximateSizeKB} KB`);
```

### Integration mit EventManager

```javascript
// Events automatisch speichern
eventManager.on('event:received', async ({ event }) => {
  await storageManager.save(event);
});

// Events aus Storage laden
const storedEvents = await storageManager.query([
  { kinds: [1], limit: 50 }
]);

// Gecachte Events speichern
const cachedEvents = eventManager.getAllCachedEvents();
await storageManager.save(cachedEvents);
```

## Best Practices

1. **Plugin-Auswahl**: Passendes Storage-Plugin für den Anwendungsfall wählen
2. **Auto-Sync**: Für regelmäßige Updates aktivieren
3. **Error Handling**: Auf `storage:error` Events lauschen
4. **Storage-Limits**: Bei localStorage auf Speichergröße achten
5. **Performance**: Große Datenmengen in Batches speichern

## Performance

- **Batch-Operations**: Mehrere Events effizient speichern/löschen
- **Indexing**: Optimierte Abfragen über Indizes
- **Caching**: Intelligente Cache-Strategien
- **Async-Operations**: Nicht-blockierende Operationen

## Storage-Vergleich

| Plugin | Speichergröße | Performance | Browser-Support | Use Case |
|--------|---------------|-------------|-----------------|----------|
| LocalStorage | ~5-10MB | Gut | Alle | Kleine Apps, einfache Use Cases |
| IndexedDB | ~50% Disk | Sehr gut | Modern | Große Datenmengen, komplexe Abfragen |
| SQLite | Unbegrenzt | Exzellent | Mit WASM | Desktop-ähnliche Apps, große Datenmengen |

## Fehlerbehandlung

Der StorageManager fängt folgende Fehler ab:
- Storage nicht initialisiert
- Speicherplatz voll (localStorage)
- Datenbank-Fehler (SQLite/IndexedDB)
- Netzwerkfehler bei Synchronisation
- Invalid Filter-Parameter

Alle Fehler werden über `storage:error` Events gemeldet und als Promise-Rejections weitergegeben.