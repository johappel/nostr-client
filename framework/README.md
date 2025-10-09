# @johappel/nostr-framework

Modular Nostr Client Framework with full TypeScript support and comprehensive type safety.

## Installation

```bash
# Install the framework
npm install @johappel/nostr-framework

# Install required peer dependency
npm install nostr-tools@^2.8.1
```

## Quick Start

```typescript
import { NostrFramework, type FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io', 'wss://relay.snort.social'],
  debug: process.env.NODE_ENV === 'development'
};

const framework = new NostrFramework(config);
await framework.initialize();

// Use the framework with full type safety
const identity = await framework.identity.authenticate('nip07');
console.log('Authenticated as:', identity.displayName || identity.npub);
```

## Features

- ✅ **Full TypeScript Support** - Complete type safety and IntelliSense
- ✅ **Typed EventBus** - Decoupled event system with type-safe events
- ✅ **Identity Management** - NIP-07, NIP-46 authentication with typed interfaces
- ✅ **Relay Management** - Multi-relay support with auto-failover and connection pooling
- ✅ **Template System** - Structured event creation with schema validation
- ✅ **Storage Integration** - Plugin-based local event storage
- ✅ **Plugin Architecture** - Extensible design with TypeScript interfaces
- ✅ **Framework Events** - Comprehensive event system for all subsystems
- ✅ **Type Definitions** - Extensive TypeScript definitions for Nostr protocols

## API Reference

### Core Classes (TypeScript)

- `NostrFramework` - Main framework orchestrator with typed configuration
- `EventBus` - Type-safe event system with framework events
- `IdentityManager` - Authentication management with typed identities
- `RelayManager` - Relay operations with connection pooling and status tracking
- `EventManager` - Event creation and publishing with template integration
- `SignerManager` - Event signing with capability-based interfaces
- `StorageManager` - Plugin-based local storage with typed adapters
- `TemplateEngine` - Event templates with schema validation

### Configuration

```typescript
interface FrameworkConfig {
  relays?: string[];                    // Array of relay URLs
  nostrToolsBaseUrl?: string;          // Base URL for nostr-tools CDN
  metadataCacheDuration?: number;      // Metadata cache duration in ms
  relayTimeout?: number;               // Relay connection timeout
  maxCacheSize?: number;               // Maximum cache size
  debug?: boolean;                     // Enable debug mode
  standardTemplates?: boolean;         // Register standard templates
  storage?: StorageConfig;             // Storage configuration
}

interface StorageConfig {
  type: 'localStorage' | 'indexedDB' | 'sqlite';
  config?: any;
}

// Complete type definitions available in framework/types/index.ts
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
import { NostrFramework, type FrameworkConfig, type Identity } from '@johappel/nostr-framework';
import { useState, useEffect } from 'react';

export default function NostrPage() {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    const initFramework = async () => {
      const config: FrameworkConfig = {
        relays: ['wss://relay.damus.io'],
        debug: process.env.NODE_ENV === 'development'
      };

      const fw = new NostrFramework(config);
      await fw.initialize();

      // Listen for identity changes
      fw.on('identity:changed', (newIdentity: Identity | null) => {
        setIdentity(newIdentity);
      });

      setFramework(fw);
    };

    initFramework();
  }, []);

  const handleLogin = async () => {
    if (framework) {
      try {
        const userIdentity = await framework.identity.authenticate('nip07');
        console.log('Logged in:', userIdentity.displayName || userIdentity.npub);
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  return (
    <div>
      <h1>Nostr Framework Example</h1>
      {framework && <p>Framework initialized successfully!</p>}
      {identity ? (
        <p>Welcome, {identity.displayName || identity.npub}!</p>
      ) : (
        <button onClick={handleLogin}>Login with Extension</button>
      )}
    </div>
  );
}
```

## License

MIT © johappel