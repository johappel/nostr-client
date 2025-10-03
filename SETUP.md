# Setup-Anleitung

## Schritt-für-Schritt Installation

### 1. Dependencies installieren

```bash
npm install
```

Dies installiert:
- `nostr-tools@2.8.1` - Für NIP-19 Encoding/Decoding und weitere Nostr-Utilities

### 2. Überprüfung

Nach der Installation sollte ein `node_modules` Ordner existieren:

```bash
ls node_modules/nostr-tools
```

### 3. Development Server starten

**Option A: VS Code Live Server (empfohlen)**
1. Installiere die "Live Server" Extension in VS Code
2. Rechtsklick auf eine HTML-Datei → "Open with Live Server"
3. Browser öffnet automatisch auf `http://127.0.0.1:5500`

**Option B: npx serve**
```bash
npx serve .
```

**Option C: Python HTTP Server**
```bash
python -m http.server 8000
# oder
python3 -m http.server 8000
```

### 4. Tests ausführen

Öffne im Browser:

- EventBus Tests: http://127.0.0.1:5500/test-eventbus.html
- IdentityManager Tests: http://127.0.0.1:5500/test-identity.html
- NIP-07 Plugin Tests: http://127.0.0.1:5500/test-nip07.html

### 5. NIP-07 Extension installieren (für NIP-07 Tests)

Für die vollständigen NIP-07 Plugin Tests:

1. Installiere eine Browser-Extension:
   - [Alby](https://getalby.com)
   - [nos2x](https://github.com/fiatjaf/nos2x)  - empfohlen
   - [Flamingo](https://www.flamingo.me)

2. Erstelle oder importiere einen Nostr-Account in der Extension

3. Öffne `test-nip07.html` und teste die Funktionen

## Verzeichnisstruktur nach Installation

```
nostr-client/
├── node_modules/           # Nach npm install
│   └── nostr-tools/
├── framework/
│   ├── core/
│   │   ├── EventBus.js
│   │   └── IdentityManager.js
│   ├── plugins/
│   │   └── auth/
│   │       ├── AuthPlugin.js
│   │       └── Nip07Plugin.js
│   └── index.js
├── test-*.html
├── package.json
├── package-lock.json       # Nach npm install
├── .gitignore
├── README.md
└── SETUP.md
```

## Troubleshooting

### Problem: "Cannot find module 'nostr-tools'"

**Lösung**: npm install ausführen
```bash
npm install
```

### Problem: "Module not found" im Browser

**Lösung**: Browser unterstützt keine Node-Module direkt. Verwende einen Development Server (Live Server, etc.)

### Problem: NIP-07 Plugin funktioniert nicht

**Lösung**: 
1. Prüfe ob Extension installiert ist
2. Öffne `test-nip07.html` und klicke "Extension prüfen"
3. Stelle sicher, dass die Extension aktiviert ist
4. Checke Browser Console für Fehler

### Problem: CORS-Fehler

**Lösung**: 
- Verwende einen lokalen Webserver (nicht `file://` URLs)
- VS Code Live Server oder `npx serve` empfohlen

## Nächste Schritte

Nach erfolgreichem Setup:

1. ✅ Teste EventBus in `test-eventbus.html`
2. ✅ Teste IdentityManager in `test-identity.html`
3. ✅ Teste NIP-07 Plugin in `test-nip07.html`
4. 📖 Lies [`README.md`](README.md) für Code-Beispiele
5. 📖 Lies [`framework/AGENTS.md`](framework/AGENTS.md) für die Roadmap

## Development Workflow

```bash
# 1. Code ändern
# 2. Browser neu laden (oder Live Server macht das automatisch)
# 3. Tests in Browser ausführen
# 4. Console für Logs/Fehler prüfen
```

## Weitere Ressourcen

- [Nostr NIPs](https://github.com/nostr-protocol/nips)
- [nostr-tools Docs](https://github.com/nbd-wtf/nostr-tools)
- [NIP-07 Spec](https://github.com/nostr-protocol/nips/blob/master/07.md)