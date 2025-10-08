# Test Agent: TypeScript Kompatibilität für HTML Tests

## Aufgabe
Stelle sicher, dass alle HTML-Testdateien (test-*.html) mit der neuen TypeScript-Plugin-Struktur funktionieren.

## Identifizierte Probleme

### 1. Import-Pfade in HTML-Tests
- HTML-Tests verwenden noch JavaScript-Imports (.js)
- Müssen auf TypeScript-Builds (.js aus dist/) umgestellt werden
- ImportMap muss auf build-Output verweisen

### 2. Plugin-Imports
- Alte Pfade: `./framework/plugins/auth/NsecPlugin.js`
- Neue Pfade: `./framework/dist/plugins/auth/NsecPlugin.js`

### 3. Fehlende dist-Builds
- Tests erwarten JavaScript-Files im dist-Ordner
- TypeScript muss vor Tests kompiliert werden

## Lösungsschritte

### Phase 1: Update Import-Maps in HTML-Tests
```html
<!-- ALT -->
<script type="importmap">
{
  "imports": {
    "./framework/plugins/auth/NsecPlugin.js": "./framework/plugins/auth/NsecPlugin.js"
  }
}
</script>

<!-- NEU -->
<script type="importmap">
{
  "imports": {
    "./framework/plugins/auth/NsecPlugin.js": "./framework/dist/plugins/auth/NsecPlugin.js",
    "./framework/core/": "./framework/dist/core/",
    "./framework/": "./framework/dist/"
  }
}
</script>
```

### Phase 2: Test-Laufzeit-Abhängigkeiten
- Stelle sicher dass `npm run build` vor Tests läuft
- Dist-Ordner muss alle kompilierten TypeScript-Files enthalten
- Type-Definitionen (.d.ts) verfügbar für Tests

### Phase 3: Plugin-Test-Spezifika

#### NsecPlugin Tests (test-nsec.html)
- Import von `NsecPlugin.ts` → `dist/plugins/auth/NsecPlugin.js`
- Browser-Crypto-API Tests
- NSEC-Key-Generierung Tests

#### Nip07Plugin Tests (test-nip07.html)  
- Import von `Nip07Plugin.ts` → `dist/plugins/auth/Nip07Plugin.js`
- Browser-Extension-Detection Tests
- window.nostr API Tests

#### Nip46Plugin Tests (test-nip46.html)
- Import von `Nip46Plugin.ts` → `dist/plugins/auth/Nip46Plugin.js`
- Bunker-Connection Tests
- Modal-Dialog Tests

#### Storage Tests (test-storage.html, test-sqlite-*.html)
- Import aller Storage-Plugins aus dist/
- LocalStorage Tests
- SQLite WASM Tests

#### Core Manager Tests
- EventBus, EventManager, IdentityManager, etc.
- Import aus `dist/core/`
- Inter-Manager-Communication Tests

## Automatisierte Lösungen

### Build-vor-Test-Script
```json
{
  "scripts": {
    "test:html": "npm run build && python -m http.server 8000",
    "test:prepare": "npm run build && echo 'Ready for HTML tests at http://localhost:8000'"
  }
}
```

### HTML-Test-Template-Update
Erstelle `test-template-updated.html` mit korrekten TypeScript-Imports als Vorlage.

## Validierung

### Erfolg wenn:
1. ✅ Alle HTML-Tests laden ohne Import-Fehler
2. ✅ Plugin-Instanziierung funktioniert 
3. ✅ Core-Manager-Tests bestehen
4. ✅ Browser-APIs sind verfügbar
5. ✅ TypeScript-Typen korrekt kompiliert

### Test-Kommandos:
```bash
npm run build
# Dann Browser-Tests manuell in http://localhost:8000/test-*.html
```

## Priorität: HOCH
Ohne funktionierende Tests ist die TypeScript-Migration unvollständig.

## Nächste Schritte
1. Update aller HTML-Test ImportMaps
2. Stelle sicher dass dist-Build funktioniert  
3. Teste jeden HTML-Test einzeln
4. Dokumentiere verbleibende Issues
5. Erstelle automatisierte Test-Pipeline