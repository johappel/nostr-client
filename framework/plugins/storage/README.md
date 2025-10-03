# Storage Plugins

Das Nostr Framework unterstützt verschiedene Storage-Plugins für die lokale Event-Persistenz.

## Verfügbare Plugins

### ⭐ Neu: SQLiteFilePlugin - Browser-Übergreifend!

### 1. LocalStoragePlugin

**Browser localStorage-basiertes Storage**

#### Vorteile:
- ✅ Einfach zu verwenden
- ✅ Keine externen Dependencies
- ✅ Schnell bei kleinen Datenmengen (<500 Events)
- ✅ Sofort einsatzbereit

#### Nachteile:
- ⚠️ Größenlimit: ~5-10MB (browser-abhängig)
- ⚠️ Synchrone API (kann bei vielen Events blockieren)
- ⚠️ Langsamer bei großen Datenmengen
- ⚠️ Keine strukturierte Datenbank

#### Verwendung:

```javascript
import { NostrFramework } from './framework/index.js';
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

const nostr = new NostrFramework({
  relays: ['wss://relay-rpi.edufeed.org'],
  storage: new LocalStoragePlugin({
    keyPrefix: 'my_app_'  // Optional: Custom prefix
  }),
  debug: true
});

await nostr.initialize();

// Storage verwenden
await nostr.storage.save(events);
const stored = await nostr.storage.query([{ kinds: [1] }]);
```

#### Performance (200 Events):
- Save: ~2-5ms
- Query: ~1-2ms
- Best for: <1000 Events

---

### 2. SQLitePlugin (Empfohlen für größere Apps)

**SQLite WASM-basiertes Storage**

#### Vorteile:
- ✅ Praktisch unbegrenzte Kapazität
- ✅ Strukturierte Datenbank mit SQL
- ✅ Schnellere Queries durch Indexe
- ✅ Skaliert gut bei großen Datenmengen
- ✅ Unterstützt komplexe Queries

#### Nachteile:
- ⚠️ Größere Bundle-Size (~1.5MB WASM)
- ⚠️ Etwas langsamer bei sehr kleinen Datenmengen
- ⚠️ Längere Initialisierung (~500ms für WASM-Load)

#### Verwendung:

```javascript
import { NostrFramework } from './framework/index.js';
import { SQLitePlugin } from './framework/plugins/storage/SQLitePlugin.js';

const nostr = new NostrFramework({
  relays: ['wss://relay-rpi.edufeed.org'],
  storage: new SQLitePlugin({
    dbName: 'my_app.db'  // Optional: Custom DB name
  }),
  debug: true
});

await nostr.initialize();

// Storage verwenden (gleiche API wie LocalStorage!)
await nostr.storage.save(events);
const stored = await nostr.storage.query([{ kinds: [1] }]);
```

#### Performance (200 Events):
- Save: ~20-30ms
- Query: ~3-5ms
- Best for: >1000 Events, komplexe Queries

#### Datenbankschema:

**Events Table:**
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  content TEXT,
  sig TEXT,
  event_json TEXT NOT NULL
);

