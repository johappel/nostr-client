# Nostr Framework - Architekturkonzept

## Überblick

Ein modulares, erweiterbares Framework für Nostr-Anwendungen in Vanilla JavaScript, das verschiedene Authentifizierungsmethoden, Event-Verwaltung und Relay-Kommunikation abstrahiert.

## Kernziele

1. **Authentifizierungs-Agnostisch**: Unterstützung mehrerer Auth-Methoden (NIP-07, NIP-46, nsec, externe APIs)
2. **Event-Driven Architecture**: Reaktive Event-Verarbeitung mit Publisher/Subscriber-Pattern
3. **Offline-First**: SQLite-basierte lokale Persistenz mit Sync-Mechanismen
4. **Plugin-basiert**: Erweiterbar durch Auth-, Signer- und Storage-Plugins
5. **Type-Safe**: JSDoc-basierte Typsicherheit ohne TypeScript-Kompilierung
6. **Framework-agnostisch**: Vanilla JS, einsetzbar in jedem Frontend-Stack

---

## Architektur-Schichten

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│        (Kalender-App, Chat-Client, etc.)            │
└─────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────┐
│            Nostr Framework Core                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Identity   │  │    Event     │  │   Relay   │ │
│  │   Manager    │  │   Manager    │  │  Manager  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Signer     │  │  Template    │  │  Storage  │ │
│  │   Manager    │  │   Engine     │  │  Manager  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────┐
│              Plugin Layer                            │
├─────────────────────────────────────────────────────┤
│  Auth Plugins:                                       │
│  - NIP-07 (Browser Extension)                       │
│  - NIP-46 (Bunker/Remote Signer)                    │
│  - nsec (Local Key)                                 │
│  - WordPress API                                     │
│  - OAuth/SSO Providers                              │
│                                                      │
│  Storage Plugins:                                    │
│  - SQLite (WASM)                                    │
│  - IndexedDB                                         │
│  - LocalStorage                                      │
│  - Remote API                                        │
└─────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────┐
│           Dependencies                               │
│  - nostr-tools (Event handling, crypto)             │
│  - sql.js (SQLite WASM - optional)                  │
└─────────────────────────────────────────────────────┘
```

---

## Core Module

### 1. Identity Manager

**Zweck**: Verwaltung von User-Identitäten über verschiedene Auth-Methoden

**Verantwortlichkeiten**:
- Plugin-basierte Authentifizierung orchestrieren
- User-Sessions verwalten (Login/Logout)
- Public Key/npub bereitstellen
- Identity-Provider abstrahieren

**API**:
```javascript
class IdentityManager {
  /**
   * Registriert einen Auth-Provider
   * @param {string} name - Provider-Name ('nip07', 'nip46', 'wordpress')
   * @param {AuthPlugin} plugin - Plugin-Instanz
   */
  registerProvider(name, plugin)
  
  /**
   * Authentifiziert einen User
   * @param {string} provider - Provider-Name
   * @param {Object} credentials - Provider-spezifische Credentials
   * @returns {Promise<Identity>} User-Identity
   */
  async authenticate(provider, credentials)
  
  /**
   * Gibt aktuelle User-Identity zurück (whoami)
   * @returns {Promise<Identity|null>}
   */
  async getCurrentIdentity()
  
  /**
   * Logout des aktuellen Users
   */
  async logout()
  
  /**
   * Event-Listener für Identity-Änderungen
   */
  on('identity:changed', callback)
  on('identity:logout', callback)
}
```

**Identity-Objekt**:
```javascript
{
  pubkey: string,           // hex public key
  npub: string,            // bech32-encoded npub
  provider: string,        // 'nip07', 'nip46', 'wordpress', etc.
  displayName?: string,    // Optional: Name aus Profil
  metadata?: Object,       // Optional: NIP-01 Profil-Daten
  capabilities: {
    canSign: boolean,
    canEncrypt: boolean,
    canDecrypt: boolean
  }
}
```

---

### 2. Signer Manager

**Zweck**: Event-Signierung über verschiedene Methoden abstrahieren

**Verantwortlichkeiten**:
- Signer-Plugins verwalten
- Events signieren (unabhängig vom Auth-Provider)
- NIP-spezifische Signierungen unterstützen
- Timeout und Fehlerbehandlung

**API**:
```javascript
class SignerManager {
  /**
   * Registriert einen Signer
   * @param {SignerPlugin} signer
   */
  registerSigner(signer)
  
