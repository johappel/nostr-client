# NIP-01 Templates API-Referenz

NIP-01 definiert die grundlegenden Nostr Event-Typen. Diese Templates implementieren die Basis-Events wie Text Notes und User Metadata.

## Import

```javascript
import { TextNoteTemplate, SetMetadataTemplate } from './framework/templates/nip01.js';
```

## TextNoteTemplate

Implementiert NIP-01 Text Notes (kind: 1) - die grundlegenden Text-Beiträge in Nostr.

### Konstruktor

```javascript
const template = new TextNoteTemplate();
```

### Eigenschaften

- `name` (string): 'text-note'
- `kind` (number): 1
- `nip` (string): 'NIP-01'
- `description` (string): 'Basic text note'

### Methoden

#### build(data)

Erstellt ein unsigniertes Text Note Event.

**Parameter:**
- `data` (Object): Event-Daten
  - `content` (string, erforderlich): Text-Inhalt
  - `tags` (Array<string[]>, optional): Event-Tags
  - `created_at` (number, optional): Unix-Timestamp

**Rückgabewert:**
- UnsignedEvent

**Beispiel:**
```javascript
const template = new TextNoteTemplate();

// Einfaches Text Note
const event = template.build({
  content: 'Hello Nostr World!'
});

// Text Note mit Tags
const eventWithTags = template.build({
  content: 'Learning about Nostr #nostr',
  tags: [['t', 'nostr'], ['p', 'author-pubkey']]
});

// Text Note mit benutzerdefiniertem Timestamp
const eventWithTime = template.build({
  content: 'Scheduled post',
  created_at: Math.floor(Date.now() / 1000) + 3600 // Eine Stunde in der Zukunft
});
```

#### validate(data)

Validiert die Daten für ein Text Note.

**Parameter:**
- `data` (Object): Zu validierende Daten

**Rückgabewert:**
- boolean: true wenn valide

**Wirft:**
- Error: Wenn Validierung fehlschlägt

**Beispiel:**
```javascript
try {
  template.validate({ content: 'Valid content' });
  console.log('✓ Valid');
} catch (error) {
  console.error('✗ Invalid:', error.message);
}
```

#### parse(event)

Parst ein empfangenes Text Note Event.

**Parameter:**
- `event` (SignedEvent): Zu parsendes Event

**Rückgabewert:**
- Object: Geparste Daten

**Beispiel:**
```javascript
const parsed = template.parse(receivedEvent);
console.log('Content:', parsed.content);
console.log('Author:', parsed.author);
console.log('Tags:', parsed.tags);
console.log('Created:', new Date(parsed.created_at * 1000));
```

#### getRequiredFields()

Gibt die erforderlichen Felder zurück.

**Rückgabewert:**
- string[]: ['content']

#### getOptionalFields()

Gibt die optionalen Felder zurück.

**Rückgabewert:**
- string[]: ['tags', 'created_at']

### Beispiele

#### Basic Text Note

```javascript
const template = new TextNoteTemplate();

// Erstellen
const event = template.build({
  content: 'Hello from Nostr Framework!'
});

console.log('Event:', event);
// Output: {
//   kind: 1,
//   content: 'Hello from Nostr Framework!',
//   tags: [],
//   created_at: 1234567890
// }
```

#### Text Note with Tags

```javascript
// Mit Hashtags
const hashtagEvent = template.build({
  content: 'Exploring #nostr and #decentralized social media',
  tags: [['t', 'nostr'], ['t', 'decentralized']]
});

// Mit User-Mention
const mentionEvent = template.build({
  content: 'Replying to @npub1...',
  tags: [['p', 'mentioned-pubkey'], ['e', 'replied-event-id']]
});

// Mit Location
const locationEvent = template.build({
  content: 'Posting from Berlin!',
  tags: [['location', 'Berlin, Germany']]
});
```

#### Parsing Examples

```javascript
const template = new TextNoteTemplate();

// Einfaches Event parsen
const parsed = template.parse({
  id: 'event-id',
  pubkey: 'author-pubkey',
  created_at: 1234567890,
  kind: 1,
  tags: [['t', 'nostr']],
  content: 'Hello Nostr!',
  sig: 'signature'
});

console.log(parsed);
// Output: {
//   content: 'Hello Nostr!',
//   tags: [['t', 'nostr']],
//   author: 'author-pubkey',
//   created_at: 1234567890,
//   id: 'event-id'
// }
```

## SetMetadataTemplate

Implementiert NIP-01 Set Metadata (kind: 0) - Benutzerprofil-Metadaten.

### Konstruktor

```javascript
const template = new SetMetadataTemplate();
```

### Eigenschaften

- `name` (string): 'set-metadata'
- `kind` (number): 0
- `nip` (string): 'NIP-01'
- `description` (string): 'User profile metadata'

### Methoden

#### build(data)

Erstellt ein unsigniertes Metadata Event.

**Parameter:**
- `data` (Object): Metadaten
  - `name` (string, optional): Anzeigename
  - `about` (string, optional): Über mich Text
  - `picture` (string, optional): Profilbild URL
  - `nip05` (string, optional): NIP-05 Identifier
  - `lud16` (string, optional): Lightning Address
  - `website` (string, optional): Website URL
  - `banner` (string, optional): Header-Bild URL
  - `created_at` (number, optional): Unix-Timestamp