-- Indexes für Performance
CREATE INDEX idx_events_kind ON events(kind);
CREATE INDEX idx_events_pubkey ON events(pubkey);
CREATE INDEX idx_events_created_at ON events(created_at);
```

**Tags Table:**
```sql
CREATE TABLE tags (
  event_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_value TEXT,
  tag_index INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_event_id ON tags(event_id);
CREATE INDEX idx_tags_name_value ON tags(tag_name, tag_value);
```

---

## Vergleich

| Feature | LocalStorage | SQLite |
|---------|-------------|--------|
| Kapazität | ~5-10MB | Praktisch unbegrenzt* |
| Initialisierung | <1ms | ~500ms (WASM) |
| Save (100 Events) | ~3ms | ~15ms |
| Query (einfach) | ~1ms | ~3ms |
| Query (komplex) | ~10ms | ~5ms |
| Bundle Size | 0 | ~1.5MB |
| Best for | Kleine Apps | Production Apps |

*Limitiert nur durch localStorage-Serialisierung der Datenbank

---

## Empfehlungen

### Wann LocalStorage verwenden?
- ✅ Prototypen und kleine Apps
- ✅ <500 Events erwartet
- ✅ Einfache Filter-Queries
- ✅ Minimale Bundle-Size wichtig

### Wann SQLite verwenden?
- ✅ Production Apps
- ✅ >1000 Events erwartet
- ✅ Komplexe Queries mit Tags
- ✅ Langfristige Event-Speicherung
- ✅ Offline-First-Apps

---

## Filter-Unterstützung

Beide Plugins unterstützen die gleichen Nostr-Filter:

```javascript
// Nach Kind
await storage.query([{ kinds: [1, 3, 7] }]);

// Nach Author
await storage.query([{ authors: ['pubkey1', 'pubkey2'] }]);

// Nach IDs
await storage.query([{ ids: ['eventid1', 'eventid2'] }]);

// Zeitfilter
await storage.query([{ 
  since: 1234567890,
  until: 1234567999
}]);

// Tag-Filter
await storage.query([{ 
  '#e': ['eventid'],
  '#p': ['pubkey']
}]);

// Kombiniert mit Limit
await storage.query([{ 
  kinds: [1],
  authors: ['pubkey1'],
  limit: 20
}]);

// Mehrere Filter (OR)
await storage.query([
  { kinds: [1] },
  { kinds: [3] }
]);
```

---

## Sync mit Relays

Beide Plugins unterstützen Synchronisation mit Relays:

```javascript
// Einmalige Synchronisation
const result = await nostr.storage.sync({
  filters: [{ kinds: [1], limit: 50 }]
});
console.log(`Synced: ${result.saved}/${result.total} events`);

// Auto-Sync aktivieren (alle 60 Sekunden)
nostr.storage.setAutoSync(true, 60000);

// Auto-Sync deaktivieren
nostr.storage.setAutoSync(false);
```

---

## Migration zwischen Plugins

Events zwischen Plugins migrieren:

```javascript
// Von LocalStorage zu SQLite migrieren
const localManager = new StorageManager();
await localManager.initialize(new LocalStoragePlugin());

const sqliteManager = new StorageManager();
await sqliteManager.initialize(new SQLitePlugin());

// Alle Events laden
const events = await localManager.query([]);

// In SQLite speichern
await sqliteManager.save(events);

console.log(`Migrated ${events.length} events to SQLite`);
```

---

## API-Referenz

### StoragePlugin Interface

Alle Plugins implementieren das gleiche Interface:

```javascript
class StoragePlugin {
  // Initialize storage
  async initialize(): Promise<void>
  
  // Save events (returns count saved)
  async save(events: Event[]): Promise<number>
  
  // Query events with filters
  async query(filters: Filter[]): Promise<Event[]>
  
  // Delete events by IDs
  async delete(eventIds: string[]): Promise<number>
  
  // Clear all events
  async clear(): Promise<void>
  
  // Get storage statistics
  async getStats(): Promise<{
    eventCount: number
    approximateSizeBytes: number
    approximateSizeKB: number
    approximateSizeMB?: number
  }>
  
  // Check if initialized
  isInitialized(): boolean
}
```

---

## Eigenes Plugin erstellen

Ein eigenes Storage-Plugin erstellen:

```javascript
import { StoragePlugin } from './StoragePlugin.js';

export class MyCustomPlugin extends StoragePlugin {
  constructor(config = {}) {
    super();
    this.name = 'my-plugin';
    // Your config
  }

  async initialize() {
    // Initialize your storage backend
    this._initialized = true;
  }

  async save(events) {
    // Save events to your backend
    return events.length; // Return count saved
  }

  async query(filters) {
    // Query events from your backend
    return []; // Return array of events
  }

  async delete(eventIds) {
    // Delete events from your backend
    return eventIds.length; // Return count deleted
  }

  async clear() {
    // Clear all events from your backend
  }

  async getStats() {
    // Return storage statistics
    return {
      eventCount: 0,
      approximateSizeBytes: 0,
      approximateSizeKB: 0
    };
  }
}
```

Mögliche Plugin-Ideen:
- IndexedDB-Plugin (größere Kapazität als localStorage)
- Backend-API-Plugin (Server-seitige Speicherung)
- OPFS-Plugin (Origin Private File System)
- Encryption-Plugin (verschlüsselte Speicherung)

---

## Tests

Beide Plugins können getestet werden:

**LocalStorage Test:**
```
http://127.0.0.1:5500/test-storage.html
```

**SQLite Test & Vergleich:**
```
http://127.0.0.1:5500/test-sqlite-storage.html
```

---

## Troubleshooting

### LocalStorage Quota Exceeded
```javascript
// Lösung: Alte Events löschen
const stats = await storage.getStats();
if (stats.approximateSizeKB > 5000) {
  // Älteste Events löschen
  const oldEvents = await storage.query([{
    until: Math.floor(Date.now()/1000) - 86400 * 30 // Älter als 30 Tage
  }]);
  await storage.delete(oldEvents.map(e => e.id));
}
```

### SQLite WASM Load Fehler
```javascript
// Prüfen ob WASM unterstützt wird
if (!WebAssembly) {
  console.error('WebAssembly not supported');
  // Fallback zu LocalStorage
  storage = new LocalStoragePlugin();
}
```

### Sync-Fehler
```javascript
// Error-Handling bei Sync
try {
  await nostr.storage.sync({ filters: [{ kinds: [1] }] });
} catch (error) {
  console.error('Sync failed:', error);
  // Relay möglicherweise offline
  // Weiter mit lokalen Events arbeiten
}
```

---

## Best Practices

1. **Plugin-Wahl**: SQLite für Production, LocalStorage für Development
2. **Batch-Saves**: Mehrere Events zusammen speichern statt einzeln
3. **Filter-Optimierung**: Spezifische Filter verwenden statt alle Events laden
4. **Regelmäßiges Cleanup**: Alte Events regelmäßig löschen
5. **Error-Handling**: Immer try/catch bei Storage-Operationen
6. **Stats Monitoring**: Storage-Größe überwachen und begrenzen

---

---

## Browser-Übergreifender Test

### Anleitung (SQLiteFilePlugin):

1. **In Chrome:**
   ```javascript
   // Initialisiere Plugin
   const nostr = new NostrFramework({
     storage: new SQLiteFilePlugin({ dbName: 'test.db' })
   });
   await nostr.initialize();
   // Wähle Ordner: z.B. Desktop
   
   // Speichere Events
   await nostr.storage.save(events);
   ```

2. **In Edge (gleicher PC):**
   ```javascript
   // Gleichen Code ausführen
   const nostr = new NostrFramework({
     storage: new SQLiteFilePlugin({ dbName: 'test.db' })
   });
   await nostr.initialize();
   // Wähle DENSELBEN Ordner: Desktop
   
   // Events sind verfügbar!
   const events = await nostr.storage.query([]);
   console.log(`${events.length} events shared between browsers!`);
   ```

3. **✅ Erfolg!** Beide Browser nutzen dieselbe Datenbank-Datei.

---

**Erstellt**: 2025-10-03
**Version**: 2.0.0 (SQLiteFilePlugin hinzugefügt)
**Framework**: Nostr Framework