# EventInspector

**Purpose**: Describe what users can accomplish with **EventInspector** in the Nostr UI kit.

**Related NIPs**: (adjust as needed) 07, 10, 11, 23/30023, 27, 46, 52, 94, 96

**Updated**: 2025-10-09

---

## API (Props)
```ts
// Replace with precise props for EventInspector
export interface EventInspectorProps {
  className?: string
  // ...
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
- Example page: `/examples/eventinspector/page.tsx`
- Demonstrates core behavior with mock or live data
- Includes a **Copy code** button and minimal instructions

## Tests
- **Unit**: logic, props surface
- **E2E (Playwright)**: load page, perform one core action, assert outcome

## Extensions
- Ideas for optional features and integration points

## Code Snippet
```tsx
import { EventInspector } from "@/components/nostr-ui/EventInspector"

export default function Demo() {
  return <EventInspector />
}
```

---

## Notes
Display raw JSON, verify signature, relay acks, and derived fields (e.g., naddr).
