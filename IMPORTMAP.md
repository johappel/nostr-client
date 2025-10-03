# Import Map Konfiguration für nostr-tools

Da Browser keine direkten Zugriffe auf `node_modules` haben, benötigen wir eine Import Map, um `nostr-tools` zu laden.

## Option 1: CDN (Empfohlen für Tests)

Die einfachste Lösung ist die Verwendung eines CDN wie esm.sh:

```html
<script type="importmap">
  {
    "imports": {
      "nostr-tools/nip19": "https://esm.sh/nostr-tools@2.17.0/nip19"
    }
  }
</script>
```

**Vorteile:**
- Keine lokale Installation nötig
- Funktioniert sofort
- Gut für Tests und Demos

**Nachteile:**
- Benötigt Internetverbindung
- Externe Abhängigkeit

## Option 2: Lokale node_modules

Für Produktion oder Offline-Entwicklung:

```html
<script type="importmap">
  {
    "imports": {
      "nostr-tools/nip19": "./node_modules/nostr-tools/lib/esm/nip19.js"
    }
  }
</script>
```

**Voraussetzungen:**
1. `npm install` muss ausgeführt worden sein
2. Ein Development Server muss laufen (z.B. Live Server)
3. Der Server muss `node_modules` ausliefern können

**Vorteile:**
- Offline-fähig
- Keine externe Abhängigkeit
- Version ist fixiert durch package.json

**Nachteile:**
- Benötigt npm install
- Größere Dateien im Projekt

## Option 3: Bundler (Vite, Webpack, etc.)

Für Produktions-Apps:

```bash
npm install vite --save-dev
```

Vite und ähnliche Bundler lösen die Imports automatisch auf.

## Verwendung im Projekt

### test-nip07.html

Verwendet derzeit **Option 1 (CDN)**:

```html
<script type="importmap">
  {
    "imports": {
      "nostr-tools/nip19": "https://esm.sh/nostr-tools@2.17.0/nip19"
    }
  }
</script>
```

### Umstellung auf lokale Version

1. Ersetze die Import Map in `test-nip07.html`:

```html
<script type="importmap">
  {
    "imports": {
      "nostr-tools/nip19": "./node_modules/nostr-tools/lib/esm/nip19.js"
    }
  }
</script>
```

2. Stelle sicher, dass `npm install` ausgeführt wurde
3. Verwende einen Development Server

## Weitere nostr-tools Exporte

Falls du weitere Module benötigst, füge sie zur Import Map hinzu:

```html
<script type="importmap">
  {
    "imports": {
      "nostr-tools/nip19": "https://esm.sh/nostr-tools@2.17.0/nip19",
      "nostr-tools/nip04": "https://esm.sh/nostr-tools@2.17.0/nip04",
      "nostr-tools/nip44": "https://esm.sh/nostr-tools@2.17.0/nip44",
      "nostr-tools/pool": "https://esm.sh/nostr-tools@2.17.0/pool",
      "nostr-tools/relay": "https://esm.sh/nostr-tools@2.17.0/relay"
    }
  }
</script>
```

## Browser-Kompatibilität

Import Maps werden unterstützt von:
- Chrome/Edge 89+
- Firefox 108+
- Safari 16.4+

Für ältere Browser benötigst du einen Bundler oder ein Polyfill.

## Troubleshooting

### Fehler: "Failed to resolve module specifier"

**Problem**: Browser kann nostr-tools nicht finden

**Lösung**: 
1. Prüfe ob Import Map vor dem `<script type="module">` steht
2. Prüfe ob der Pfad/URL korrekt ist
3. Bei lokalem Pfad: Prüfe ob `node_modules` vorhanden ist

### Fehler: "CORS policy"

**Problem**: Browser blockiert Zugriff auf node_modules

**Lösung**:
- Verwende einen Development Server (nicht `file://` URLs)
- VS Code Live Server empfohlen

### Fehler: "Unexpected token '<'"

**Problem**: Server liefert HTML statt JavaScript

**Lösung**:
- Prüfe ob der Pfad korrekt ist
- Prüfe ob die Datei existiert
- Bei CDN: Prüfe Internet-Verbindung

## Empfehlung für dieses Projekt

**Für Entwicklung/Tests**: CDN verwenden (bereits konfiguriert)  
**Für Produktion**: Bundler verwenden (Vite empfohlen)

Siehe auch:
- [MDN: Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
- [esm.sh Documentation](https://esm.sh/)