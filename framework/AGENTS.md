# Nostr Framework - Implementierungs-Roadmap

## Überblick

Dieses Dokument gibt einen Überblick über die gesamte Framework-Entwicklung mit Verweisen auf die einzelnen Agent-Dokumente.

## Entwicklungsreihenfolge

Die Module müssen in folgender Reihenfolge implementiert werden, da sie aufeinander aufbauen:

```
1. EventBus (keine Abhängigkeiten)
   ↓
2. IdentityManager (nutzt EventBus)
   ↓
3. SignerManager (nutzt EventBus)
   ↓
4. TemplateEngine (nutzt EventBus)
   ↓
5. RelayManager (nutzt EventBus)
   ↓
6. EventManager (nutzt alle Manager)
   ↓
7. StorageManager (nutzt EventBus + RelayManager)
   ↓
8. NostrFramework (integriert alles)
```

---

## Modul-Übersicht

### 1. EventBus
**Dokument**: `AGENT_EventBus.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: Keine  
**Geschätzte Zeit**: 2-3 Stunden  

**Was wird implementiert**:
- Event-Bus für Framework-interne Kommunikation
- Observer-Pattern für Events
- Debug-Modus

**Test in Console**:
```javascript
import { EventBus } from './framework/core/EventBus.js';
const bus = new EventBus();
bus.setDebugMode(true);
bus.on('test', (data) => console.log('Received:', data));
bus.emit('test', { hello: 'world' });
```

---

### 2. IdentityManager
**Dokument**: `AGENT_IdentityManager.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus  
**Geschätzte Zeit**: 4-6 Stunden  

**Was wird implementiert**:
- AuthPlugin Interface
- IdentityManager für Multi-Provider-Auth
- Session-Persistenz
- Plugin-Registry

**Test in Console**:
```javascript
import { IdentityManager } from './framework/core/IdentityManager.js';
import { MockAuthPlugin } from './framework/plugins/auth/MockAuthPlugin.js';

const manager = new IdentityManager();
manager.registerPlugin('test', new MockAuthPlugin());
await manager.initialize();
const identity = await manager.authenticate('test');
console.log('Logged in:', identity.pubkey);
```

---

### 3. SignerManager
**Dokument**: `AGENT_SignerManager.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus  
**Geschätzte Zeit**: 3-4 Stunden  

**Was wird implementiert**:
- SignerPlugin Interface
- SignerManager für Event-Signierung
- NIP-04/NIP-44 Verschlüsselung
- MockSigner für Tests

**Test in Console**:
```javascript
import { SignerManager } from './framework/core/SignerManager.js';
import { MockSigner } from './framework/plugins/signer/MockSigner.js';

const manager = new SignerManager();
manager.setSigner(new MockSigner());

const event = {
  kind: 1,
  content: 'Hello',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
};

const signed = await manager.signEvent(event);
console.log('Signed:', signed);
```

---

### 4. TemplateEngine
**Dokument**: `AGENT_TemplateEngine.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus  
**Geschätzte Zeit**: 4-5 Stunden  

**Was wird implementiert**:
- EventTemplate Interface
- TemplateEngine für Event-Verwaltung
- Standard-Templates (NIP-01, NIP-52, NIP-09)
- Validierung und Parsing

**Test in Console**:
```javascript
import { TemplateEngine } from './framework/core/TemplateEngine.js';
import { TextNoteTemplate } from './framework/templates/nip01.js';

const engine = new TemplateEngine();
engine.register('text-note', new TextNoteTemplate());

const event = engine.build('text-note', {
  content: 'Hello Nostr!'
});
console.log('Event:', event);
```

---

### 5. RelayManager
**Dokument**: `AGENT_RelayManager.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus, nostr-tools  
**Geschätzte Zeit**: 5-7 Stunden  

**Was wird implementiert**:
- Relay-Pool mit nostr-tools
- Event-Publishing
- Event-Query
- Subscriptions
- Fastest-Relay-Detection

**Test in Console**:
```javascript
import { RelayManager } from './framework/core/RelayManager.js';

