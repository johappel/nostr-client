
# /docs/components/EventForm.30023.md

**Purpose**: Erstellen & Publizieren von Longform‑Events `kind:30023` mit Validierung, Signing und Multi‑Relay Publish.

**Related NIPs**: 23/30023 (Longform), 27 (Content refs), 46/07 (Signieren), 94/96 (optionales Media Handling)

## API (Props)

```ts
export interface EventForm30023Props {
  relays: { url: string; read: boolean; write: boolean }[]
  signer: { signEvent: (evt: UnsignedEvent) => Promise<SignedEvent>; pubkey: string }
  defaultTags?: string[][] // vorbefüllte Tags, z. B. [["t","oer"],["l","de"]]
  onPublished?: (res: { id: string; acked: string[]; failed: string[] }) => void
  className?: string
}
```

## Schema (Zod)

```ts
const Schema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10).max(500).optional(),
  content: z.string().min(20),
  tags: z.array(z.tuple([z.string(), z.string(), z.string().optional(), z.string().optional()])).optional()
})
```

## States & UX

* **Dirty form** mit „Save Draft“ (nur lokal)
* **Publishing**: Spinner + Toast; Optimistic Insert in Liste
* **Error**: Validierungsfehler inline; Publish‑Fehler als Toast + Retry

## Accessibility

* Labels für alle Inputs; `aria-busy` während Publish; Live‑Region für Ergebnis

## MVP

* Seite: `/examples/app/event-form-30023/page.tsx`
* Features: Titel + Content (Markdown) + optionale Tags; Sign → Publish → Ergebnisliste unten
* Copy‑Code Button zum Snippet

## Tests

* **Unit**: `toEvent` baut korrekte Struktur (kind, tags)
* **E2E**: Formular ausfüllen, Publish (mit Mock‑signer & Mock‑relays), Erfolg sichtbar

## Core‑Transformation

```ts
function toEvent(data: z.infer<typeof Schema>, pubkey: string): UnsignedEvent {
  const now = Math.floor(Date.now()/1000)
  const tags = [["title", data.title], ...(data.tags ?? [])]
  if (data.summary) tags.push(["summary", data.summary])
  return { kind: 30023, created_at: now, content: data.content, tags, pubkey }
}
```

## Usage Snippet

```tsx
<EventForm30023
  relays={[{ url: 'wss://relay-rpi.edufeed.org', read: true, write: true }]}
  signer={signer}
  defaultTags={[["t","oer"],["l","de"]]}
/>
```

## Extensions

* **Media**: Bild/Datei via NIP‑96 hochladen, `kind:1063` referenzieren (NIP‑94) und als `a`/URL in Content einbetten
* **Templates**: Dropdown mit vorbefüllten Strukturen (z. B. AMB‑NIP Felder)
* **Preview**: Markdown‑Preview (MDX) in Tab
* **Scheduling**: `created_at` in Zukunft + Client‑Reminder

