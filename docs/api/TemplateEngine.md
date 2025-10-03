
# TemplateEngine API-Referenz

Die TemplateEngine verwaltet Event-Templates für verschiedene NIPs (Nostr Improvement Proposals). Sie ermöglicht die Erstellung, Validierung und Parsing von Nostr Events basierend auf definierten Templates.

## Import

```javascript
import { TemplateEngine } from './framework/core/TemplateEngine.js';
```

## Konstruktor

```javascript
const templateEngine = new TemplateEngine(eventBus);
```

**Parameter:**
- `eventBus` (EventBus, optional): EventBus-Instanz für die Kommunikation. Wenn nicht angegeben, wird eine neue erstellt.

## Methoden

### register(name, template)

Registriert ein Event-Template.

**Parameter:**
- `name` (string): Eindeutiger Template-Name (z.B. 'text-note', 'calendar-event')
- `template` (EventTemplate): Template-Instanz

**Beispiel:**
```javascript
import { TextNoteTemplate } from './framework/templates/nip01.js';

const textNoteTemplate = new TextNoteTemplate();
templateEngine.register('text-note', textNoteTemplate);
```

### unregister(name)

Entfernt ein registriertes Template.

**Parameter:**
- `name` (string): Template-Name

**Beispiel:**
```javascript
templateEngine.unregister('text-note');
```

### get(name)

Gibt ein registriertes Template zurück.

**Parameter:**
- `name` (string): Template-Name

**Rückgabewert:**
- EventTemplate|null: Template-Instanz oder null

**Beispiel:**
```javascript
const template = templateEngine.get('text-note');
if (template) {
  console.log('Template kind:', template.kind);
}
```

### has(name)

Prüft, ob ein Template registriert ist.

**Parameter:**
- `name` (string): Template-Name

**Rückgabewert:**
- boolean: true wenn registriert, false sonst

**Beispiel:**
```javascript
if (templateEngine.has('text-note')) {
  console.log('Text note template is available');
}
```

### getTemplateNames()

Gibt eine Liste aller registrierten Template-Namen zurück.

**Rückgabewert:**
- string[]: Array der registrierten Template-Namen

**Beispiel:**
```javascript
const names = templateEngine.getTemplateNames();
console.log('Available templates:', names);
```

### getByKind(kind)

Gibt alle Templates für einen bestimmten Event-Typ zurück.

**Parameter:**
- `kind` (number): Event-Typ

**Rückgabewert:**
- EventTemplate[]: Array der Templates mit dem angegebenen Typ

**Beispiel:**
```javascript
const textNoteTemplates = templateEngine.getByKind(1);
console.log(`Found ${textNoteTemplates.length} text note templates`);
```

### getByNip(nip)

Gibt alle Templates für einen bestimmten NIP zurück.

**Parameter:**
- `nip` (string): NIP-Bezeichner (z.B. 'NIP-01', 'NIP-52')

**Rückgabewert:**
- EventTemplate[]: Array der Templates für den angegebenen NIP

**Beispiel:**
```javascript
const nip01Templates = templateEngine.getByNip('NIP-01');
console.log('NIP-01 templates:', nip01Templates.map(t => t.name));
```

### build(templateName, data)

Erstellt ein unsigniertes Event aus einem Template.

**Parameter:**
- `templateName` (string): Template-Name
- `data` (Object): Event-Daten

**Rückgabewert:**
- UnsignedEvent: Erstelltes Event

**Beispiel:**
```javascript
const event = templateEngine.build('text-note', {
  content: 'Hello Nostr!',
  tags: [['t', 'nostr']]
});

console.log('Created event:', event);
```

### parse(templateName, event)

Parst ein empfangenes Event mit einem Template.

**Parameter:**
- `templateName` (string): Template-Name
- `event` (SignedEvent): Zu parsendes Event

**Rückgabewert:**
- Object: Geparste Event-Daten

**Beispiel:**
```javascript
const parsed = templateEngine.parse('text-note', receivedEvent);
console.log('Parsed content:', parsed.content);
console.log('Author:', parsed.author);
```

### getSchema(templateName)

Gibt das Schema eines Templates zurück.

**Parameter:**
- `templateName` (string): Template-Name

**Rückgabewert:**
- Object: Template-Schema

**Beispiel:**
```javascript
const schema = templateEngine.getSchema('text-note');
console.log('Required fields:', schema.required);
console.log('Optional fields:', schema.optional);
```

### getAllSchemas()

Gibt alle Template-Schemas zurück.

**Rückgabewert:**
- Object: Alle Schemas nach Template-Namen

**Beispiel:**
```javascript
const schemas = templateEngine.getAllSchemas();
Object.entries(schemas).forEach(([name, schema]) => {
  console.log(`${name}: ${schema.description}`);
});
```

### on(event, callback)

Registriert einen Event-Listener für Template-Events.

**Parameter:**
- `event` (string): Event-Name
- `callback` (Function): Callback-Funktion

**Rückgabewert:**
- Function: Unsubscribe-Funktion

**Beispiel:**
```javascript
const unsubscribe = templateEngine.on('template:built', (data) => {
  console.log('Event built:', data.templateName);
});
```