  /**
   * Signiert ein Event
   * @param {UnsignedEvent} event
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<SignedEvent>}
   */
  async signEvent(event, timeout = 10000)
  
  /**
   * Prüft Signatur-Fähigkeiten für Event-Kind
   * @param {number} kind - Event-Kind
   * @returns {Promise<boolean>}
   */
  async canSign(kind)
  
  /**
   * NIP-04 Verschlüsselung
   */
  async encrypt(pubkey, plaintext)
  
  /**
   * NIP-04 Entschlüsselung
   */
  async decrypt(pubkey, ciphertext)
  
  /**
   * NIP-44 Verschlüsselung (moderner Standard)
   */
  async encryptNip44(pubkey, plaintext)
  
  /**
   * NIP-44 Entschlüsselung
   */
  async decryptNip44(pubkey, ciphertext)
}
```

**SignerPlugin Interface**:
```javascript
class SignerPlugin {
  type: string              // 'nip07', 'nip46', 'local', 'api'
  
  async getPublicKey()
  async signEvent(event)
  async encrypt(pubkey, text)
  async decrypt(pubkey, ciphertext)
  
  // Optional: NIP-44 Support
  async nip44Encrypt?(pubkey, text)
  async nip44Decrypt?(pubkey, ciphertext)
}
```

---

### 3. Event Manager

**Zweck**: Event-Lifecycle-Verwaltung (Erstellen, Validieren, Publizieren, Abonnieren)

**Verantwortlichkeiten**:
- Event-Templates verwalten und validieren
- Events erstellen und signieren (via SignerManager)
- Events an Relays publizieren (via RelayManager)
- Event-Subscriptions verwalten
- Eingehende Events filtern und dispatchen

**API**:
```javascript
class EventManager {
  /**
   * Registriert ein Event-Template
   * @param {string} name - Template-Name
   * @param {EventTemplate} template
   */
  registerTemplate(name, template)
  
  /**
   * Erstellt und publiziert ein Event
   * @param {string} templateName - Name des Templates
   * @param {Object} data - Event-Daten
   * @param {Object} options - Publish-Optionen
   * @returns {Promise<PublishResult>}
   */
  async publishEvent(templateName, data, options = {})
  
  /**
   * Erstellt Event ohne zu publizieren
   * @returns {Promise<SignedEvent>}
   */
  async createEvent(templateName, data)
  
  /**
   * Validiert Event gegen Template/NIP
   * @param {Event} event
   * @param {string} templateName
   * @returns {boolean}
   */
  validateEvent(event, templateName)
  
  /**
   * Abonniert Events
   * @param {Filter[]} filters - Nostr-Filter
   * @param {Function} callback
   * @returns {Subscription}
   */
  subscribe(filters, callback)
  
  /**
   * Event-Listener für bestimmte Kinds
   */
  on('event:kind:1', callback)
  on('event:kind:31923', callback)
  on('event:received', callback)
}
```

**EventTemplate**:
```javascript
{
  kind: number,
  nip?: string,                    // 'NIP-01', 'NIP-52', etc.
  
  // Validierungs-Schema
  validate?: (data) => boolean,
  
  // Event-Builder
  build: (data) => {
    kind: number,
    content: string,
    tags: Array<string[]>,
    created_at: number
  },
  
  // Optional: Event-Parser
  parse?: (event) => Object
}
```

---

### 4. Relay Manager

**Zweck**: Relay-Verbindungen und Kommunikation verwalten

**Verantwortlichkeiten**:
- Relay-Verbindungen (SimplePool aus nostr-tools)
- Events publizieren
- Events abfragen (query/list)
- Relay-Health-Monitoring
- Fastest-Relay-Detection
- Reconnect-Logic

**API**:
```javascript
class RelayManager {
  /**
   * Fügt Relays hinzu
   * @param {string[]} relayUrls
   */
  addRelays(relayUrls)
  
  /**
   * Entfernt Relays
   */
  removeRelays(relayUrls)
  
  /**
   * Publiziert Event an Relays
   * @param {SignedEvent} event
   * @param {string[]} relayUrls - Optional: spezifische Relays
   * @returns {Promise<PublishResult[]>}
   */
  async publish(event, relayUrls = null)
  