const manager = new RelayManager(null, {
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

await manager.initialize();

const events = await manager.query([{ kinds: [1], limit: 5 }]);
console.log('Fetched:', events.length, 'events');
```

---

### 6. EventManager
**Dokument**: `AGENT_EventManager.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus, TemplateEngine, SignerManager, RelayManager  
**Geschätzte Zeit**: 4-5 Stunden  

**Was wird implementiert**:
- Event-Lifecycle-Management
- Event-Cache
- Event-Deletion
- Integration aller Manager

**Test in Console**:
```javascript
import { EventManager } from './framework/core/EventManager.js';
// ... setup all managers ...

const manager = new EventManager();
manager.setTemplateEngine(templateEngine);
manager.setSignerManager(signerManager);
manager.setRelayManager(relayManager);

const result = await manager.createAndPublish('text-note', {
  content: 'Hello!'
});
console.log('Published:', result);
```

---

### 7. StorageManager
**Dokument**: `AGENT_StorageManager.md`  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: EventBus, RelayManager  
**Geschätzte Zeit**: 4-5 Stunden  

**Was wird implementiert**:
- StoragePlugin Interface
- LocalStoragePlugin
- StorageManager
- Sync-Mechanismus

**Test in Console**:
```javascript
import { StorageManager } from './framework/core/StorageManager.js';
import { LocalStoragePlugin } from './framework/plugins/storage/LocalStoragePlugin.js';

const manager = new StorageManager();
await manager.initialize(new LocalStoragePlugin());

await manager.save(events);
const stored = await manager.query([{ kinds: [1] }]);
console.log('Stored:', stored.length, 'events');
```

---

### 8. NostrFramework (Integration)
**Dokument**: `AGENT_StorageManager.md` (Teil 2)  
**Status**: ⏳ Zu implementieren  
**Abhängigkeiten**: Alle Module  
**Geschätzte Zeit**: 2-3 Stunden  

**Was wird implementiert**:
- Haupt-Framework-Klasse
- Module-Integration
- Framework-Lifecycle
- Export aller Module

**Test in Console**:
```javascript
import { NostrFramework } from './framework/index.js';

const nostr = new NostrFramework({
  relays: ['wss://relay.damus.io'],
  debug: true
});

await nostr.initialize();

// Framework ist bereit!
console.log('Framework ready:', nostr.isInitialized());
```

---

## Gesamte Entwicklungszeit

**Geschätzte Zeit**: 28-38 Stunden (ca. 4-5 Arbeitstage)

| Modul | Zeit |
|-------|------|
| EventBus | 2-3h |
| IdentityManager | 4-6h |
| SignerManager | 3-4h |
| TemplateEngine | 4-5h |
| RelayManager | 5-7h |
| EventManager | 4-5h |
| StorageManager | 4-5h |
| Integration | 2-3h |

---

## Testbarkeit

Jedes Modul kann **unabhängig in der Browser-Console getestet werden**:

1. **Import** der Modul-Dateien
2. **Ausführen** der Test-Funktionen
3. **Validierung** über Console-Output
4. **Inspektion** über Browser DevTools

### Beispiel-Test-Workflow:

```javascript
// 1. Laden
import { runEventBusTests } from './framework/core/EventBus.test.js';

// 2. Ausführen
const results = runEventBusTests();

// 3. Validieren
console.table(results.tests);

// 4. Manuell testen
import { EventBus } from './framework/core/EventBus.js';
const bus = new EventBus();
bus.setDebugMode(true);
// ... interaktive Tests ...
```

---

## Entwicklungs-Checkliste

### Phase 1: Core-Module (Woche 1)
- [ ] EventBus implementiert und getestet
- [ ] IdentityManager implementiert und getestet
- [ ] SignerManager implementiert und getestet
- [ ] TemplateEngine implementiert und getestet

### Phase 2: Relay & Event Management (Woche 2)
- [ ] RelayManager implementiert und getestet
- [ ] EventManager implementiert und getestet
- [ ] Integration EventManager ↔ andere Module

### Phase 3: Storage & Integration (Woche 3)
- [ ] StorageManager implementiert und getestet
- [ ] LocalStoragePlugin implementiert
- [ ] NostrFramework Hauptklasse
- [ ] Vollständige Integration aller Module

### Phase 4: Auth-Plugins (Woche 4)
- [ ] NIP-07 Plugin (Browser Extension)
- [ ] NIP-46 Plugin (Bunker)
- [ ] Local Key Plugin (nsec)
- [ ] WordPress API Plugin (optional)

### Phase 5: Erweiterte Features (Woche 5)
- [ ] Weitere NIP-Templates (NIP-04, NIP-23, etc.)
- [ ] SQLite Storage Plugin (WASM)
- [ ] IndexedDB Storage Plugin
- [ ] Erweiterte Sync-Strategien

### Phase 6: Dokumentation & Beispiele (Woche 6)
- [ ] API-Dokumentation
- [ ] Usage-Guides
- [ ] Beispiel-Anwendungen
- [ ] Migration-Guide

---

## Ordnerstruktur (Finale)

```
framework/
├── core/
│   ├── EventBus.js
│   ├── EventBus.test.js
│   ├── IdentityManager.js
│   ├── IdentityManager.test.js
│   ├── SignerManager.js
│   ├── SignerManager.test.js
│   ├── TemplateEngine.js
│   ├── TemplateEngine.test.js
│   ├── EventManager.js
│   ├── EventManager.test.js
│   ├── RelayManager.js
│   ├── RelayManager.test.js
│   ├── StorageManager.js
│   └── StorageManager.test.js
│
├── plugins/
│   ├── auth/
│   │   ├── AuthPlugin.js
│   │   ├── Nip07Plugin.js
│   │   ├── Nip46Plugin.js
│   │   ├── LocalKeyPlugin.js
│   │   └── WordPressPlugin.js
│   │
│   ├── signer/
│   │   ├── SignerPlugin.js
│   │   └── MockSigner.js
│   │
│   └── storage/
│       ├── StoragePlugin.js
│       ├── LocalStoragePlugin.js
│       ├── IndexedDBPlugin.js
│       └── SQLitePlugin.js
│
├── templates/
│   ├── EventTemplate.js
│   ├── nip01.js (Text Notes, Metadata)
│   ├── nip04.js (Encrypted DMs)
│   ├── nip09.js (Event Deletion)
│   ├── nip23.js (Long-form Content)
│   ├── nip25.js (Reactions)
│   ├── nip52.js (Calendar Events)
│   └── index.js
│
├── utils/
│   ├── crypto.js
│   ├── bech32.js
│   └── validation.js
│
├── index.js (Haupt-Export)
├── nostr-framework.md (Konzept)
├── AGENT_EventBus.md
├── AGENT_IdentityManager.md
├── AGENT_SignerManager.md
├── AGENT_TemplateEngine.md
├── AGENT_RelayManager.md
├── AGENT_EventManager.md
├── AGENT_StorageManager.md
└── IMPLEMENTATION_ROADMAP.md (diese Datei)
```

---

## Quick-Start für Entwickler

### 1. Beginne mit EventBus
```bash
# Lese AGENT_EventBus.md
# Implementiere framework/core/EventBus.js
# Teste in Browser-Console
```

### 2. Für jedes Modul:
1. **Lesen**: Agent-Dokument durchlesen
2. **Implementieren**: Code aus Dokument übernehmen/anpassen
3. **Testen**: Browser-Console-Tests ausführen
4. **Validieren**: Alle Akzeptanzkriterien prüfen
5. **Dokumentieren**: Änderungen notieren

### 3. Integration testen:
```javascript
// Nach jedem neuen Modul: Integration testen
import { NostrFramework } from './framework/index.js';
const nostr = new NostrFramework({ debug: true });
await nostr.initialize();
// Alle bisherigen Module sollten funktionieren
```

---

## Intervention Points

An folgenden Stellen sollten wir intervenieren/entscheiden:

1. **Nach EventBus**: Ist die Event-Architektur geeignet?
2. **Nach IdentityManager**: Sind die Auth-Plugins flexibel genug?
3. **Nach TemplateEngine**: Welche weiteren NIPs sollen unterstützt werden?
4. **Nach RelayManager**: Ist die Relay-Logik performant genug?
5. **Nach EventManager**: Funktioniert die Integration aller Manager?
6. **Nach StorageManager**: Ist localStorage ausreichend oder SQLite nötig?
7. **Nach Integration**: Ist das API-Design intuitiv?

---

## Success Criteria

Das Framework ist erfolgreich, wenn:

- ✅ Alle Module unabhängig testbar sind
- ✅ Alle Browser-Console-Tests bestehen
- ✅ Events können erstellt, signiert und publiziert werden
- ✅ Subscriptions funktionieren
- ✅ Offline-Storage funktioniert
- ✅ Mehrere Auth-Methoden unterstützt werden
- ✅ Das Framework in einer echten App nutzbar ist
- ✅ Die API intuitiv und gut dokumentiert ist

---

## Nächster Schritt

**👉 Beginne mit `AGENT_EventBus.md`**

Öffne das Dokument und folge den Implementierungsschritten. Nach erfolgreichem Test des EventBus fahre mit IdentityManager fort.

---

## Support & Debugging

Teste stets über den VS-Code Liveserver: http://127.0.0.1:5500

Bei Problemen:

1. **Console-Tests prüfen**: Laufen alle Tests?
2. **Debug-Modus aktivieren**: `eventBus.setDebugMode(true)`
3. **Events überwachen**: Werden die richtigen Events gefeuert?
4. **Abhängigkeiten prüfen**: Sind alle Manager richtig verbunden?
5. **Agent-Dokument konsultieren**: Debugging-Tipps am Ende jedes Dokuments

Viel Erfolg! 🚀
