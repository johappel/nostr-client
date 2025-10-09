# /docs/components/NostrConfigPanel.md

**Purpose**: Interaktive Konfiguration der Nostr‑Runtime: Relays (read/write), Auth‑Adapter (NIP‑07/Bunker/Local), Storage‑Adapter (IndexedDB/Server‑DB), Permissions/Policy.

**Related NIPs**: 07, 46, 05 (optional), 11 (relay hints)

## API (Props)

```ts
export type RelayConfig = { url: string; read: boolean; write: boolean }
export interface NostrConfigPanelProps {
  value: {
    relays: RelayConfig[]
    auth: { type: 'nip07' | 'bunker' | 'local'; uri?: string }
    storage: { type: 'indexeddb' | 'server-db' }
    policy?: { allowPublishKinds: number[]; allowDelete?: boolean }
  }
  onChange: (next: NostrConfigPanelProps['value']) => void
  relayHealth?: (url: string) => Promise<{ latencyMs: number; ok: boolean }>
  allowCustomAuth?: boolean // default true; if false, restrict to NIP‑07 only
  className?: string
}
```

## States & UX

* **Loading**: während Health‑Checks
* **Empty**: keine Relays → CTA „Add Relay“
* **Error**: Health‑Probe schlägt fehl → Badge + Tooltip
* **Dirty**: Ungespeicherte Änderungen → „Save/Reset“ Leiste

## Accessibility

* Formfelder mit Labels; Tabbing durch alle Inputs; „Add Relay“ als `button` mit `aria-label`.

## MVP

* Seite: `/examples/app/nostr-config-panel/page.tsx`
* Features:

  * Relays hinzufügen/entfernen, read/write togglen
  * Auth auswählen: NIP‑07, Bunker (URI), Local
  * Storage: IndexedDB vs. Server‑DB (nur Anzeige)
  * **Copy Code**‑Button liefert ein serialisiertes `NostrConfig`‑Snippet

## Tests

* **Unit**: Relays add/remove/toggle; onChange feuert korrekte Werte
* **E2E**: Playwright lädt Page, fügt Relay hinzu, prüft Sichtbarkeit/Clipboard

## Extensions

* Import/Export als JSON; Presets (Default Relay Sets); Warnungen bei doppelten Relays; Auto‑probe bei Eingabe

## Code Snippets

```tsx
import { NostrConfigPanel } from '@/components/nostr-ui/NostrConfigPanel'

export default function Demo() {
  const [cfg, setCfg] = useState({
    relays: [
      { url: 'wss://relay-rpi.edufeed.org', read: true, write: true },
      { url: 'wss://relay.damus.io', read: true, write: false },
    ],
    auth: { type: 'nip07' },
    storage: { type: 'indexeddb' },
    policy: { allowPublishKinds: [1, 30023] }
  })
  return <NostrConfigPanel value={cfg} onChange={setCfg} />
}
```


