# ZapButton

**Purpose**: Describe what users can accomplish with **ZapButton** in the Nostr UI kit.

**Related NIPs**: (adjust as needed) 07, 10, 11, 23/30023, 27, 46, 52, 94, 96

**Updated**: 2025-10-09

---

## API (Props)
```ts
// Replace with precise props for ZapButton
export interface ZapButtonProps {
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
- Example page: `/examples/zapbutton/page.tsx`
- Demonstrates core behavior with mock or live data
- Includes a **Copy code** button and minimal instructions

## Tests
- **Unit**: logic, props surface
- **E2E (Playwright)**: load page, perform one core action, assert outcome

## Extensions
- Ideas for optional features and integration points

## Code Snippet
```tsx
import { ZapButton } from "@/components/nostr-ui/ZapButton"

export default function Demo() {
  return <ZapButton />
}
```

---

## Notes
LUD-16/LUD-06 support; show invoice flow or external wallet deep link.
