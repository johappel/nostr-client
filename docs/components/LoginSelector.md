# /docs/components/LoginSelector.md

**Purpose**: Nutzer:innen einen schnellen Login‑Einstieg bieten; erkennt installierte Provider und steuert in `LoginDialog`.

**Related NIPs**: 07 (Browser Signer), 46 (Bunker), 05 (Ident Mapping)

## API (Props)

```ts
export interface LoginSelectorProps {
  providers?: Array<
    | { kind: 'nip07' }
    | { kind: 'bunker'; uri?: string; label?: string }
    | { kind: 'local' }
  >
  onChoose: (p: { kind: 'nip07' | 'bunker' | 'local'; uri?: string }) => void
  detectInstalled?: boolean // default: true (prüft window.nostr)
  className?: string
}
```

## States & UX

* **Detected**: Zeigt „NIP‑07 verfügbar“ Badge
* **No Provider**: Hinweis + Link zu Dokumentation
* **Bunker**: Input für URI, optional QR‑Paste

## Accessibility

* Buttons als echte Buttons; `aria-pressed` für Auswahlstatus; Inputs mit Labels

## MVP

* Seite: `/examples/app/login-selector/page.tsx`
* Features: erkennt `window.nostr`; zeigt Karten für NIP‑07, Bunker (URI), Local Key; `onChoose` in Konsole
* Copy‑Code Button inklusive

## Tests

* **Unit**: Renderlogik mit/ohne `window.nostr` (mocket)
* **E2E**: Auswahl „NIP‑07“ → bestätigt Auswahl sichtbar

## Extensions

* NIP‑05 Lookup: Eingabe `name@domain` → `nprofile` Vorschlag
* Remember choice (LocalStorage) mit explizitem Opt‑in

## Code Snippet

```tsx
<LoginSelector onChoose={(prov) => setAuthProv(prov)} />
```
