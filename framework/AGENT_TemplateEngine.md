# AGENT: TemplateEngine

## Ziel
Implementierung des Template-Systems für NIP-basierte Event-Erstellung und -Validierung.

## Dateipfad
`framework/core/TemplateEngine.js`

## Abhängigkeiten
- `EventBus`

---

## Implementierungsschritte

### Schritt 1: Template Interface

**Datei**: `framework/templates/EventTemplate.js`

```javascript
// framework/templates/EventTemplate.js

/**
 * Base class for event templates
 * Defines structure and validation for specific NIPs
 */
export class EventTemplate {
  constructor(config = {}) {
    this.name = config.name || 'unnamed';
    this.kind = config.kind;
    this.nip = config.nip || null;
    this.description = config.description || '';
  }

  /**
   * Build unsigned event from data
   * @param {Object} data - Input data
   * @returns {UnsignedEvent}
   */
  build(data) {
    throw new Error(`${this.name}: build() must be implemented`);
  }

  /**
   * Validate event data before building
   * @param {Object} data - Input data
   * @returns {boolean}
   */
  validate(data) {
    // Default: accept all
    return true;
  }

  /**
   * Parse received event into structured data
   * @param {SignedEvent} event - Received event
   * @returns {Object}
   */
  parse(event) {
    // Default: return event as-is
    return event;
  }

  /**
   * Get required fields for this template
   * @returns {string[]}
   */
  getRequiredFields() {
    return [];
  }

  /**
   * Get optional fields for this template
   * @returns {string[]}
   */
  getOptionalFields() {
    return [];
  }

  /**
   * Get template schema for documentation
   * @returns {Object}
   */
  getSchema() {
    return {
      name: this.name,
      kind: this.kind,
      nip: this.nip,
      description: this.description,
      required: this.getRequiredFields(),
      optional: this.getOptionalFields()
    };
  }
}
```

---

### Schritt 2: TemplateEngine Implementierung

**Datei**: `framework/core/TemplateEngine.js`

```javascript
// framework/core/TemplateEngine.js

import { EventBus } from './EventBus.js';

/**
 * Manages event templates for different NIPs
 */
export class TemplateEngine {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._templates = new Map();
  }

  /**
   * Register an event template
   * @param {string} name - Template identifier
   * @param {EventTemplate} template - Template instance
   */
  register(name, template) {
    if (this._templates.has(name)) {
      console.warn(`[TemplateEngine] Template "${name}" already registered, replacing`);
    }

    this._templates.set(name, template);
    console.log(`[TemplateEngine] Registered template: ${name} (kind ${template.kind})`);
    
    this._eventBus.emit('template:registered', { name, template });
  }

  /**
   * Unregister a template
   * @param {string} name - Template identifier
   */
  unregister(name) {
    if (!this._templates.has(name)) {
      console.warn(`[TemplateEngine] Template "${name}" not found`);
      return;
    }

    this._templates.delete(name);
    console.log(`[TemplateEngine] Unregistered template: ${name}`);
    
    this._eventBus.emit('template:unregistered', { name });
  }

  /**
   * Get a template by name
   * @param {string} name - Template identifier
   * @returns {EventTemplate|null}
   */
  get(name) {
    return this._templates.get(name) || null;
  }

  /**
   * Check if template exists
   * @param {string} name - Template identifier
   * @returns {boolean}
   */
  has(name) {
    return this._templates.has(name);
  }

  /**
   * Get all registered template names
   * @returns {string[]}
   */
  getTemplateNames() {
    return Array.from(this._templates.keys());
  }

  /**
   * Get templates by kind
   * @param {number} kind - Event kind
   * @returns {EventTemplate[]}
   */
  getByKind(kind) {
    const templates = [];
    for (const template of this._templates.values()) {
      if (template.kind === kind) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Get templates by NIP
   * @param {string} nip - NIP identifier (e.g., 'NIP-01', 'NIP-52')
   * @returns {EventTemplate[]}
   */
  getByNip(nip) {
    const templates = [];
    for (const template of this._templates.values()) {
      if (template.nip === nip) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Build unsigned event from template
   * @param {string} templateName - Template identifier
   * @param {Object} data - Event data
   * @returns {UnsignedEvent}
   */
  build(templateName, data) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Validate data
    if (!template.validate(data)) {
      throw new Error(`Data validation failed for template "${templateName}"`);
    }

    try {
      const event = template.build(data);
      
      // Ensure required fields
      this._validateUnsignedEvent(event);
      
      console.log(`[TemplateEngine] Built event from template "${templateName}"`);
      this._eventBus.emit('template:built', { templateName, event });
      
      return event;
    } catch (error) {
      console.error(`[TemplateEngine] Failed to build event:`, error);
      this._eventBus.emit('template:error', { templateName, error });
      throw error;
    }
  }

  /**
   * Parse received event using template
   * @param {string} templateName - Template identifier
   * @param {SignedEvent} event - Received event
   * @returns {Object}
   */
  parse(templateName, event) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    try {
      const parsed = template.parse(event);
      
      console.log(`[TemplateEngine] Parsed event with template "${templateName}"`);
      this._eventBus.emit('template:parsed', { templateName, event, parsed });
      
      return parsed;
    } catch (error) {
      console.error(`[TemplateEngine] Failed to parse event:`, error);
      this._eventBus.emit('template:error', { templateName, error });
      throw error;
    }
  }

  /**
   * Get template schema for documentation
   * @param {string} templateName - Template identifier
   * @returns {Object}
   */
  getSchema(templateName) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return template.getSchema();
  }

  /**
   * Get all template schemas
   * @returns {Object}
   */
  getAllSchemas() {
    const schemas = {};
    
    for (const [name, template] of this._templates) {
      schemas[name] = template.getSchema();
    }

    return schemas;
  }

  /**
   * Validate unsigned event structure
   * @private
   */
  _validateUnsignedEvent(event) {
    const required = ['kind', 'content', 'tags', 'created_at'];
    
    for (const field of required) {
      if (!(field in event)) {
        throw new Error(`Event missing required field: ${field}`);
      }
    }

    if (typeof event.kind !== 'number') {
      throw new Error('Event kind must be a number');
    }

    if (!Array.isArray(event.tags)) {
      throw new Error('Event tags must be an array');
    }

    if (typeof event.created_at !== 'number') {
      throw new Error('Event created_at must be a number');
    }
  }

  /**
   * Listen to template events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}
```

