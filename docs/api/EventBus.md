# EventBus API-Referenz

Der EventBus ist das zentrale Event-System des Nostr Frameworks. Er ermöglicht die entkoppelte Kommunikation zwischen allen Modulen mittels des Observer-Patterns.

## Import

```javascript
import { EventBus } from './framework/core/EventBus.js';
```

## Konstruktor

```javascript
const eventBus = new EventBus();
```

**Eigenschaften:**
- `_listeners` (Map): Interne Listener-Registrierung
- `_debugMode` (boolean): Debug-Modus Status

## Methoden

### setDebugMode(enabled)

Aktiviert/deaktiviert den Debug-Modus für detaillierte Logging-Ausgaben.

**Parameter:**
- `enabled` (boolean): Debug-Modus aktivieren/deaktivieren

**Beispiel:**
```javascript
const eventBus = new EventBus();
eventBus.setDebugMode(true);
// Output: [EventBus] Debug mode enabled
```

### on(event, callback)

Registriert einen Event-Listener für ein bestimmtes Event.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = eventBus.on('user:login', (data) => {
  console.log('User logged in:', data.userId);
});

// Event auslösen
eventBus.emit('user:login', { userId: '123' });

// Listener entfernen
unsubscribe();
```

### off(event, callback)

Entfernt einen spezifischen Event-Listener.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Zu entfernende Callback-Funktion

**Beispiel:**
```javascript
const callback = (data) => console.log('Received:', data);
eventBus.on('test', callback);

// Listener entfernen
eventBus.off('test', callback);
```

### once(event, callback)

Registriert einen einmaligen Event-Listener, der nach dem ersten Aufruf automatisch entfernt wird.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
eventBus.once('app:ready', () => {
  console.log('App is ready!');
});

// Wird nur einmal ausgeführt
eventBus.emit('app:ready');
eventBus.emit('app:ready'); // Keine Ausgabe
```

### emit(event, data)

Löst ein Event aus und ruft alle registrierten Listener auf.

**Parameter:**
- `event` (string): Event-Name
- `data` (any, optional): Event-Daten

**Beispiel:**
```javascript
// Mit Daten
eventBus.emit('data:received', { 
  id: '123', 
  content: 'Hello World' 
});

// Ohne Daten
eventBus.emit('system:startup');
```

### clear(event)

Entfernt alle Listener für ein bestimmtes Event oder alle Events.

**Parameter:**
- `event` (string, optional): Event-Name. Wenn nicht angegeben, werden alle Listener entfernt.

**Beispiel:**
```javascript
// Alle Listener für ein bestimmtes Event entfernen
eventBus.clear('user:login');

// Alle Listener entfernen
eventBus.clear();
```

### getEvents()

Gibt eine Liste aller aktiven Event-Namen zurück.

**Rückgabewert:**
- string[]: Array der registrierten Event-Namen

**Beispiel:**
```javascript
eventBus.on('event1', () => {});
eventBus.on('event2', () => {});

const events = eventBus.getEvents();
console.log(events); // ['event1', 'event2']
```

### getListenerCount(event)

Gibt die Anzahl der Listener für ein bestimmtes Event zurück.

**Parameter:**
- `event` (string): Event-Name

**Rückgabewert:**
- number: Anzahl der Listener

**Beispiel:**
```javascript
eventBus.on('test', () => {});
eventBus.on('test', () => {});

const count = eventBus.getListenerCount('test');
console.log(count); // 2
```

### getTotalListeners()

Gibt die Gesamtzahl aller Listener über alle Events hinweg zurück.

**Rückgabewert:**
- number: Gesamtzahl der Listener

**Beispiel:**
```javascript
eventBus.on('event1', () => {});
eventBus.on('event2', () => {});
eventBus.on('event2', () => {});

const total = eventBus.getTotalListeners();
console.log(total); // 3
```

## Events

Der EventBus löst folgende interne Events aus:

### error

Wird ausgelöst, wenn ein Listener einen Fehler wirft.

**Daten:**
```javascript
{
  event: string,    // Event-Name
  error: Error      // Der aufgetretene Fehler
}
```

**Beispiel:**
```javascript
eventBus.on('test', () => {
  throw new Error('Test error');
});

eventBus.on('error', ({ event, error }) => {
  console.error(`Error in ${event}:`, error);
});

eventBus.emit('test');
// Output: [EventBus] Error in listener for "test": Error: Test error
```

## Beispiele

### Basic Usage

```javascript
const eventBus = new EventBus();

// Listener registrieren
eventBus.on('user:login', (user) => {
  console.log(`User ${user.name} logged in`);
});

eventBus.on('user:logout', (user) => {
  console.log(`User ${user.name} logged out`);
});

// Events auslösen
eventBus.emit('user:login', { name: 'Alice' });
eventBus.emit('user:logout', { name: 'Alice' });
```

### Multiple Listeners

```javascript
const eventBus = new EventBus();

// Mehrere Listener für dasselbe Event
eventBus.on('data:update', (data) => {
  console.log('Listener 1:', data.id);
});

eventBus.on('data:update', (data) => {
  console.log('Listener 2:', data.value);
});

// Event auslösen
eventBus.emit('data:update', { id: '123', value: 'test' });
// Output:
// Listener 1: 123
// Listener 2: test
```

### Once Listener

```javascript
const eventBus = new EventBus();

// Einmaliger Listener
eventBus.once('app:init', () => {
  console.log('App initialized');
});

// Wird nur einmal ausgeführt
eventBus.emit('app:init'); // Output: App initialized
eventBus.emit('app:init'); // Keine Ausgabe
```

### Error Handling