  /**
   * Abfragt Events von Relays
   * @param {Filter[]} filters
   * @param {Object} options
   * @returns {Promise<Event[]>}
   */
  async query(filters, options = {})
  
  /**
   * Erstellt Subscription
   * @param {Filter[]} filters
   * @param {Function} onEvent
   * @returns {Subscription}
   */
  subscribe(filters, onEvent)
  
  /**
   * Ermittelt schnellsten Relay
   * @returns {Promise<string>}
   */
  async getFastestRelay()
  
  /**
   * Relay-Status
   * @returns {Map<string, RelayStatus>}
   */
  getRelayStatus()
  
  /**
   * Events
   */
  on('relay:connected', callback)
  on('relay:disconnected', callback)
  on('relay:error', callback)
}
```

---

### 5. Template Engine

**Zweck**: NIP-basierte Event-Templates definieren und validieren

**Verantwortlichkeiten**:
- Event-Strukturen für verschiedene NIPs bereitstellen
- Validierung von Event-Daten
- Event-Builder für häufige Use-Cases
- Parser für eingehende Events

**Vordefinierte Templates**:

```javascript
// NIP-01: Text Note
{
  name: 'text-note',
  kind: 1,
  nip: 'NIP-01',
  build: (data) => ({
    kind: 1,
    content: data.content,
    tags: data.tags || [],
    created_at: Math.floor(Date.now() / 1000)
  })
}

// NIP-52: Calendar Event
{
  name: 'calendar-event',
  kind: 31923,
  nip: 'NIP-52',
  build: (data) => ({
    kind: 31923,
    content: data.description || '',
    tags: [
      ['d', data.uid],
      ['title', data.title],
      ['start', data.start],
      ['end', data.end],
      ['location', data.location || ''],
      ...(data.image ? [['image', data.image]] : []),
      ...(data.tags || [])
    ],
    created_at: Math.floor(Date.now() / 1000)
  }),
  validate: (event) => {
    // d-tag muss vorhanden sein
    return event.tags.some(t => t[0] === 'd')
  },
  parse: (event) => {
    const getTag = (name) => event.tags.find(t => t[0] === name)?.[1];
    return {
      uid: getTag('d'),
      title: getTag('title'),
      start: getTag('start'),
      end: getTag('end'),
      location: getTag('location'),
      description: event.content,
      image: getTag('image'),
      author: event.pubkey
    }
  }
}

// NIP-09: Event Deletion
{
  name: 'delete-event',
  kind: 5,
  nip: 'NIP-09',
  build: (data) => ({
    kind: 5,
    content: data.reason || '',
    tags: data.eventIds.map(id => ['e', id]),
    created_at: Math.floor(Date.now() / 1000)
  })
}

// NIP-23: Long-form Content
{
  name: 'article',
  kind: 30023,
  nip: 'NIP-23',
  build: (data) => ({
    kind: 30023,
    content: data.content,
    tags: [
      ['d', data.identifier],
      ['title', data.title],
      ['published_at', String(data.publishedAt)],
      ['summary', data.summary || ''],
      ...(data.image ? [['image', data.image]] : []),
      ...(data.tags || [])
    ],
    created_at: Math.floor(Date.now() / 1000)
  })
}

// NIP-25: Reactions
{
  name: 'reaction',
  kind: 7,
  nip: 'NIP-25',
  build: (data) => ({
    kind: 7,
    content: data.reaction || '+',
    tags: [
      ['e', data.eventId],
      ['p', data.authorPubkey]
    ],
    created_at: Math.floor(Date.now() / 1000)
  })
}

// NIP-04: Encrypted DM
{
  name: 'encrypted-dm',
  kind: 4,
  nip: 'NIP-04',
  build: async (data, signer) => ({
    kind: 4,
    content: await signer.encrypt(data.recipientPubkey, data.message),
    tags: [['p', data.recipientPubkey]],
    created_at: Math.floor(Date.now() / 1000)
  })
}
```

---

### 6. Storage Manager

**Zweck**: Offline-Persistenz und Caching

**Verantwortlichkeiten**:
- Events lokal speichern
- Offline-Modus unterstützen
- Sync zwischen lokalem Storage und Relays
- Query-Cache für Performance

**API**:
```javascript
class StorageManager {
  /**
   * Initialisiert Storage-Backend
   * @param {StoragePlugin} plugin - SQLite, IndexedDB, etc.
   */
  async initialize(plugin)
  
