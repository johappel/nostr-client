# UserProfile

**Purpose**: Describe what users can accomplish with **UserProfile** in the Nostr UI kit.

**Related NIPs**: (adjust as needed) 07, 10, 11, 23/30023, 27, 46, 52, 94, 96

**Updated**: 2025-10-09

---

## API (Props)
```ts
export interface UserProfileProps {
  pubkey?: string
  relays?: string[]
  className?: string
  // Display options
  showEditButton?: boolean
  showCopyButton?: boolean
  showRefreshButton?: boolean
  showStats?: boolean
  compact?: boolean
  // Event handlers
  onProfileUpdate?: (profile: UserProfile) => void
  onProfileLoad?: (profile: UserProfile | null) => void
  onError?: (error: string) => void
  // Custom rendering
  renderHeader?: (profile: UserProfile | null) => React.ReactNode
  renderContent?: (profile: UserProfile | null) => React.ReactNode
  renderActions?: (profile: UserProfile | null) => React.ReactNode
}

export interface UserProfile {
  pubkey: string
  name?: string
  displayName?: string
  about?: string
  picture?: string
  banner?: string
  nip05?: string
  lud16?: string
  createdAt?: number
  updatedAt?: number
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
- Example page: `/examples/app/userprofile/page.tsx`
- Demonstrates core behavior with mock or live data
- Includes a **Copy code** button and minimal instructions

## Tests
- **Unit**: logic, props surface
- **E2E (Playwright)**: load page, perform one core action, assert outcome

## Hooks

### useUserProfile
```tsx
import { useUserProfile } from "@/components/nostr-ui/useUserProfile"

function MyComponent() {
  const {
    profile,
    isLoading,
    error,
    isUpdating,
    refresh,
    updateProfile,
    clearError
  } = useUserProfile({
    pubkey: "npub1...",
    relays: ['wss://relay.damus.io'],
    autoLoad: true,
    live: true
  })

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {profile && (
        <div>
          <h1>{profile.displayName || profile.name}</h1>
          <p>{profile.about}</p>
        </div>
      )}
    </div>
  )
}
```

## Extensions
- Avatar/banner upload via NIP-96/94
- NIP-05 verification status
- Lightning address validation
- Profile completion score
- Social links (Twitter, GitHub, etc.)
- Follow/follower counts
- Profile backup/restore
- Multi-language support
- Theme customization

## Code Snippet
```tsx
import { UserProfile } from "@/components/nostr-ui/UserProfile"

export default function Demo() {
  return (
    <UserProfile
      pubkey="npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft"
      relays={['wss://relay.damus.io', 'wss://nos.lol']}
      showEditButton={true}
      showCopyButton={true}
      showRefreshButton={true}
      showStats={true}
      onProfileUpdate={(profile) => console.log('Profile updated:', profile)}
      onProfileLoad={(profile) => console.log('Profile loaded:', profile)}
      onError={(error) => console.error('Profile error:', error)}
    />
  )
}
```

## Usage Examples

### Basic Usage
```tsx
import { UserProfile } from "@/components/nostr-ui/UserProfile"

export default function App() {
  return <UserProfile pubkey="npub1..." />
}
```

### Framework (npm package)
```tsx
import { UserProfile } from "@johappel/nostr-framework/react"

export default function App() {
  return (
    <UserProfile
      pubkey="npub1..."
      components={{
        Container: ({ children }) => <div className="custom-profile">{children}</div>,
        Header: ({ profile, onRefresh }) => <CustomHeader profile={profile} onRefresh={onRefresh} />
      }}
    />
  )
}
```

### Compact Mode
```tsx
import { UserProfile } from "@/components/nostr-ui/UserProfile"

export default function UserList({ users }) {
  return (
    <div>
      {users.map(pubkey => (
        <UserProfile
          key={pubkey}
          pubkey={pubkey}
          compact={true}
          showEditButton={false}
          showCopyButton={false}
        />
      ))}
    </div>
  )
}
```

---

## Notes
Reads & writes kind:0. Support avatar/banner upload (optionally via NIP-96/94).