---

### Schritt 3: Standard-Templates

**Datei**: `framework/templates/nip01.js`

```javascript
// framework/templates/nip01.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-01: Text Note
 */
export class TextNoteTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'text-note',
      kind: 1,
      nip: 'NIP-01',
      description: 'Basic text note'
    });
  }

  build(data) {
    return {
      kind: 1,
      content: data.content || '',
      tags: data.tags || [],
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.content && data.content !== '') {
      throw new Error('Content is required');
    }
    return true;
  }

  parse(event) {
    return {
      content: event.content,
      tags: event.tags,
      author: event.pubkey,
      created_at: event.created_at,
      id: event.id
    };
  }

  getRequiredFields() {
    return ['content'];
  }

  getOptionalFields() {
    return ['tags', 'created_at'];
  }
}

/**
 * NIP-01: Set Metadata
 */
export class SetMetadataTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'set-metadata',
      kind: 0,
      nip: 'NIP-01',
      description: 'User profile metadata'
    });
  }

  build(data) {
    const metadata = {
      name: data.name,
      about: data.about,
      picture: data.picture,
      nip05: data.nip05,
      lud16: data.lud16,
      website: data.website,
      banner: data.banner
    };

    // Remove undefined fields
    Object.keys(metadata).forEach(key => 
      metadata[key] === undefined && delete metadata[key]
    );

    return {
      kind: 0,
      content: JSON.stringify(metadata),
      tags: [],
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  parse(event) {
    try {
      const metadata = JSON.parse(event.content);
      return {
        ...metadata,
        pubkey: event.pubkey,
        updated_at: event.created_at
      };
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return { pubkey: event.pubkey };
    }
  }

  getOptionalFields() {
    return ['name', 'about', 'picture', 'nip05', 'lud16', 'website', 'banner'];
  }
}
```

**Datei**: `framework/templates/nip52.js`

```javascript
// framework/templates/nip52.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-52: Calendar Event
 */
export class CalendarEventTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'calendar-event',
      kind: 31923,
      nip: 'NIP-52',
      description: 'Calendar time-based event'
    });
  }

  build(data) {
    const tags = [
      ['d', data.uid || this._generateUID()],
      ['title', data.title || ''],
      ['start', data.start],
      ['end', data.end || data.start]
    ];

    if (data.location) tags.push(['location', data.location]);
    if (data.image) tags.push(['image', data.image]);
    if (data.url) tags.push(['url', data.url]);
    
    // Add custom tags
    if (data.tags && Array.isArray(data.tags)) {
      tags.push(...data.tags);
    }

    return {
      kind: 31923,
      content: data.description || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.title) {
      throw new Error('Title is required');
    }
    if (!data.start) {
      throw new Error('Start time is required');
    }
    return true;
  }

  parse(event) {
    const getTag = (name) => {
      const tag = event.tags.find(t => t[0] === name);
      return tag ? tag[1] : null;
    };

    return {
      uid: getTag('d'),
      title: getTag('title'),
      start: getTag('start'),
      end: getTag('end'),
      location: getTag('location'),
      image: getTag('image'),
      url: getTag('url'),
      description: event.content,
      author: event.pubkey,
      created_at: event.created_at,
      id: event.id
    };
  }

  getRequiredFields() {
    return ['title', 'start'];
  }

  getOptionalFields() {
    return ['end', 'location', 'image', 'url', 'description', 'uid', 'tags'];
  }

  _generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
```

