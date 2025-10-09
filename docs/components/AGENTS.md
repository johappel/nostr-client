# AGENTS.md — Nostr UI Components Kit

> **Goal**: A production‑ready, modular React component library for Nostr apps built on **Next.js** (starter: `johappel/nostr-client`) and **shadcn/ui**. This document defines scope, conventions, file layout, design tokens, build/test flows, and the authoring checklist for AGENTS who implement features. Each component also gets a dedicated spec in `/docs/components/<Component>.md`.

---

## 0. High‑Level Architecture

* **App framework**: Next.js (App Router)
* **UI**: shadcn/ui + Tailwind CSS
* **State & data**: TanStack Query (React Query) + Context + light Zustand where needed
* **Nostr**: `nostr-tools` `SimplePool` on client, server proxy for caching; typed helpers in `/lib/nostr`
* **Validation**: Zod
* **Storage**: pluggable (IndexedDB/Dexie client; LibSQL/SQLite/Postgres server via Drizzle/Prisma)
* **Auth**: pluggable (NIP‑07, NIP‑46/Bunker, Local key, optional NIP‑05 lookup)
* **Theming**: FOERBICO tokens via CSS variables; shadcn theme mapped to tokens
* **Testing**: Vitest + React Testing Library; Playwright for examples
* **Lint/Format**: ESLint (strict) + Prettier + Type‑checked (tsconfig: `strict: true`)

---

## 1. Repository Layout

```
/ (repo root)
├─ framework/                 # 📦 npm Package (@johappel/nostr-framework)
│  ├─ react/
│  │  ├─ components/          # Headless UI components (production)
│  │  ├─ hooks/               # Configuration & state hooks
│  │  └─ index.ts             # Main exports for npm
│  ├─ core/                   # Framework-agnostic core
│  ├─ plugins/                # Storage & auth plugins
│  ├─ types/                  # TypeScript definitions
│  └─ package.json            # npm package configuration
├─ examples/                  # 🎨 Development & Showcase
│  ├─ app/<component>/        # Minimal runnable MVPs (shadcn/ui)
│  ├─ components/
│  │  ├─ ui/                  # shadcn/ui components
│  │  └─ nostr-ui/            # Styled demo components
│  └─ package.json            # Development dependencies
├─ docs/
│  └─ components/             # <Component>.md specs (one per component)
├─ public/                    # static assets
├─ scripts/                   # dev scripts (scaffolding, code-copy helpers)
└─ package.json
```

### Folder responsibilities