## Events

Die TemplateEngine löst folgende Events aus:

### template:registered

Wird ausgelöst, wenn ein Template registriert wird.

**Daten:**
```javascript
{
  name: string,
  template: EventTemplate
}
```

### template:unregistered

Wird ausgelöst, wenn ein Template entfernt wird.

**Daten:**
```javascript
{
  name: string
}
```

### template:built

Wird ausgelöst, wenn ein Event aus einem Template erstellt wird.

**Daten:**
```javascript
{
  templateName: string,
  event: UnsignedEvent
}
```

### template:parsed

Wird ausgelöst, wenn ein Event mit einem Template geparst wird.

**Daten:**
```javascript
{
  templateName: string,
  event: SignedEvent,
  parsed: Object
}
```

### template:error

Wird ausgelöst, wenn ein Fehler auftritt.

**Daten:**
```javascript
{
  templateName: string,
  error: Error
}
```

## Standard-Templates

Das Framework liefert folgende Standard-Templates mit:

### NIP-01 Templates

#### TextNoteTemplate (kind: 1)
- Name: 'text-note'
- Beschreibung: Basic text note
- Erforderliche Felder: `content`
- Optionale Felder: `tags`, `created_at`

#### SetMetadataTemplate (kind: 0)
- Name: 'set-metadata'
- Beschreibung: User profile metadata
- Optionale Felder: `name`, `about`, `picture`, `nip05`, `lud16`, `website`, `banner`

### NIP-09 Templates

#### EventDeletionTemplate (kind: 5)
- Name: 'delete-event'
- Beschreibung: Event deletion request
- Erforderliche Felder: `eventIds`
- Optionale Felder: `reason`

### NIP-52 Templates

#### CalendarEventTemplate (kind: 31923)
- Name: 'calendar-event'
- Beschreibung: Calendar time-based event
- Erforderliche Felder: `title`, `start`
- Optionale Felder: `end`, `location`, `image`, `url`, `description`, `uid`, `tags`

## Beispiele

### Basic Template Usage

```javascript
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { TextNoteTemplate, CalendarEventTemplate } from './framework/templates/index.js';

const templateEngine = new TemplateEngine();

// Templates registrieren
templateEngine
.register('text-note', new TextNoteTemplate());
templateEngine.register('calendar-event', new CalendarEventTemplate());

// Event erstellen
const textNote = templateEngine.build('text-note', {
  content: 'Hello Nostr!',
  tags: [['t', 'greeting']]
});

console.log('Text note:', textNote);
// Output: { kind: 1, content: 'Hello Nostr!', tags: [['t', 'greeting']], created_at: 1234567890 }
```

### Calendar Event Example

```javascript
// Kalender-Event erstellen
const calendarEvent = templateEngine.build('calendar-event', {
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  end: '2024-12-01T20:00:00Z',
  location: 'Berlin, Germany',
  description: 'Monthly Nostr community meetup'
});

console.log('Calendar event:', calendarEvent);
// Output: { kind: 31923, content: 'Monthly Nostr community meetup', 
//          tags: [['d', 'uid-123'], ['title', 'Nostr Meetup'], 
//                 ['start', '2024-12-01T18:00:00Z'], ['end', '2024-12-01T20:00:00Z'],
//                 ['location', 'Berlin, Germany']], created_at: 1234567890 }
```

### Event Parsing

```javascript
// Empfangenes Event parsen
const parsed = templateEngine.parse('calendar-event', receivedEvent);

console.log('Parsed event:', parsed);
// Output: { uid: 'uid-123', title: 'Nostr Meetup', start: '2024-12-01T18:00:00Z',
//          end: '2024-12-01T20:00:00Z', location: 'Berlin, Germany',
//          description: 'Monthly Nostr community meetup', author: 'pubkey', ... }
```

### Template Discovery

```javascript
// Alle verfügbaren Templates auflisten
const templateNames = templateEngine.getTemplateNames();
console.log('Available templates:', templateNames);

// Templates nach Typ filtern
const textNoteTemplates = templateEngine.getByKind(1);
console.log('Text note templates:', textNoteTemplates.map(t => t.name));

// Templates nach NIP filtern
const nip01Templates = templateEngine.getByNip('NIP-01');
console.log('NIP-01 templates:', nip01Templates.map(t => t.name));
```

### Schema Documentation

```javascript
// Template-Schema abrufen
const schema = templateEngine.getSchema('text-note');
console.log('Text note schema:', schema);
// Output: { name: 'text-note', kind: 1, nip: 'NIP-01',
//          description: 'Basic text note', required: ['content'], 
//          optional: ['tags', 'created_at'] }

// Alle Schemas abrufen
const allSchemas = templateEngine.getAllSchemas();
Object.entries(allSchemas).forEach(([name, schema]) => {
  console.log(`${name} (kind ${schema.kind}): ${schema.description}`);
});
```

### Event Handling