  /**
   * Speichert Events
   * @param {Event[]} events
   */
  async saveEvents(events)
  
  /**
   * Abfrage aus lokalem Storage
   * @param {Filter[]} filters
   * @returns {Promise<Event[]>}
   */
  async queryLocal(filters)
  
  /**
   * Löscht Events
   * @param {string[]} eventIds
   */
  async deleteEvents(eventIds)
  
  /**
   * Synchronisiert mit Relays
   * @param {Object} options
   */
  async sync(options = {})
  
  /**
   * Cache-Management
   */
  async clearCache()
  async getCacheStats()
}
```

**StoragePlugin Interface**:
```javascript
class StoragePlugin {
  async initialize()
  async save(events)
  async query(filters)
  async delete(eventIds)
  async clear()
}
```

---

## Plugin-System

### Auth Plugin Interface

```javascript
/**
 * @interface AuthPlugin
 */
class AuthPlugin {
  /**
   * Provider-Name
   * @type {string}
   */
  name
  
  /**
   * Display-Name für UI
   * @type {string}
   */
  displayName
  
  /**
   * Initialisierung
   */
  async initialize()
  
  /**
   * Login-Status prüfen
   * @returns {Promise<boolean>}
   */
  async isLoggedIn()
  
  /**
   * User-Identity abrufen
   * @returns {Promise<Identity|null>}
   */
  async getIdentity()
  
  /**
   * Login durchführen
   * @param {Object} credentials
   * @returns {Promise<Identity>}
   */
  async login(credentials)
  
  /**
   * Logout durchführen
   */
  async logout()
  
  /**
   * Signer-Instanz bereitstellen
   * @returns {SignerPlugin}
   */
  getSigner()
  
  /**
   * Optional: UI-Setup
   */
  setupUI?(elements, onChange)
}
```

### Vordefinierte Auth Plugins

#### 1. NIP-07 Plugin
```javascript
class Nip07AuthPlugin extends AuthPlugin {
  name = 'nip07'
  displayName = 'Browser Extension'
  
  async isLoggedIn() {
    return window.nostr !== undefined
  }
  
  async login() {
    if (!window.nostr) throw new Error('NIP-07 extension not found')
    const pubkey = await window.nostr.getPublicKey()
    return { pubkey, provider: 'nip07' }
  }
  
  getSigner() {
    return {
      type: 'nip07',
      getPublicKey: () => window.nostr.getPublicKey(),
      signEvent: (event) => window.nostr.signEvent(event),
      encrypt: (pk, text) => window.nostr.nip04.encrypt(pk, text),
      decrypt: (pk, cipher) => window.nostr.nip04.decrypt(pk, cipher)
    }
  }
}
```

#### 2. NIP-46 Bunker Plugin
```javascript
class Nip46AuthPlugin extends AuthPlugin {
  name = 'nip46'
  displayName = 'Remote Signer (Bunker)'
  
  #bunkerSigner = null
  
  async login(credentials) {
    const { connectURI } = credentials
    // nostr-tools/nip46 verwenden
    const { Nip46Signer } = await import('nostr-tools/nip46')
    
    this.#bunkerSigner = new Nip46Signer(connectURI)
    await this.#bunkerSigner.connect()
    
    const pubkey = await this.#bunkerSigner.getPublicKey()
    return { pubkey, provider: 'nip46' }
  }
  
  async logout() {
    if (this.#bunkerSigner) {
      await this.#bunkerSigner.disconnect()
      this.#bunkerSigner = null
    }
  }
  
  getSigner() {
    return {
      type: 'nip46',
      getPublicKey: () => this.#bunkerSigner.getPublicKey(),
      signEvent: (event) => this.#bunkerSigner.signEvent(event)
    }
  }
}
```

#### 3. Local nsec Plugin
```javascript
class LocalKeyAuthPlugin extends AuthPlugin {
  name = 'local'
  displayName = 'Local Key'
  
  #privateKey = null
  
  async login(credentials) {
    const { nsec } = credentials
    // nostr-tools verwenden
    const { nip19, getPublicKey } = await import('nostr-tools/pure')
    
    const { type, data } = nip19.decode(nsec)
    if (type !== 'nsec') throw new Error('Invalid nsec')
    
    this.#privateKey = data
    const pubkey = getPublicKey(data)
    
    return { pubkey, provider: 'local' }
  }
  