* **/framework/react/components/** (📦 **npm Package Production**)

  * **Headless** UI components (no styling dependencies)
  * Framework-agnostic with `components` prop for UI library override
  * **Import**: `import { Component } from "@johappel/nostr-framework/react"`
  * TypeScript definitions included; tree-shakable exports

* **/framework/react/hooks/** (📦 **npm Package Production**)

  * Configuration & state management hooks (useNostrConfig, etc.)
  * SSR-safe, browser-agnostic with localStorage fallbacks
  * **Import**: `import { useHook } from "@johappel/nostr-framework/react"`

* **/framework/core/** (📦 **npm Package Production**)

  * Pure domain types (TypeScript) and Zod schemas (Events, Tags, NIPs)
  * Common helpers: ID utilities, tag helpers (`#t`, `#d`, `a`, `e`), dedupe/merge
  * No React, no browser globals; runs in Node/Edge

* **/framework/plugins/** (📦 **npm Package Production**)

  * Storage plugins (LocalStorage, SQLite, SQLite-File)
  * Auth adapters (NIP‑07, NIP‑46, Local, optional NIP‑05 resolver)
  * **Import**: `import { Plugin } from "@johappel/nostr-framework/plugins"`

* **/examples/components/nostr-ui/** (🎨 **Development & Showcase**)

  * **Styled** components using shadcn/ui + Tailwind CSS
  * Local development imports: `import { Component } from "@/components/nostr-ui/Component"`
  * Perfect for copy-paste into user projects

* **/examples/components/ui/** (🎨 **Development & Showcase**)

  * shadcn/ui components (Button, Card, Input, etc.)
  * Tailwind CSS styling with FOERBICO design tokens

* **/templates/**

  * **NIP specs as code**: `30023`, `1063`, `52 (31922–31925)`, `10`, `27`, `96`, etc.
  * Each template ships 3 artifacts: `schema.ts` (Zod), `form.tsx` (shadcn form), `render.tsx` (viewer)

* **/plugins/**

  * Optional capabilities (e.g., MediaUploader with NIP‑96/NIP‑94, ZapButton with LUD‑16)
  * Keep to `Adapter` pattern with narrow interfaces

* **/examples/app/**

  * For **every component**, an MVP page that boots with mock or live data
  * Includes a "Copy Code" button (client‑side clipboard) and minimal Playwright test

* **/docs/components/**

  * One `*.md` per component with: Purpose, API, States, UX, Accessibility, MVP steps, Tests, Extension ideas

---

## 2. Design System

### FOERBICO color tokens (CSS variables)

```css
:root {
  --brand-primary: #203A8F;   /* 1 */
  --brand-alt:     #FFA500;   /* 2 */
  --text-body:     #333333;   /* 3 */
  --text-heading:  #002366;   /* 4 */
  --border-subtle: #D3D3D3;   /* 5 */
  --bg-soft:       #F0F8FF;   /* 6 */
  --bg-base:       #FFFFFF;   /* 7 */
  --bg-header:     #E6F2FF;   /* 8 */
}
```

Map to Tailwind via `tailwind.config.ts` theme `extend.colors` and wire shadcn theme tokens (primary, muted, card, etc.) to these CSS vars.

### Typography & spacing

* System font stack; headings semibold; body regular
* t‑shirt sizes: `xs, sm, base, lg, xl, 2xl` (consistent across components)
* Cards: rounded‑2xl; soft shadows; generous padding (`p-4` min)

### Components baseline (shadcn)

Use: `Button`, `Card`, `Dialog`, `Form`, `Input`, `Textarea`, `Select`, `Tabs`, `Popover`, `Calendar`, `Badge`, `Alert`, `Toast`, `Table`, `Skeleton`, `Avatar`, `ScrollArea`.

Accessibility: Keyboard navigation, ARIA roles, focus rings, reduced motion support.

---

## 3. Core Interfaces (for AGENTS)

```ts
// core/types.ts
export type RelayConfig = { url: string; read: boolean; write: boolean }

export interface NostrConfig {
  relays: RelayConfig[]
  auth: AuthAdapter
  storage: StorageAdapter
  policy?: { allowPublishKinds: number[]; allowDelete?: boolean }
}

export type EventTemplate<T> = {
  kind: number
  schema: z.ZodType<T>
  toEvent: (data: T, ctx: { pubkey: string }) => NostrEvent
  fromEvent: (evt: NostrEvent) => T
}
```

```ts
// lib/auth/adapter.ts
export interface AuthAdapter {
  kind: 'nip07' | 'bunker' | 'local'
  getPubkey(): Promise<string>
  signEvent(evt: UnsignedEvent): Promise<SignedEvent>
}
```

```ts
// lib/storage/adapter.ts
export interface StorageAdapter {
  put(evts: NostrEvent[] | NostrEvent): Promise<void>
  getById(id: string): Promise<NostrEvent | undefined>
  query(filters: NostrFilter[]): Promise<NostrEvent[]>
}
```

```ts
// lib/nostr/pool.ts
export interface QueryOptions { live?: boolean; timeoutMs?: number; limit?: number }
export function queryEvents(relays: RelayConfig[], filters: NostrFilter[], opts?: QueryOptions): AsyncIterable<NostrEvent>
export function publishEvent(relays: RelayConfig[], evt: SignedEvent): Promise<{ acked: string[]; failed: string[] }>
```

---

## 4. Component Inventory & Ownership

Each item links to its own `/docs/components/<Component>.md` (create as you pick up the task):

1. **NostrConfigPanel**
2. **LoginSelector**
3. **LoginDialog/LoginForm**
4. **UserProfile** (Kind 0)
5. **UsersList**
6. **QueryBuilder / QueryEvents**
7. **EventsList (from Query)**
8. **EventFromTemplate**
9. **EventForm** (per NIP)
10. **ChannelEventsList** (sub)
11. **ChannelEventsGrid** (sub)
12. **NostrChat**
13. **RelayHealthBadge / RelayPicker**
14. **PermissionGuard**
15. **ThreadView (NIP‑10)**
16. **ContentLinkifier (NIP‑27)**
17. **LongformRenderer (NIP‑23/30023)**
18. **CalendarView (NIP‑52)**
19. **Reactions**
20. **ZapButton (LUD‑16)**
21. **MediaUploader (NIP‑96/94)**
22. **EventInspector**
23. **SavedSearches**
24. **Drafts & Scheduled**

---

## 5. Component Spec Template (copy into `/docs/components/<Component>.md`)

````md
# <Component>

**Purpose**: What the user achieves with this component.

**Related NIPs**: e.g., 07, 10, 23/30023, 27, 46, 52, 94, 96

## API (Props)
```ts
export interface <Component>Props { /* props with types */ }
````