```javascript
// Template-Registrierung überwachen
templateEngine.on('template:registered', ({ name, template }) => {
  console.log(`Template registered: ${name} (kind ${template.kind})`);
});

// Event-Erstellung überwachen
templateEngine.on('template:built', ({ templateName, event }) => {
  console.log(`Event built with ${templateName}:`, event.id);
});

// Event-Parsing überwachen
templateEngine.on('template:parsed', ({ templateName, event, parsed }) => {
  console.log(`Event parsed with ${templateName}:`, parsed.title);
});

// Fehler überwachen
templateEngine.on('template:error', ({ templateName, error }) => {
  console.error(`Template error in ${templateName}:`, error);
});
```

### Custom Template Creation

```javascript
import { EventTemplate } from './framework/templates/EventTemplate.js';

// Eigenes Template erstellen
class ReactionTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'reaction',
      kind: 7,
      nip: 'NIP-25',
      description: 'Reaction to events'
    });
  }

  build(data) {
    return {
      kind: 7,
      content: data.content || '+',
      tags: [['e', data.eventId]],
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.eventId) {
      throw new Error('Event ID is required');
    }
    return true;
  }

  parse(event) {
    const eventId = event.tags.find(t => t[0] === 'e')?.[1];
    return {
      content: event.content,
      eventId,
      author: event.pubkey,
      created_at: event.created_at
    };
  }

  getRequiredFields() {
    return ['eventId'];
  }

  getOptionalFields() {
    return ['content', 'created_at'];
  }
}

// Eigenes Template registrieren
templateEngine.register('reaction', new ReactionTemplate());

// Eigenes Template verwenden
const reaction = templateEngine.build('reaction', {
  eventId: 'target-event-id',
  content: '👍'
});
```

### Validation

```javascript
// Template-Validierung
try {
  const event = templateEngine.build('calendar-event', {
    title: 'Test Event'
    // start fehlt - wird Fehler werfen
  });
} catch (error) {
  console.error('Validation failed:', error.message);
  // Output: "Start time is required"
}

// Erforderliche Felder prüfen
const schema = templateEngine.getSchema('calendar-event');
console.log('Required fields:', schema.required);
// Output: ['title', 'start']

// Optionale Felder prüfen
console.log('Optional fields:', schema.optional);
// Output: ['end', 'location', 'image', 'url', 'description', 'uid', 'tags']
```

## Integration mit anderen Modulen

### Mit EventManager

```javascript
// Templates im EventManager verwenden
const unsignedEvent = eventManager.createUnsignedEvent('text-note', {
  content: 'Hello from EventManager!'
});

// EventManager verwendet intern die TemplateEngine
const signedEvent = await eventManager.createEvent('text-note', {
  content: 'Hello from EventManager!'
});
```

### Mit SignerManager

```javascript
// Event erstellen und signieren
const unsignedEvent = templateEngine.build('text-note', {
  content: 'Hello Nostr!'
});

const signedEvent = await signerManager.signEvent(unsignedEvent);
```

## Best Practices

1. **Template-Registrierung**: Alle Templates vor der Verwendung registrieren
2. **Validierung**: Immer die Template-Validierung nutzen
3. **Schema-Dokumentation**: Schemas für UI-Generierung verwenden
4. **Error Handling**: Auf `template:error` Events lauschen
5. **Custom Templates**: Eigenen Templates von EventTemplate ableiten

## Erweiterbarkeit

### Eigene Templates erstellen

1. Von `EventTemplate` erben
2. `build()`-Methode implementieren
3. `validate()`-Methode implementieren (optional)
4. `parse()`-Methode implementieren (optional)
5. `getRequiredFields()` und `getOptionalFields()` implementieren

### Template-Konventionen

1. **Namen**: Kleinbuchstaben mit Bindestrichen (z.B. 'text-note')
2. **NIP-Referenz**: Immer den zugehörigen NIP angeben
3. **Validierung**: Erforderliche Felder immer validieren
4. **Parsing**: Konsistente Datenstrukturen zurückgeben
5. **Dokumentation**: Klare Beschreibung und Feld-Dokumentation

## Typdefinitionen

### UnsignedEvent

```javascript
{
  kind: number,           // Event-Typ
  content: string,        // Event-Inhalt
  tags: Array<string[]>,  // Event-Tags
  created_at: number      // Unix-Timestamp
}
```

### SignedEvent

```javascript
{
  id: string,             // Event-ID (Hash)
  pubkey: string,         // Öffentlicher Schlüssel des Autors
  created_at: number,     // Unix-Timestamp
  kind: number,           // Event-Typ
  tags: Array<string[]>,  // Event-Tags
  content: string,        // Event-Inhalt
  sig: string             // Signatur
}
```

### TemplateSchema

```javascript
{
  name: string,           // Template-Name
  kind: number,           // Event-Typ
  nip: string,            // NIP-Bezeichner
  description: string,    // Beschreibung
  required: string[],     // Erforderliche Felder
  optional: string[]      // Optionale Felder
}
```

## Fehlerbehandlung

Die TemplateEngine fängt folgende Fehler ab:
- Template nicht gefunden
- Validierungsfehler
- Ungültige Event-Struktur
- Parsing-Fehler

Alle Fehler werden über `template:error` Events gemeldet und als Exceptions geworfen.