  async logout() {
    this.#privateKey = null
  }
  
  getSigner() {
    const { finalizeEvent } = await import('nostr-tools/pure')
    return {
      type: 'local',
      getPublicKey: async () => getPublicKey(this.#privateKey),
      signEvent: async (event) => finalizeEvent(event, this.#privateKey)
    }
  }
}
```

#### 4. WordPress API Plugin
```javascript
class WordPressAuthPlugin extends AuthPlugin {
  name = 'wordpress'
  displayName = 'WordPress SSO'
  
  #session = null
  #apiEndpoint = null
  
  constructor(config) {
    super()
    this.#apiEndpoint = config.apiEndpoint || '/wp-json/nostr/v1'
  }
  
  async isLoggedIn() {
    // Prüfe WordPress-Session
    const response = await fetch(`${this.#apiEndpoint}/session`)
    return response.ok
  }
  
  async getIdentity() {
    const response = await fetch(`${this.#apiEndpoint}/session`)
    if (!response.ok) return null
    
    const data = await response.json()
    return {
      pubkey: data.pubkey,
      provider: 'wordpress',
      displayName: data.username
    }
  }
  
  async login(credentials) {
    // Redirect zu WordPress Login
    const redirectUrl = credentials.redirectUrl || window.location.href
    window.location.href = `/wp-login.php?redirect_to=${encodeURIComponent(redirectUrl)}`
  }
  
  getSigner() {
    return {
      type: 'api',
      getPublicKey: async () => {
        const identity = await this.getIdentity()
        return identity?.pubkey
      },
      signEvent: async (event) => {
        const response = await fetch(`${this.#apiEndpoint}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event })
        })
        
        if (!response.ok) throw new Error('Signing failed')
        const { signedEvent } = await response.json()
        return signedEvent
      }
    }
  }
}
```

---

## Verwendungsbeispiele

### Einfacher Client Setup

```javascript
import { NostrFramework } from './framework/index.js'

// Framework initialisieren
const nostr = new NostrFramework({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ]
})

// Auth-Provider registrieren
await nostr.identity.registerProvider('nip07', new Nip07AuthPlugin())
await nostr.identity.registerProvider('nip46', new Nip46AuthPlugin())

// Login
await nostr.identity.authenticate('nip07')

// Event publizieren
await nostr.events.publishEvent('text-note', {
  content: 'Hello Nostr!'
})

// Events abonnieren
nostr.events.subscribe(
  [{ kinds: [1], limit: 10 }],
  (event) => console.log('New event:', event)
)
```

### Kalender-App Beispiel

```javascript
// Custom Template für Kalender-Events
nostr.events.registerTemplate('calendar-event', {
  kind: 31923,
  nip: 'NIP-52',
  build: (data) => ({
    kind: 31923,
    content: data.description,
    tags: [
      ['d', data.uid],
      ['title', data.title],
      ['start', data.start],
      ['end', data.end],
      ['location', data.location]
    ],
    created_at: Math.floor(Date.now() / 1000)
  })
})

// Event erstellen
const result = await nostr.events.publishEvent('calendar-event', {
  uid: crypto.randomUUID(),
  title: 'Nostr Meetup',
  start: '2024-12-01T18:00:00Z',
  end: '2024-12-01T20:00:00Z',
  location: 'Berlin',
  description: 'Monthly Nostr developer meetup'
})

console.log('Event published:', result.event.id)

// Events laden
const events = await nostr.relay.query([
  { kinds: [31923], authors: [myPubkey] }
])

// Offline-Storage
await nostr.storage.initialize(new SQLiteStoragePlugin())
await nostr.storage.saveEvents(events)

// Offline-Abfrage
const cachedEvents = await nostr.storage.queryLocal([
  { kinds: [31923] }
])
```

### Multi-Auth Setup

```javascript
// Mehrere Auth-Provider
nostr.identity.registerProvider('nip07', new Nip07AuthPlugin())
nostr.identity.registerProvider('wordpress', new WordPressAuthPlugin({
  apiEndpoint: '/wp-json/nostr/v1'
}))

// Automatische Provider-Erkennung
const availableProviders = await nostr.identity.getAvailableProviders()
// ['nip07', 'wordpress']

// Login mit bevorzugtem Provider
if (availableProviders.includes('wordpress')) {
  await nostr.identity.authenticate('wordpress')
} else if (availableProviders.includes('nip07')) {
  await nostr.identity.authenticate('nip07')
}

// Identity-Änderungen beobachten
nostr.identity.on('identity:changed', (identity) => {
  console.log('User logged in:', identity.npub)
  updateUI(identity)
})
```

---

## Dateistruktur

```
framework/
├── index.js                    # Haupt-Export
├── core/
│   ├── NostrFramework.js      # Haupt-Klasse
│   ├── IdentityManager.js     # Identity-Verwaltung
│   ├── SignerManager.js       # Signierung
│   ├── EventManager.js        # Event-Lifecycle
│   ├── RelayManager.js        # Relay-Kommunikation
│   ├── TemplateEngine.js      # Event-Templates
│   └── StorageManager.js      # Offline-Storage
│
├── plugins/
│   ├── auth/
│   │   ├── AuthPlugin.js      # Base Interface
│   │   ├── Nip07Plugin.js     # Browser Extension
│   │   ├── Nip46Plugin.js     # Bunker
│   │   ├── LocalKeyPlugin.js  # nsec
│   │   └── WordPressPlugin.js # WP API
│   │
│   └── storage/
│       ├── StoragePlugin.js   # Base Interface
│       ├── SQLitePlugin.js    # SQLite WASM
│       ├── IndexedDBPlugin.js # Browser DB
│       └── LocalStoragePlugin.js
│
├── templates/
│   ├── nip01.js              # Text notes
│   ├── nip04.js              # Encrypted DMs
│   ├── nip23.js              # Long-form
│   ├── nip52.js              # Calendar
│   └── index.js              # Template-Registry
│
├── utils/
│   ├── crypto.js             # Krypto-Helpers
│   ├── bech32.js             # npub/nsec encoding
│   ├── validation.js         # Event-Validierung
│   └── relay-health.js       # Relay-Monitoring
│
└── types/
    └── index.d.js            # JSDoc Type Definitions
```

---

## Event-Driven Architecture

### Event-Bus System

```javascript
// Internes Event-System
class EventBus {
  #listeners = new Map()
  
  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, [])
    }
    this.#listeners.get(event).push(callback)
    
    // Return unsubscribe function
    return () => this.off(event, callback)
  }
  
  off(event, callback) {
    const listeners = this.#listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }
  
  emit(event, data) {
    const listeners = this.#listeners.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }
}
```

### Framework-Events

```javascript
// Identity Events
'identity:changed'       // User logged in/out
'identity:logout'        // User logged out

// Signer Events
'signer:ready'          // Signer verfügbar
'signer:error'          // Signing fehlgeschlagen

// Event Events
'event:created'         // Event erstellt
'event:signed'          // Event signiert
'event:published'       // Event publiziert
'event:received'        // Event empfangen
'event:kind:{kind}'     // Event von spezifischem Kind

// Relay Events
'relay:connected'       // Relay verbunden
'relay:disconnected'    // Relay getrennt
'relay:error'           // Relay-Fehler

// Storage Events
'storage:saved'         // Events gespeichert
'storage:synced'        // Sync abgeschlossen
```

---

## Offline-First mit SQLite

### SQLite Schema

```sql
-- Events Tabelle
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  content TEXT,
  tags TEXT,  -- JSON array
  sig TEXT NOT NULL,
  
  -- Metadaten
  received_at INTEGER DEFAULT (strftime('%s', 'now')),
  relay_source TEXT,
  
  -- Indizes
  INDEX idx_pubkey ON events(pubkey),
  INDEX idx_created_at ON events(created_at DESC),
  INDEX idx_kind ON events(kind),
  INDEX idx_received_at ON events(received_at DESC)
);

-- Tag-basierte Suche
CREATE TABLE event_tags (
  event_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_value TEXT,
  tag_index INTEGER,
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_tag_name ON event_tags(tag_name),
  INDEX idx_tag_value ON event_tags(tag_value)
);

-- Relay-Status
CREATE TABLE relay_status (
  url TEXT PRIMARY KEY,
  last_connected INTEGER,
  last_error TEXT,
  status TEXT  -- 'connected', 'disconnected', 'error'
);

-- Sync-State
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### Sync-Strategie

```javascript
class SyncManager {
  /**
   * Bidirektionale Synchronisierung
   */
  async sync() {
    // 1. Lokale Events an Relays pushen
    const unsynced = await this.storage.queryLocal({
      synced: false
    })
    
    for (const event of unsynced) {
      try {
        await this.relay.publish(event)
        await this.markSynced(event.id)
      } catch (error) {
        console.error('Sync failed for event:', event.id)
      }
    }
    
    // 2. Neue Events von Relays holen
    const lastSync = await this.getLastSyncTimestamp()
    const newEvents = await this.relay.query([
      { since: lastSync }
    ])
    
    await this.storage.saveEvents(newEvents)
    await this.setLastSyncTimestamp(Date.now())
  }
  
  /**
   * Conflict-Resolution
   */
  async resolveConflicts(localEvent, remoteEvent) {
    // Newer wins
    if (remoteEvent.created_at > localEvent.created_at) {
      return remoteEvent
    }
    return localEvent
  }
}
```

---

## Performance-Optimierungen

### 1. Relay-Pool mit Smart Routing

```javascript
class SmartRelayPool {
  #relays = new Map()
  #performanceStats = new Map()
  
  async pickBestRelays(count = 3) {
    // Sortiere nach Performance-Metriken
    const sorted = Array.from(this.#performanceStats.entries())
      .sort((a, b) => {
        const scoreA = this.#calculateScore(a[1])
        const scoreB = this.#calculateScore(b[1])
        return scoreB - scoreA
      })
    
    return sorted.slice(0, count).map(([url]) => url)
  }
  
  #calculateScore(stats) {
    return (
      stats.successRate * 100 +
      (1000 - stats.avgLatency) +
      stats.uptime * 10
    )
  }
}
```

### 2. Event-Caching

```javascript
class EventCache {
  #cache = new Map()
  #maxSize = 1000
  
  set(eventId, event) {
    // LRU-Cache
    if (this.#cache.size >= this.#maxSize) {
      const firstKey = this.#cache.keys().next().value
      this.#cache.delete(firstKey)
    }
    this.#cache.set(eventId, event)
  }
  
  get(eventId) {
    return this.#cache.get(eventId)
  }
}
```

### 3. Lazy Loading von Plugins

```javascript
class PluginLoader {
  async loadPlugin(name) {
    // Dynamischer Import nur wenn benötigt
    switch(name) {
      case 'wordpress':
        return (await import('./plugins/auth/WordPressPlugin.js')).default
      case 'sqlite':
        return (await import('./plugins/storage/SQLitePlugin.js')).default
      default:
        throw new Error(`Unknown plugin: ${name}`)
    }
  }
}
```

---

## Sicherheits-Überlegungen

### 1. Private Key Handling

```javascript
/**
 * NIEMALS private keys im localStorage speichern (außer encrypted)
 * Bevorzuge sessionStorage oder Memory-only
 */
class SecureKeyStorage {
  #key = null  // Private field, nicht serialisierbar
  
  setKey(key) {
    // In memory only
    this.#key = key
    
    // Optional: Session storage (gelöscht bei Tab-close)
    sessionStorage.setItem('sk_session', this.#encrypt(key))
  }
  
  #encrypt(data) {
    // Encryption mit User-Password oder Browser-Crypto-API
    // Nie plain text!
  }
}
```

### 2. Input-Validierung

```javascript
class EventValidator {
  validateEvent(event) {
    // Prüfe Event-Struktur
    if (!event.id || !event.pubkey || !event.sig) {
      throw new Error('Invalid event structure')
    }
    
    // Prüfe Signatur
    if (!this.verifySignature(event)) {
      throw new Error('Invalid signature')
    }
    
    // Prüfe Content-Length (DoS-Prevention)
    if (event.content.length > 100000) {
      throw new Error('Content too large')
    }
    
    return true
  }
}
```

### 3. XSS-Prevention

```javascript
class ContentSanitizer {
  sanitizeContent(content) {
    // HTML escapen
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  sanitizeUrl(url) {
    // Nur http(s) erlauben
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }
      return url
    } catch {
      return ''
    }
  }
}
```

---

## Testing-Strategie

### Unit Tests

```javascript
// test/core/EventManager.test.js
import { EventManager } from '../../framework/core/EventManager.js'
import { describe, it, expect } from 'vitest'

describe('EventManager', () => {
  it('should create event from template', async () => {
    const manager = new EventManager()
    
    manager.registerTemplate('test', {
      kind: 1,
      build: (data) => ({
        kind: 1,
        content: data.message,
        tags: [],
        created_at: 123456
      })
    })
    
    const event = await manager.createEvent('test', {
      message: 'Hello'
    })
    
    expect(event.kind).toBe(1)
    expect(event.content).toBe('Hello')
  })
})
```

### Integration Tests

```javascript
// test/integration/auth-flow.test.js
describe('Authentication Flow', () => {
  it('should login with NIP-07', async () => {
    const framework = new NostrFramework()
    
    // Mock window.nostr
    window.nostr = {
      getPublicKey: async () => 'pubkey123',
      signEvent: async (event) => ({ ...event, sig: 'sig123' })
    }
    
    await framework.identity.registerProvider('nip07', new Nip07Plugin())
    const identity = await framework.identity.authenticate('nip07')
    
    expect(identity.pubkey).toBe('pubkey123')
    expect(identity.provider).toBe('nip07')
  })
})
```

### E2E Tests

```javascript
// test/e2e/publish-event.test.js
describe('Event Publishing', () => {
  it('should publish event to relay', async () => {
    const framework = new NostrFramework({
      relays: ['wss://relay.test']
    })
    
    // Setup auth
    await framework.identity.authenticate('nip07')
    
    // Publish event
    const result = await framework.events.publishEvent('text-note', {
      content: 'Test message'
    })
    
    expect(result.success).toBe(true)
    expect(result.event.id).toBeDefined()
  })
})
```

---

## Migration-Pfad

### Phase 1: Core-Module (Woche 1-2)
- [ ] Event-Bus System
- [ ] IdentityManager mit Plugin-Interface
- [ ] SignerManager
- [ ] Basis-Auth-Plugins (NIP-07, nsec)

### Phase 2: Event-Handling (Woche 3-4)
- [ ] EventManager
- [ ] TemplateEngine mit NIP-01, NIP-52
- [ ] RelayManager mit SimplePool-Integration

### Phase 3: Storage (Woche 5-6)
- [ ] StorageManager
- [ ] SQLite-Plugin
- [ ] Sync-Logik

### Phase 4: Erweiterte Features (Woche 7-8)
- [ ] NIP-46 Bunker-Plugin
- [ ] WordPress-Plugin
- [ ] Advanced Templates (NIP-04, NIP-23, etc.)

### Phase 5: Optimization (Woche 9-10)
- [ ] Performance-Tuning
- [ ] Caching-Strategien
- [ ] Error-Handling & Logging

### Phase 6: Documentation & Testing (Woche 11-12)
- [ ] API-Dokumentation
- [ ] Usage-Beispiele
- [ ] Unit & Integration Tests
- [ ] Migration-Guide für bestehende Apps

---

## API-Referenz (vollständig)

```javascript
// Haupt-Framework-Klasse
class NostrFramework {
  constructor(config = {
    relays: string[],
    autoConnect: boolean,
    storage: StorageConfig,
    debug: boolean
  })
  
  // Sub-Manager
  identity: IdentityManager
  signer: SignerManager
  events: EventManager
  relay: RelayManager
  storage: StorageManager
  templates: TemplateEngine
  
  // Lifecycle
  async initialize()
  async destroy()
  
  // Event-Bus
  on(event: string, callback: Function)
  off(event: string, callback: Function)
  emit(event: string, data: any)
}
```

---

## Fazit

Dieses Framework abstrahiert die Komplexität von Nostr-Authentifizierung, Event-Handling und Relay-Kommunikation in eine saubere, erweiterbare Architektur. 

**Vorteile**:
- ✅ Plugin-basiert: Einfach erweiterbar
- ✅ Auth-agnostisch: Unterstützt alle gängigen Auth-Methoden
- ✅ Offline-fähig: SQLite-basierte Persistenz
- ✅ Framework-unabhängig: Vanilla JS, überall einsetzbar
- ✅ Type-safe: JSDoc für IDE-Support
- ✅ Testbar: Klare Interfaces für Unit/Integration-Tests

**Nächste Schritte**:
1. Prototyp der Core-Module entwickeln
2. Auth-Plugins aus bestehender App extrahieren
3. EventManager mit Template-System implementieren
4. Integration-Tests mit echten Relays
5. Documentation & Beispiele

Das Framework kann als Basis für beliebige Nostr-Clients dienen: Kalender-Apps, Chat-Clients, Social-Media-Apps, Content-Publishing-Systeme, etc.