## States & UX

* Loading, Empty, Error, Populated
* Edge cases (no relays, auth missing, offline)

## Accessibility

* Keyboard, ARIA, focus, labels, live regions

## MVP

* Minimal hardcoded scenario (or mock) that demonstrates core behavior
* Live example under `/examples/app/<component>/page.tsx`

## Tests

* Unit (Vitest) + RTL
* E2E (Playwright) for the example page

## Extensions

* Optional features and integration points

## Code Snippets

* Minimal usage snippet and key hooks

````

---

## 6. Examples (MVP pages)

- Location: `/examples/app/<component>/page.tsx`
- Must include:
  - A self‑contained demo (mocked or live relay)  
  - A **Copy Code** button that copies the showcased usage API  
  - Link back to the spec doc
- Minimal Playwright test that loads the page, interacts once, asserts a visible outcome

Helper (client‑only):
```tsx
// components/CopyCodeButton.tsx
'use client'
import { Button } from "@/components/ui/button"
export function CopyCodeButton({ code }: { code: string }) {
  return <Button onClick={() => navigator.clipboard.writeText(code)}>Copy code</Button>
}
````

---

## 7. NIP Templates in `/templates`

Each NIP directory contains:

```
/templates/30023/
  schema.ts   # Zod schema for authorable fields
  form.tsx    # shadcn form which outputs a valid event
  render.tsx  # read‑only renderer for the event
