# Template APIs

Das Nostr Framework verwendet ein Template-basiertes System für die Erstellung und Validierung von Nostr Events. Diese Sektion dokumentiert alle verfügbaren Templates und deren APIs.

## Template-Typen

- [EventTemplate](./EventTemplate.md) - Basis-Template-Klasse
- [NIP-01 Templates](./nip01.md) - Grundlegende Nostr Events
- [NIP-09 Templates](./nip09.md) - Event Löschung
- [NIP-52 Templates](./nip52.md) - Kalender Events

## Standard-Templates

### NIP-01 (Basic Protocol)

- **TextNoteTemplate** (kind: 1) - Text Notes
- **SetMetadataTemplate** (kind: 0) - User Profile Metadata

### NIP-09 (Event Deletion)

- **EventDeletionTemplate** (kind: 5) - Event Deletion Request

### NIP-52 (Calendar Events)

- **CalendarEventTemplate** (kind: 31923) - Calendar Time-based Event

## Template-Verwendung

### Templates registrieren

```javascript
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { TextNoteTemplate, CalendarEventTemplate } from './framework/templates/index.js';

const templateEngine = new TemplateEngine();

// Standard-Templates registrieren
templateEngine.register('text-note', new TextNoteTemplate());
templateEngine.register('calendar-event', new CalendarEventTemplate());
```

### Events erstellen

```javascript
// Text Note erstellen
const textNote = templateEngine.build('text-note', {
  content: 'Hello Nostr!',
  tags: [['t', 'greeting']]
});

// Kalender-Event erstellen
const calendarEvent = templateEngine.build('calendar-event', {
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  location: 'Berlin'
});
```

### Events parsen

```javascript
// Empfangenes Event parsen
const parsed = templateEngine.parse('text-note', receivedEvent);
console.log('Content:', parsed.content);
console.log('Author:', parsed.author);
```

## Eigenes Template erstellen

### Beispiel: Poll Template

```javascript
import { EventTemplate } from './framework/templates/EventTemplate.js';

class PollTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'poll',
      kind: 6969,
      nip: 'custom',
      description: 'Poll event with multiple options'
    });
  }

  build(data) {
    const tags = [
      ['poll', data.question],
      ...data.options.map((option, index) => ['option', index.toString(), option])
    ];

    return {
      kind: 6969,
      content: data.description || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.question) throw new Error('Question is required');
    if (!data.options || data.options.length < 2) {
      throw new Error('At least 2 options required');
    }
    return true;
  }

  parse(event) {
    const question = event.tags.find(t => t[0] === 'poll')?.[1];
    const options = event.tags
      .filter(t => t[0] === 'option')
      .map(t => ({ index: parseInt(t[1]), text: t[2] }))
      .sort((a, b) => a.index - b.index);

    return {
      question,
      options,
      description: event.content,
      author: event.pubkey,
      created_at: event.created_at
    };
  }

  getRequiredFields() {
    return ['question', 'options'];
  }

  getOptionalFields() {
    return ['description', 'created_at'];
  }
}

// Template registrieren
templateEngine.register('poll', new PollTemplate());
```

## Template-Konventionen

1. **Namen**: Kleinbuchstaben mit Bindestrichen (z.B. 'text-note')
2. **NIP-Referenz**: Immer den zugehörigen NIP angeben
3. **Validierung**: Erforderliche Felder immer validieren
4. **Parsing**: Konsistente Datenstrukturen zurückgeben
5. **Dokumentation**: Klare Beschreibung und Feld-Dokumentation

## Feld-Typen

### Standard-Felder

- `kind` (number): Event-Typ (erforderlich)
- `content` (string): Event-Inhalt (erforderlich)
- `tags` (Array<string[]>): Event-Tags (erforderlich)
- `created_at` (number): Unix-Timestamp (erforderlich)

### Tag-Formate

```javascript
// Event-Referenz
['e', 'event-id', 'relay-url', 'marker']

// Public-Key-Referenz
['p', 'pubkey', 'relay-url', 'marker']

// Hashtag
['t', 'hashtag']

// Custom Tag
['custom', 'value1', 'value2']
```

## Validation

### Required Fields

```javascript
getRequiredFields() {
  return ['content']; // Nur content ist erforderlich
}
```

### Optional Fields

```javascript
getOptionalFields() {
  return ['tags', 'created_at'];
}
```

### Custom Validation

```javascript
validate(data) {
  // Basis-Validierung
  if (!data.content) {
    throw new Error('Content is required');
  }
  
  // Custom-Validierung
  if (data.content.length > 1000) {
    throw new Error('Content too long');
  }
  
  return true;
}
```

## Parsing

### Standard Parsing

```javascript
parse(event) {
  return {
    content: event.content,
    tags: event.tags,
    author: event.pubkey,
    created_at: event.created_at,
    id: event.id
  };
}
```

### Complex Parsing

```javascript
parse(event) {
  const getTag = (name) => {
    const tag = event.tags.find(t => t[0] === name);
    return tag ? tag[1] : null;
  };

  return {
    title: getTag('title'),
    start: getTag('start'),
    end: getTag('end'),
    location: getTag('location'),
    description: event.content,
    author: event.pubkey,
    created_at: event.created_at
  };
}
```

## Best Practices

1. **Validation**: Immer Eingaben validieren
2. **Error Messages**: Klare Fehlermeldungen bereitstellen
3. **Documentation**: Alle Felder dokumentieren
4. **Testing**: Templates umfassend testen
5. **Extensibility**: Erweiterbare Designs verwenden

## Nächste Schritte

- [EventTemplate API](./EventTemplate.md) - Basis-Template-Klasse
- [NIP-01 Templates](./nip01.md) - Basic Protocol Templates
- [NIP-09 Templates](./nip09.md) - Event Deletion Templates
- [NIP-52 Templates](./nip52.md) - Calendar Event Templates