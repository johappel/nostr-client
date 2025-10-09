# Nostr UI Components - npm Usage

## Installation

```bash
npm install @johappel/nostr-framework
```

## Usage

### Option 1: Framework React Components (Recommended)

```tsx
// ✅ Correct npm imports
import { NostrConfigPanel, useNostrConfig } from '@johappel/nostr-framework/react'
// or specific imports:
import { NostrConfigPanel } from '@johappel/nostr-framework/react/components'  
import { useNostrConfig } from '@johappel/nostr-framework/react/hooks'

function App() {
  const { config, setConfig } = useNostrConfig()

  return (
    <NostrConfigPanel
      value={config}
      onChange={setConfig}
      allowCustomAuth={true}
    />
  )
}
```

### Option 2: With Custom UI Components (e.g., shadcn/ui)

```tsx
import { NostrConfigPanel } from '@johappel/nostr-framework/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// ... other shadcn components

function App() {
  const { config, setConfig } = useNostrConfig()

  return (
    <NostrConfigPanel
      value={config}
      onChange={setConfig}
      components={{
        Button,
        Card,
        Input,
        // Override with your UI library components
      }}
    />
  )
}
```

### Option 3: Copy Example Implementation

For full control, copy the example implementation:

```bash
# Copy the shadcn/ui version from examples
curl -o src/components/NostrConfigPanel.tsx \
  https://raw.githubusercontent.com/johappel/nostr-client/main/examples/components/nostr-ui/NostrConfigPanel.tsx
```

## Package Structure

```
@johappel/nostr-framework/
├── index              # Core framework
├── react              # React components + hooks
├── react/components   # Individual components  
├── react/hooks        # Individual hooks
├── nextjs             # Next.js integration
└── config             # Configuration utilities
```

## Component Features

### NostrConfigPanel

- ✅ **Relay Configuration**: Add/remove relays, toggle read/write
- ✅ **Authentication**: NIP-07, NIP-46 Bunker, Local keys
- ✅ **Storage Plugins**: LocalStorage, SQLite WASM, SQLite File
- ✅ **Plugin Configuration**: Custom settings per storage type
- ✅ **Health Monitoring**: Real-time relay status
- ✅ **Headless/Styled**: Works with any UI library

### useNostrConfig Hook

- ✅ **Auto-persistence**: Saves to localStorage automatically
- ✅ **SSR-safe**: Works with Next.js and other SSR frameworks
- ✅ **Plugin Creation**: `createStoragePlugin()` helper
- ✅ **Import/Export**: JSON configuration management
- ✅ **Type-safe**: Full TypeScript support

## Example Projects

### Next.js + shadcn/ui
```bash
git clone https://github.com/johappel/nostr-client.git
cd nostr-client/examples
npm install && npm run dev
# Visit http://localhost:3000/nostrconfigpanel
```

### Vanilla React
```tsx
import { NostrConfigPanel, useNostrConfig } from '@johappel/nostr-framework/react'

// Uses default HTML elements (no styling framework required)
function SimpleApp() {
  const { config, setConfig } = useNostrConfig({
    relays: [{ url: 'wss://relay.damus.io', read: true, write: true }]
  })

  return <NostrConfigPanel value={config} onChange={setConfig} />
}
```

## Development vs Production

### During Development (examples/)
```tsx
// ❌ Local development only
import { NostrConfigPanel } from "@/components/nostr-ui/NostrConfigPanel"
```

### In Production (npm package)
```tsx
// ✅ Works in any project
import { NostrConfigPanel } from "@johappel/nostr-framework/react"
```

## Migration Guide

### From Examples to npm Package

1. **Replace imports:**
   ```tsx
   // Before
   import { NostrConfigPanel } from "@/components/nostr-ui/NostrConfigPanel"
   import { useNostrConfig } from "@/components/nostr-ui/useNostrConfig"
   
   // After  
   import { NostrConfigPanel, useNostrConfig } from "@johappel/nostr-framework/react"
   ```

2. **Install package:**
   ```bash
   npm install @johappel/nostr-framework
   ```

3. **Update component usage** (if using custom UI library):
   ```tsx
   <NostrConfigPanel
     value={config}
     onChange={setConfig}
     components={{
       Button: YourButton,
       Card: YourCard,
       Input: YourInput,
       // ... map your UI components
     }}
   />
   ```

## TypeScript Support

Full type definitions included:

```tsx
import type { 
  NostrConfig, 
  NostrConfigPanelProps, 
  RelayConfig 
} from '@johappel/nostr-framework/react'

const config: NostrConfig = {
  relays: [{ url: 'wss://relay.damus.io', read: true, write: true }],
  auth: { type: 'nip07' },
  storage: { 
    type: 'localStorage',
    config: { keyPrefix: 'my_app_', maxEvents: 1000 }
  }
}
```

## Framework Integration

### Next.js 13+ (App Router)
```tsx
'use client'
import { NostrConfigPanel, useNostrConfig } from '@johappel/nostr-framework/react'

export default function ConfigPage() {
  const { config, setConfig, isHydrated } = useNostrConfig()
  
  if (!isHydrated) return <div>Loading...</div>
  
  return <NostrConfigPanel value={config} onChange={setConfig} />
}
```

### Vite + React
```tsx
import { NostrConfigPanel, useNostrConfig } from '@johappel/nostr-framework/react'

function App() {
  const { config, setConfig } = useNostrConfig()
  return <NostrConfigPanel value={config} onChange={setConfig} />
}
```

### Create React App
```tsx
import { NostrConfigPanel, useNostrConfig } from '@johappel/nostr-framework/react'

function App() {
  const { config, setConfig } = useNostrConfig()
  return <NostrConfigPanel value={config} onChange={setConfig} />
}
```

---

**Ready for npm!** 🚀

The components are now properly structured for npm distribution with correct import paths.