**Rückgabewert:**
- UnsignedEvent

**Beispiel:**
```javascript
const template = new SetMetadataTemplate();

// Vollständiges Profil
const profile = template.build({
  name: 'Alice',
  about: 'Nostr enthusiast and developer',
  picture: 'https://example.com/avatar.jpg',
  nip05: 'alice@example.com',
  lud16: 'alice@wallet.com',
  website: 'https://alice.example.com',
  banner: 'https://example.com/banner.jpg'
});

// Minimales Profil
const minimalProfile = template.build({
  name: 'Bob'
});
```

#### parse(event)

Parst ein empfangenes Metadata Event.

**Parameter:**
- `event` (SignedEvent): Zu parsendes Event

**Rückgabewert:**
- Object: Geparste Metadaten

**Beispiel:**
```javascript
const parsed = template.parse(metadataEvent);
console.log('Name:', parsed.name);
console.log('About:', parsed.about);
console.log('Updated:', new Date(parsed.updated_at * 1000));
```

#### getOptionalFields()

Gibt die optionalen Felder zurück.

**Rückgabewert:**
- string[]: ['name', 'about', 'picture', 'nip05', 'lud16', 'website', 'banner']

### Beispiele

#### Complete Profile

```javascript
const template = new SetMetadataTemplate();

const event = template.build({
  name: 'John Doe',
  about: 'Software developer passionate about decentralized technologies',
  picture: 'https://avatars.githubusercontent.com/johndoe',
  nip05: 'johndoe@example.com',
  lud16: 'johndoe@lnbits.com',
  website: 'https://johndoe.dev',
  banner: 'https://johndoe.dev/banner.jpg'
});

console.log('Metadata event:', event);
// Output: {
//   kind: 0,
//   content: '{"name":"John Doe","about":"Software developer...","picture":"..."}',
//   tags: [],
//   created_at: 1234567890
// }
```

#### Parsing Profile

```javascript
const parsed = template.parse({
  id: 'metadata-event-id',
  pubkey: 'user-pubkey',
  created_at: 1234567890,
  kind: 0,
  tags: [],
  content: '{"name":"Alice","about":"Developer","picture":"https://..."}',
  sig: 'signature'
});

console.log(parsed);
// Output: {
//   name: 'Alice',
//   about: 'Developer',
//   picture: 'https://...',
//   pubkey: 'user-pubkey',
//   updated_at: 1234567890
// }
```

## Integration

### Mit TemplateEngine

```javascript
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { TextNoteTemplate, SetMetadataTemplate } from './framework/templates/nip01.js';

const templateEngine = new TemplateEngine();

// Templates registrieren
templateEngine.register('text-note', new TextNoteTemplate());
templateEngine.register('set-metadata', new SetMetadataTemplate());

// Text Note erstellen
const textNote = templateEngine.build('text-note', {
  content: 'Hello from TemplateEngine!'
});

// Profil aktualisieren
const metadata = templateEngine.build('set-metadata', {
  name: 'New Name',
  about: 'Updated profile'
});
```

### Mit EventManager

```javascript
// Text Note veröffentlichen
const result = await eventManager.createAndPublish('text-note', {
  content: 'Hello from EventManager!',
  tags: [['t', 'nostr']]
});

// Profil aktualisieren
const profileResult = await eventManager.createAndPublish('set-metadata', {
  name: 'Alice',
  about: 'Nostr user',
  picture: 'https://example.com/avatar.jpg'
});
```

## Best Practices

### Text Notes

1. **Content Length**: Inhalte prägnant halten (empfohlen < 1000 Zeichen)
2. **Tags**: Relevante Tags für bessere Discoverability
3. **Mentions**: User-Mentions mit p-Tags kennzeichnen
4. **Replies**: Auf Events mit e-Tags antworten

### Metadata

1. **Complete Profile**: Alle verfügbaren Felder ausfüllen
2. **Valid URLs**: Sicherstellen dass URLs erreichbar sind
3. **NIP-05**: Verification für Identität nutzen
4. **Regular Updates**: Profil regelmäßig aktualisieren

## Validation

### Content Validation

```javascript
// Eigene Validierung für Text Notes
function validateTextNote(content) {
  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }
  
  if (content.length > 10000) {
    throw new Error('Content too long (max 10000 characters)');
  }
  
  return true;
}

// Mit Template verwenden
const template = new TextNoteTemplate();
const originalBuild = template.build.bind(template);

template.build = function(data) {
  validateTextNote(data.content);
  return originalBuild(data);
};
```

### Metadata Validation

```javascript
// URL-Validierung für Profilfelder
function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// NIP-05 Validierung
function validateNIP05(nip05) {
  const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(nip05);
}
```

## Error Handling

```javascript
try {
  const event = textNoteTemplate.build({
    content: 'Valid content'
  });
} catch (error) {
  if (error.message.includes('required')) {
    console.error('Missing required field:', error.message);
  } else {
    console.error('Validation failed:', error.message);
  }
}
```

## Nächste Schritte

- [EventTemplate API](./EventTemplate.md) - Basis-Template-Klasse
- [NIP-09 Templates](./nip09.md) - Event Deletion Templates
- [NIP-52 Templates](./nip52.md) - Calendar Event Templates
- [TemplateEngine API](../TemplateEngine.md) - Template-Verwaltung