```javascript
const eventBus = new EventBus();

// Fehlerhafter Listener
eventBus.on('test', () => {
  throw new Error('Something went wrong');
});

// Fehler-Handler
eventBus.on('error', ({ event, error }) => {
  console.error(`Error in ${event}:`, error.message);
});

// Event auslösen
eventBus.emit('test');
// Output: [EventBus] Error in listener for "test": Error: Something went wrong
```

### Debug Mode

```javascript
const eventBus = new EventBus();
eventBus.setDebugMode(true);

// Listener registrieren
eventBus.on('test', (data) => {
  console.log('Received:', data);
});

// Event auslösen
eventBus.emit('test', { message: 'Hello' });
// Output:
// [EventBus] Listener registered for "test"
// [EventBus] Emitting "test" { message: "Hello" }
// [EventBus] No listeners for "test" (wenn keine Listener registriert sind)
```

### Listener Management

```javascript
const eventBus = new EventBus();

// Listener hinzufügen
const listener1 = (data) => console.log('Listener 1:', data);
const listener2 = (data) => console.log('Listener 2:', data);

eventBus.on('test', listener1);
eventBus.on('test', listener2);

console.log('Listener count:', eventBus.getListenerCount('test')); // 2

// Spezifischen Listener entfernen
eventBus.off('test', listener1);
console.log('Listener count:', eventBus.getListenerCount('test')); // 1

// Alle Listener für Event entfernen
eventBus.clear('test');
console.log('Listener count:', eventBus.getListenerCount('test')); // 0
```

### Unsubscribe Pattern

```javascript
const eventBus = new EventBus();

// Listener mit Unsubscribe-Funktion
const unsubscribe = eventBus.on('data:change', (data) => {
  console.log('Data changed:', data);
  
  // Nach erster Änderung unsubscribe
  if (data.id === 'final') {
    unsubscribe();
    console.log('Unsubscribed from data:change');
  }
});

// Events auslösen
eventBus.emit('data:change', { id: '1' });
eventBus.emit('data:change', { id: 'final' });
eventBus.emit('data:change', { id: '2' }); // Keine Ausgabe mehr
```

## Integration mit Framework-Modulen

### Mit IdentityManager

```javascript
const eventBus = new EventBus();
const identityManager = new IdentityManager(eventBus);

// Auf Authentifizierungs-Events lauschen
eventBus.on('identity:login', (identity) => {
  console.log('User logged in:', identity.npub);
});

eventBus.on('identity:logout', () => {
  console.log('User logged out');
});
```

### Mit EventManager

```javascript
const eventBus = new EventBus();
const eventManager = new EventManager(eventBus);

// Auf Event-Manager Events lauschen
eventBus.on('event:published', (data) => {
  console.log('Event published:', data.event.id);
});

eventBus.on('event:error', (data) => {
  console.error('Event error:', data.error);
});
```

### Mit StorageManager

```javascript
const eventBus = new EventBus();
const storageManager = new StorageManager(eventBus);

// Auf Storage-Events lauschen
eventBus.on('storage:saved', (data) => {
  console.log('Events saved:', data.count);
});

eventBus.on('storage:synced', (data) => {
  console.log('Sync completed:', data.saved);
});
```

## Best Practices

1. **Event Naming**: Konsistente Namenskonventionen verwenden (z.B. `module:action`)
2. **Error Handling**: Immer auf `error` Events lauschen
3. **Memory Management**: Unsubscribe-Funktionen verwenden um Memory Leaks zu vermeiden
4. **Debug Mode**: Debug-Modus während der Entwicklung aktivieren
5. **Event Data**: Strukturierte Daten übergeben

## Performance

- **Efficient Lookup**: Map-basierte Listener-Speicherung für O(1) Zugriffszeit
- **Memory Management**: Automatische Bereinigung leerter Listener-Arrays
- **Error Isolation**: Fehler in einem Listener beeinflussen nicht andere

## Debugging

### Debug Mode

```javascript
const eventBus = new EventBus();
eventBus.setDebugMode(true);

// Zeigt alle Event-Aktivitäten an
eventBus.emit('test', { data: 'value' });
// Output: [EventBus] Emitting "test" { data: "value" }
```

### Listener Inspection

```javascript
// Alle aktiven Events auflisten
console.log('Active events:', eventBus.getEvents());

// Listener-Anzahl prüfen
console.log('Total listeners:', eventBus.getTotalListeners());

// Spezifische Listener-Anzahl
eventBus.getEvents().forEach(event => {
  console.log(`${event}: ${eventBus.getListenerCount(event)} listeners`);
});
```

## Typdefinitionen

### EventCallback

```typescript
type EventCallback = (data?: any) => void;
```

### UnsubscribeFunction

```typescript
type UnsubscribeFunction = () => void;
```

### ErrorEventData

```typescript
interface ErrorEventData {
  event: string;
  error: Error;
}
```

## Fehlerbehandlung

Der EventBus fängt folgende Fehler ab:
- Ungültige Callback-Funktionen
- Fehler in Listener-Callbacks
- Memory Leak Prävention

Alle Fehler werden über `error` Events gemeldet und verhindern nicht die Ausführung anderer Listener.

## Testing

Der EventBus enthält eine eingebaute Test-Suite:

```javascript
import { runEventBusTests } from './framework/core/EventBus.test.js';

const results = runEventBusTests();
console.log('Test Results:', results);
// Output: { passed: 12, failed: 0, tests: [...] }
```

## Nächste Schritte

- [IdentityManager API](./IdentityManager.md) - Identitätsverwaltung
- [SignerManager API](./SignerManager.md) - Event-Signierung
- [TemplateEngine API](./TemplateEngine.md) - Template-Verwaltung
- [RelayManager API](./RelayManager.md) - Relay-Operationen