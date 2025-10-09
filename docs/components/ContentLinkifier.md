# ContentLinkifier

**Purpose**: Describe what users can accomplish with **ContentLinkifier** in the Nostr UI kit.

**Related NIPs**: (adjust as needed) 07, 10, 11, 23/30023, 27, 46, 52, 94, 96

**Updated**: 2025-10-09

---

## API (Props)
```ts
// Replace with precise props for ContentLinkifier
export interface ContentLinkifierProps {
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
- Example page: `/examples/contentlinkifier/page.tsx`
- Demonstrates core behavior with mock or live data
- Includes a **Copy code** button and minimal instructions

## Tests
- **Unit**: logic, props surface
- **E2E (Playwright)**: load page, perform one core action, assert outcome

## Extensions
- Ideas for optional features and integration points

## Code Snippet
```tsx
import { ContentLinkifier } from "@/components/nostr-ui/ContentLinkifier"

export default function Demo() {
  return <ContentLinkifier />
}
```

---

## Notes
Detect and decorate nostr bech32 refs (npub, naddr, nevent) & standard URLs (NIP-27).
