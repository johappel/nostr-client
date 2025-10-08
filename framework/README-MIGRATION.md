# Nostr Framework - TypeScript & React/Next.js Integration

## 🔄 Migration zu TypeScript

Das Framework ist bereits vollständig nach TypeScript migriert. Die JavaScript-Dateien können entfernt werden.

### Aktueller Status

✅ **Vollständig migriert:**
- Alle Core-Module (EventBus, EventManager, etc.)
- Haupt-Framework (index.ts)
- Konfiguration (config.ts)
- Type-Definitionen (types/index.ts)
- Build-Pipeline (TypeScript Compiler)

⚠️ **Noch zu migrieren:**
- Template-Dateien (nip01.js, nip09.js, nip52.js)
- Test-Dateien (.test.js)

### Migration durchführen

```bash
# Automatische Migration der JavaScript-Dateien
node scripts/migrate-to-typescript.js

# TypeScript build testen
npm run build

# Framework publizieren
npm publish --access public
```

## 🚀 React/Next.js Integration

### Installation

```bash
npm install @johappel/nostr-framework
```

### Next.js Setup

```tsx
// app/layout.tsx oder _app.tsx
import { NostrProvider } from '@johappel/nostr-framework/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NostrProvider 
          config={{
            relays: [
              'wss://relay.damus.io',
              'wss://nos.lol',
              'wss://relay.snort.social'
            ]
          }}
          autoConnect={true}
        >
          {children}
        </NostrProvider>
      </body>
    </html>
  );
}
```

### Komponenten verwenden

```tsx
// components/NostrNote.tsx
'use client';

import { useState } from 'react';
import { useNostr, useNostrPublish } from '@johappel/nostr-framework/nextjs';

export function NostrNote() {
  const { isAuthenticated, connect } = useNostr();
  const { publishNote, isPublishing } = useNostrPublish();
  const [content, setContent] = useState('');

  const handlePublish = async () => {
    if (!content.trim()) return;
    
    try {
      await publishNote(content);
      setContent('');
      alert('Note published!');
    } catch (error) {
      alert('Failed to publish note: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div>
        <p>Please connect your Nostr wallet to continue.</p>
        <button onClick={() => connect()}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        cols={50}
      />
      <br />
      <button 
        onClick={handlePublish}
        disabled={isPublishing || !content.trim()}
      >
        {isPublishing ? 'Publishing...' : 'Publish Note'}
      </button>
    </div>
  );
}
```

### Event Feed anzeigen

```tsx
// components/NostrFeed.tsx
'use client';

import { useNostrEvents } from '@johappel/nostr-framework/nextjs';

export function NostrFeed() {
  const { events, isLoading } = useNostrEvents([
    {
      kinds: [1], // Text notes
      limit: 50
    }
  ]);

  if (isLoading) {
    return <div>Loading feed...</div>;
  }

  return (
    <div>
      <h2>Latest Notes</h2>
      {events.map((event) => (
        <div key={event.id} style={{ 
          border: '1px solid #ccc', 
          padding: '10px', 
          margin: '10px 0' 
        }}>
          <p>{event.content}</p>
          <small>
            {new Date(event.created_at * 1000).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}
```

## 📦 Package Structure

```
@johappel/nostr-framework/
├── index.js                 # Haupt-Framework
├── config.js               # Konfiguration
├── nextjs/index.js         # Next.js spezifische Hooks
├── react/index.js          # React Hooks (allgemein)
└── types/                  # TypeScript Definitionen
```

## 🔧 Verfügbare Hooks

### `useNostr()`
Zugriff auf das Framework und Authentifizierungsstatus.

### `useNostrPublish()`
Veröffentlichen von Nostr Events.

### `useNostrEvents(filters)`
Abonnieren und Empfangen von Events.

### `useNostrProfile(pubkey?)`
Laden und Verwalten von Benutzerprofilen.

## 🚀 Vorteile der TypeScript-Migration

1. **Type Safety:** Compile-time Fehlerprüfung
2. **Better IDE Support:** IntelliSense, Auto-completion
3. **Self-documenting:** Types als Dokumentation
4. **Refactoring Safety:** Sichere Code-Änderungen
5. **Modern Development:** Aktueller Standard für Libraries

## 🔄 Breaking Changes

### Von v1.x zu v2.x (TypeScript)

1. **Import-Pfade bleiben gleich:**
   ```typescript
   import { NostrFramework } from '@johappel/nostr-framework';
   ```

2. **Neue React/Next.js Integration:**
   ```typescript
   import { useNostr } from '@johappel/nostr-framework/nextjs';
   ```

3. **Type-Definitionen verfügbar:**
   ```typescript
   import type { Identity, FrameworkConfig } from '@johappel/nostr-framework';
   ```

## 📈 Nächste Schritte

1. ✅ TypeScript-Migration abschließen
2. ✅ React/Next.js Hooks implementieren
3. 🔄 Template-System zu TypeScript migrieren
4. 🔄 Test-Suite zu TypeScript migrieren
5. 📚 Dokumentation erweitern
6. 🎯 SSR-Support für Next.js
7. 🔧 Build-Optimierungen