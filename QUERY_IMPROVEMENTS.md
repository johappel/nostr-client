# RelayManager Query-Verbesserungen

## Behobene Probleme

### 1. Filter-Verarbeitung
**Problem**: Die ursprüngliche Filter-Reinigung war zu restriktiv und entfernte wichtige Nostr-spezifische Eigenschaften wie Tag-Filter (`#e`, `#p`, etc.).

**Lösung**: 
- Verbesserte Filter-Verarbeitung, die alle gültigen Nostr-Filter-Eigenschaften erhält
- Bessere Validierung ohne Verlust von benutzerdefinierten Tags
- Tiefe Kopierung zur Vermeidung von Mutations-Problemen

### 2. Subscription-basierte Abfragen
**Problem**: Die `_queryWithSubscription` Methode war nicht robust genug für echte Relay-Verbindungen.

**Lösung**:
- Verbesserte Fehlerbehandlung und Cleanup-Logik
- Bessere Timeout-Verwaltung mit partiellen Ergebnissen
- Robuste Event-Validierung
- Relay-Status-Tracking für bessere Diagnostik

### 3. Relay-Konnektivität
**Problem**: Keine Möglichkeit, problematische Relays zu identifizieren und zu umgehen.

**Lösung**:
- Neue `testRelayConnectivity()` Methode
- Automatisches Filtern von nicht funktionierenden Relays
- URL-Validierung beim Hinzufügen von Relays
- Besseres Status-Tracking

### 4. Timeouts und Performance
**Problem**: Zu kurze Timeouts für echte Relay-Verbindungen.

**Lösung**:
- Erhöhte Standard-Timeouts (5000ms statt 3500ms)
- Intelligente Timeout-Behandlung mit partiellen Ergebnissen
- Bessere Performance-Optimierung

## Neue Features

### Relay-Konnektivitätstest
```javascript
const results = await relayManager.testRelayConnectivity();
// Ergebnis: [{ relay: 'wss://...', connected: true, latency: 150 }]
```

### Robuste Query-Ausführung
```javascript
const events = await relayManager.query(
  [{ kinds: [1], limit: 10 }],
  { timeout: 5000, limit: 10 }
);
```

### Automatische Relay-Filterung
Der RelayManager testet automatisch die Konnektivität bei erkannten Problemen und nutzt nur funktionierende Relays.

## Verwendung

### Basic Query
```javascript
const relayManager = new RelayManager();
relayManager.addRelays(['wss://relay.damus.io', 'wss://nos.lol']);
await relayManager.initialize();

// Einfache Textnotizen abrufen
const events = await relayManager.query([
  { kinds: [1], limit: 20 }
]);
```

### Query mit spezifischen Optionen
```javascript
const events = await relayManager.query(
  [{ kinds: [1], authors: ['pubkey...'], limit: 10 }],
  { 
    timeout: 3000,
    limit: 10,
    relays: ['wss://specific-relay.com'] 
  }
);
```

### Tag-Filter (funktioniert jetzt korrekt)
```javascript
const events = await relayManager.query([
  { 
    kinds: [1], 
    '#e': ['event-id-to-reply-to'],
    '#p': ['pubkey-to-mention'],
    limit: 50 
  }
]);
```

## Test-Skript

Führen Sie `test-query.js` aus, um die Funktionalität zu testen:

```bash
node test-query.js
```

Das Skript testet:
- Relay-Konnektivität
- Verschiedene Query-Typen
- Fehlerbehandlung
- Performance-Metriken

## Debugging

Für ausführliches Logging setzen Sie die Konsole auf Debug-Level. Der RelayManager loggt jetzt:
- Filter-Verarbeitung
- Relay-Status-Änderungen
- Query-Performance
- Konnektivitätsprobleme