```

Patterns:

* **toEvent / fromEvent** helpers colocated or in `/core/transform`
* Shared tag helpers in `/core/tags.ts`
* Validation errors surface via `Form` + `Toast`

---

## 8. Build & Tooling

* **Install**: `pnpm install` (preferred) or `npm ci`
* **Generate shadcn**: `npx shadcn@latest add button card dialog form ...`
* **Dev**: `pnpm dev`
* **Test**: `pnpm test` (unit) / `pnpm e2e` (Playwright)
* **Lint**: `pnpm lint` / `pnpm format`

CI checklist:

* Typecheck + Lint + Unit tests must pass
* Playwright runs headless on `/examples/app/*`
* Build must be tree‑shakable (no unused exports)

---

## 9. Contribution Checklist (for AGENTS)

### **🚀 Dual Implementation Strategy**

Every component must be implemented **twice** for maximum compatibility:

#### **Step 1: npm Package Component (Production)**
1. Create `/framework/react/components/<Component>.tsx` (headless, no styling dependencies)
2. Create `/framework/react/hooks/use<Component>.ts` if needed (state management)
3. Add exports to `/framework/react/index.ts`
4. Update `/framework/package.json` exports section

#### **Step 2: Examples Component (Development & Showcase)**
5. Create `/examples/components/nostr-ui/<Component>.tsx` (styled with shadcn/ui)
6. Add `/examples/app/<component>/page.tsx` with Copy‑Code button
7. Show **both** import methods in Copy-Code:
   ```tsx
   // 🚀 npm Package (Production):
   import { Component } from "@johappel/nostr-framework/react"
   
   // 🔧 Local Development:
   // import { Component } from "@/components/nostr-ui/Component"
   ```

#### **Step 3: Documentation & Testing**
8. Create `/docs/components/<Component>.md` from the template
9. Include **both** usage patterns in documentation
10. Write **unit tests** for logic and **e2e** for the example
11. Wire to design tokens & shadcn primitives (examples only)
12. Add story to CHANGELOG with breaking changes flagged
13. Request review; include screenshots/GIF of example

### **📦 npm Package Guidelines**

* **Headless Components**: No hardcoded styling; accept `components` prop
* **Zero Dependencies**: Don't import shadcn/ui or other styling libraries
* **Framework Agnostic**: Should work with any React setup (Next.js, Vite, CRA)
* **SSR Safe**: Handle `typeof window === 'undefined'` in hooks
* **TypeScript First**: Full type definitions with proper exports

### **🎨 Examples Guidelines**

* **Styled Components**: Use shadcn/ui + Tailwind CSS freely
* **Copy-Paste Ready**: Users should be able to copy entire component
* **Local Imports**: Use `@/` aliases for development convenience
* **Responsive Design**: Works on mobile and desktop
* **FOERBICO Theming**: Follow design system tokens

---

## 10. Quality Gates

* **Performance**: avoid N+1 subscriptions; dedupe on `id`; virtualization on large lists
* **Reliability**: relay backoff; `Promise.any` publish; offline cache working
* **Security**: keys never in LocalStorage plaintext; prefer Bunker (NIP‑46); CSP
* **A11y**: All interactive elements keyboard‑reachable; forms labelled
* **Docs**: API documented; examples compilable; copyable code

---

## 11. Roadmap (phased)

**Phase 1 (MVP)**: ConfigPanel, LoginSelector, LoginDialog, QueryBuilder, EventsList, EventForm(30023), RelayHealthBadge, EventInspector

**Phase 2**: UserProfile, UsersList, ThreadView, ContentLinkifier, LongformRenderer, MediaUploader (NIP‑96/94)

**Phase 3**: CalendarView (NIP‑52), Reactions, ZapButton, Chat, SavedSearches, Drafts & Scheduled

---

## 12. Appendix — Coding Standards

* Use TypeScript `strict` everywhere
* Never throw raw strings; use `Error` with codes
* Hooks prefix `use*`, no side‑effects inside render
* Avoid global singletons; accept `NostrConfig` via context/provider
* Keep components pure; data‑fetch via hooks in containers

---

## 13. Appendix — Import Patterns

### **🚀 Production (npm Package)**
```tsx
// Recommended for production apps
import { NostrConfigPanel, useNostrConfig } from "@johappel/nostr-framework/react"
import { EventForm30023 } from "@johappel/nostr-framework/react/components"
import { useEventSubmission } from "@johappel/nostr-framework/react/hooks"

// With custom UI library (headless mode)
import { Button } from "@mui/material"          // or any UI lib
import { Card } from "@chakra-ui/react"
import { Input } from "@headlessui/react"

export function App() {
  const { config, setConfig } = useNostrConfig()
  
  return (
    <NostrConfigPanel
      value={config}
      onChange={setConfig}
      components={{ Button, Card, Input }}  // Override styling
    />
  )
}
```

### **🔧 Development (Local Examples)**
```tsx
// Local development in examples/ folder
import { NostrConfigPanel } from "@/components/nostr-ui/NostrConfigPanel"
import { useNostrConfig } from "@/components/nostr-ui/useNostrConfig"
import { Button } from "@/components/ui/button"              // shadcn/ui
import { Card } from "@/components/ui/card"

export function App() {
  const { config, setConfig } = useNostrConfig()
  
  return (
    <NostrConfigPanel
      value={config}
      onChange={setConfig}
      // No components prop needed - styling built-in
    />
  )
}
```

### **📋 Copy-Code Template**
Every example page should show both patterns:
```tsx
const code = `// 🚀 npm Package Usage (Production):
import { Component } from "@johappel/nostr-framework/react"

// 🔧 Local Development Usage (Examples):
// import { Component } from "@/components/nostr-ui/Component"

export default function Demo() {
  return <Component />
}`
```

## 14. Appendix — Example Snippet (30023 Form minimal)

```tsx
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Input, Textarea, Button } from "@/components/ui"
import { publishEvent } from '@/lib/nostr/publish'
import { useNostr } from '@/lib/nostr/context'

const Schema = z.object({ title: z.string().min(3), content: z.string().min(10) })

export function EventForm30023() {
  const { cfg, signer } = useNostr()
  const mut = useMutation(async (data: z.infer<typeof Schema>) => {
    const unsigned = { kind: 30023, content: data.content, created_at: Math.floor(Date.now()/1000), tags: [["title", data.title]] }
    const signed = await signer.signEvent(unsigned)
    return publishEvent(cfg.relays, signed)
  })
  // ...render shadcn form; onSubmit => mut.mutate
  return (<Form>{/* ... */}<Button type="submit">Publish</Button></Form>)
}
```

## Windows Environment
As Windows user, ensure your development environment is set up correctly:
* Use Windows Terminal or Git Bash
* Ensure Node.js and pnpm are installed and in PATH
* Use PowerShell for commands