**Datei**: `framework/templates/nip09.js`

```javascript
// framework/templates/nip09.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-09: Event Deletion
 */
export class EventDeletionTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'delete-event',
      kind: 5,
      nip: 'NIP-09',
      description: 'Event deletion request'
    });
  }

  build(data) {
    const eventIds = Array.isArray(data.eventIds) ? data.eventIds : [data.eventIds];
    
    const tags = eventIds.map(id => ['e', id]);

    return {
      kind: 5,
      content: data.reason || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.eventIds || (Array.isArray(data.eventIds) && data.eventIds.length === 0)) {
      throw new Error('At least one event ID is required');
    }
    return true;
  }

  parse(event) {
    const eventIds = event.tags
      .filter(t => t[0] === 'e')
      .map(t => t[1]);

    return {
      eventIds,
      reason: event.content,
      author: event.pubkey,
      created_at: event.created_at
    };
  }

  getRequiredFields() {
    return ['eventIds'];
  }

  getOptionalFields() {
    return ['reason'];
  }
}
```

---

### Schritt 4: Template Registry

**Datei**: `framework/templates/index.js`

```javascript
// framework/templates/index.js

export { EventTemplate } from './EventTemplate.js';
export { TextNoteTemplate, SetMetadataTemplate } from './nip01.js';
export { CalendarEventTemplate } from './nip52.js';
export { EventDeletionTemplate } from './nip09.js';

/**
 * Register all standard templates
 * @param {TemplateEngine} engine - Template engine instance
 */
export function registerStandardTemplates(engine) {
  const { TextNoteTemplate, SetMetadataTemplate } = await import('./nip01.js');
  const { CalendarEventTemplate } = await import('./nip52.js');
  const { EventDeletionTemplate } = await import('./nip09.js');

  engine.register('text-note', new TextNoteTemplate());
  engine.register('set-metadata', new SetMetadataTemplate());
  engine.register('calendar-event', new CalendarEventTemplate());
  engine.register('delete-event', new EventDeletionTemplate());

  console.log('[TemplateEngine] Standard templates registered');
}
```

---

### Schritt 5: Browser Console Tests

```javascript
// Quick Test in Console
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { TextNoteTemplate, CalendarEventTemplate } from './framework/templates/index.js';

const engine = new TemplateEngine();

// Register templates
engine.register('text-note', new TextNoteTemplate());
engine.register('calendar-event', new CalendarEventTemplate());

console.log('Registered templates:', engine.getTemplateNames());

// Test 1: Build text note
const textNote = engine.build('text-note', {
  content: 'Hello Nostr!'
});
console.log('Text note:', textNote);
console.assert(textNote.kind === 1, 'Kind should be 1');
console.assert(textNote.content === 'Hello Nostr!', 'Content should match');

// Test 2: Build calendar event
const calEvent = engine.build('calendar-event', {
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  end: '2024-12-01T20:00:00Z',
  location: 'Berlin',
  description: 'Monthly meetup'
});
console.log('Calendar event:', calEvent);
console.assert(calEvent.kind === 31923, 'Kind should be 31923');

// Test 3: Parse event
const parsed = engine.parse('calendar-event', calEvent);
console.log('Parsed:', parsed);
console.assert(parsed.title === 'Nostr Meetup', 'Title should match');

// Test 4: Get schema
const schema = engine.getSchema('calendar-event');
console.log('Schema:', schema);
console.assert(schema.required.includes('title'), 'Should require title');

// Test 5: Validation
try {
  engine.build('calendar-event', {}); // Missing required fields
  console.error('Should have thrown error');
} catch (error) {
  console.log('✓ Validation works:', error.message);
}

console.log('✓ All template tests passed!');

// Expose globally
window.testTemplateEngine = engine;
```

---

## Akzeptanzkriterien

- [ ] EventTemplate Interface definiert
- [ ] TemplateEngine implementiert
- [ ] Standard-Templates (NIP-01, NIP-52, NIP-09) implementiert
- [ ] Event-Building funktioniert
- [ ] Event-Parsing funktioniert
- [ ] Validierung funktioniert
- [ ] Schema-Dokumentation funktioniert
- [ ] Alle Tests bestehen

---

## Nächste Schritte

1. ✅ EventBus implementiert
2. ✅ IdentityManager implementiert
3. ✅ SignerManager implementiert
4. ✅ TemplateEngine implementiert
5. ➡️ Weiter mit `AGENT_RelayManager.md`
