# @johappel/nostr-framework

Modular Nostr Client Framework with TypeScript support.

## Installation

```bash
npm install @johappel/nostr-framework
```

## Quick Start

```typescript
import { NostrFramework, FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io', 'wss://relay.snort.social'],
  debug: process.env.NODE_ENV === 'development'
};

const framework = new NostrFramework(config);
await framework.initialize();

// Use the framework
const identity = await framework.identity.authenticate('nip07');
console.log('Authenticated as:', identity.displayName || identity.npub);
```

## Features

- ✅ **TypeScript Support** - Full type safety and IntelliSense
- ✅ **EventBus** - Decoupled event system
- ✅ **Identity Management** - NIP-07, NIP-46 authentication
- ✅ **Relay Management** - Multi-relay support with auto-failover
- ✅ **Template System** - Structured event creation
- ✅ **Storage Integration** - Local event storage
- ✅ **Plugin Architecture** - Extensible design

## API Reference

### Core Classes

- `NostrFramework` - Main framework class
- `EventBus` - Event system
- `IdentityManager` - Authentication management
- `RelayManager` - Relay operations
- `SignerManager` - Event signing
- `StorageManager` - Local storage
- `TemplateEngine` - Event templates

### Configuration

```typescript
interface FrameworkConfig {
  relays?: string[];
  nostrToolsBaseUrl?: string;
  metadataCacheDuration?: number;
  relayTimeout?: number;
  maxCacheSize?: number;
  debug?: boolean;
  standardTemplates?: boolean;
  storage?: StorageConfig;
}
```

## Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Nostr App</title>
</head>
<body>
  <div id="app">
    <button id="login">Login with Extension</button>
    <div id="status"></div>
  </div>

  <script type="module">
    import { NostrFramework } from 'https://esm.sh/@johappel/nostr-framework';

    const framework = new NostrFramework({
      relays: ['wss://relay.damus.io'],
      debug: true
    });

    await framework.initialize();

    // Setup UI
    const loginBtn = document.getElementById('login');
    const status = document.getElementById('status');

    loginBtn.addEventListener('click', async () => {
      try {
        const identity = await framework.identity.authenticate('nip07');
        status.textContent = `Connected: ${identity.displayName || identity.npub}`;
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
      }
    });
  </script>
</body>
</html>
```

## Next.js Usage

```typescript
// pages/nostr.tsx
import { NostrFramework, FrameworkConfig } from '@johappel/nostr-framework';

export default function NostrPage() {
  const [framework, setFramework] = useState<NostrFramework | null>(null);

  useEffect(() => {
    const initFramework = async () => {
      const fw = new NostrFramework({
        relays: ['wss://relay.damus.io'],
        debug: process.env.NODE_ENV === 'development'
      });

      await fw.initialize();
      setFramework(fw);
    };

    initFramework();
  }, []);

  return (
    <div>
      <h1>Nostr Framework Example</h1>
      {framework && <p>Framework initialized successfully!</p>}
    </div>
  );
}
```

## License

MIT © johappel