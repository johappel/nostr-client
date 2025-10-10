# Nostr RelayManager Echte Tests

## 🎯 Übersicht

Dieses Test-Skript führt **echte Relay-Anfragen** gegen das Nostr-Netzwerk durch, anstatt nur Mock-Daten zu verwenden. Es testet die tatsächliche Funktionalität des RelayManager mit echten Daten.

## 🚀 Tests ausführen

### Methode 1: Automatisches Skript (Empfohlen)

**Windows:**
```bash
./start-relay-tests.bat
```

**Linux/Mac:**
```bash
./start-relay-tests.sh
```

### Methode 2: Manuell

1. **Framework bauen:**
   ```bash
   cd framework
   npm run build
   cd ..
   ```

2. **Test-Server starten:**
   ```bash
   cd tests
   npm run dev
   ```

3. **Tests aufrufen:**
   Öffnen Sie in Ihrem Browser: http://localhost:3002/relay

## ✅ Was wird getestet

### 1. **Echte Relay-Konnektivität**
- Testet WebSocket-Verbindungen zu echten Nostr-Relays
- Misst Latenz und Verbindungsqualität
- Verwendet bekannte öffentliche Relays:
  - `wss://relay.damus.io`
  - `wss://nos.lol` 
  - `wss://relay.nostr.band`
  - `wss://relay.snort.social`

### 2. **Echte Event-Queries**
- Fragt **echte Events** vom Nostr-Netzwerk ab
- Testet verschiedene Filter (kinds: [1] für Textnachrichten, kinds: [0] für Profile)
- Zeigt tatsächliche Inhalte und Metadaten an

### 3. **Live-Subscriptions**
- Erstellt **echte Subscriptions** für Live-Events
- Empfängt Events in Echtzeit vom Nostr-Netzwerk
- Zeigt Stream von aktuellen Events

### 4. **Performance-Tests**
- Misst echte Relay-Geschwindigkeiten
- Identifiziert das schnellste Relay
- Überwacht Relay-Gesundheit und Status

### 5. **Fehlerbehandlung**
- Testet Verhalten bei Verbindungsfehlern
- Handhabt Timeouts und Netzwerkprobleme
- Zeigt detaillierte Fehlerdiagnose

## 📊 Test-Ergebnisse verstehen

### Relay Status Indikatoren:
- **🟢 Verbunden**: Relay funktioniert, zeigt Latenz in ms
- **🟡 Verbindung läuft**: Verbindungsaufbau in Bearbeitung  
- **🔴 Fehler**: Verbindung fehlgeschlagen, zeigt Fehlergrund
- **⚫ Getrennt**: Relay ist offline

### Event-Anzeige:
- **Event-ID**: Eindeutige Identifikation des Events
- **Inhalt**: Tatsächlicher Nachrichteninhalt vom Nostr-Netzwerk
- **Art (Kind)**: Event-Typ (1=Textnachricht, 0=Profil, etc.)
- **Autor**: Public Key des Event-Erstellers
- **Zeit**: Erstellungszeitpunkt

### Logs:
- **✅ Grün**: Erfolgreiche Operationen
- **❌ Rot**: Fehler und Probleme  
- **⚠️ Gelb**: Warnungen
- **ℹ️ Blau**: Informative Nachrichten

## 🔧 Problembehandlung

### "Keine Events empfangen"
- **Ursache**: Relays sind möglicherweise überlastet oder langsam
- **Lösung**: Tests erneut ausführen oder längere Timeouts verwenden

### "Verbindungsfehler"
- **Ursache**: Netzwerkprobleme oder Relay-Ausfälle
- **Lösung**: Internetverbindung prüfen, andere Relays testen

### "Import-Fehler"
- **Ursache**: Framework nicht gebaut oder falsche Pfade
- **Lösung**: `npm run build` im framework-Ordner ausführen

## 🎛️ Konfiguration anpassen

### Andere Relays testen:
Editieren Sie in `page.tsx` die `defaultRelays` Variable:

```typescript
const defaultRelays = [
  'wss://ihr-relay.com',
  'wss://anderes-relay.net',
  // ...weitere Relays
];
```

### Timeout anpassen:
```typescript
const events = await relayManager.query(
  [{ kinds: [1], limit: 10 }],
  { timeout: 10000 } // 10 Sekunden
);
```

## 📈 Performance-Optimierung

- **Relay-Auswahl**: Verwenden Sie geografisch nahe Relays
- **Filter-Optimierung**: Spezifische Filter reduzieren Netzwerklast
- **Limit setzen**: Begrenzen Sie Event-Anzahl für bessere Performance

## 🔍 Debug-Informationen

Die Tests loggen detaillierte Debug-Informationen:
- Relay-Verbindungsstatus
- Query-Filter und -Ergebnisse  
- Event-Validierung
- Performance-Metriken
- Fehlerdiagnose

## 🌐 Netzwerk-Anforderungen

- **WebSocket-Unterstützung**: Moderne Browser erforderlich
- **CORS**: Tests laufen über localhost (kein CORS-Problem)
- **Firewall**: Ausgehende WebSocket-Verbindungen müssen erlaubt sein

## 📝 Nächste Schritte

Nach erfolgreichen Tests können Sie:
1. Den RelayManager in Ihrer Anwendung integrieren
2. Eigene Relays zu den Tests hinzufügen  
3. Zusätzliche Event-Filter testen
4. Performance-Optimierungen implementieren

Die Tests zeigen die echte Leistungsfähigkeit des RelayManager mit dem Nostr-Netzwerk!