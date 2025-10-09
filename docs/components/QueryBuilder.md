# QueryBuilder

**Purpose**: Visual query builder for constructing Nostr filters with an intuitive UI. Users can build complex queries without writing JSON manually.

**Related NIPs**: 01 (Basic protocol), 50 (Search)

**Updated**: 2025-10-09

---

## API (Props)
```ts
export interface QueryBuilderProps {
  value?: NostrFilter[]
  onChange?: (filters: NostrFilter[]) => void
  onExecute?: (filters: NostrFilter[]) => void
  allowedKinds?: number[]
  maxFilters?: number
  showPreview?: boolean
  showExecuteButton?: boolean
  disabled?: boolean
  className?: string
  // Headless component override (framework version)
  components?: {
    Card?: React.ComponentType<any>
    Button?: React.ComponentType<any>
    Input?: React.ComponentType<any>
    Select?: React.ComponentType<any>
    Badge?: React.ComponentType<any>
    Textarea?: React.ComponentType<any>
  }
}

export interface NostrFilter {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  '#t'?: string[]
  '#d'?: string[]
  since?: number
  until?: number
  limit?: number
  search?: string
}
```

## States & UX
- Loading, Empty, Error, Populated
- Edge cases (offline, missing auth/relays, permissions)
- Visual feedback via shadcn/ui: `Alert`, `Toast`, `Skeleton`

## Accessibility
- Keyboard navigation
- ARIA roles/labels
- Focus management & reduced motion

## MVP
- Example page: `/examples/app/querybuilder/page.tsx`
- Demonstrates core behavior with mock or live data
- Includes a **Copy code** button and minimal instructions

## Tests
- **Unit**: logic, props surface
- **E2E (Playwright)**: load page, perform one core action, assert outcome

## Extensions
- Ideas for optional features and integration points

## Code Snippet
```tsx
import { QueryBuilder } from "@/components/nostr-ui/QueryBuilder"

export default function Demo() {
  return <QueryBuilder />
}
```

---

## Notes
Interactive filter composer for nostr-tools Filter[] (kinds/authors/#t/#d/time range/limit).
