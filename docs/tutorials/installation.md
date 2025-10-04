# Installation Guide

This guide covers different ways to install and set up the Nostr Framework v1.1.0.

## Table of Contents

1. [NPM Installation](#npm-installation)
2. [CDN Installation](#cdn-installation)
3. [Development Setup](#development-setup)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Browser Support](#browser-support)
7. [Troubleshooting](#troubleshooting)

## NPM Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Install Package

```bash
npm install @johappel/nostr-framework@1.1.0
```

### Basic Setup

```javascript
import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework();
await nostr.initialize();

// Authenticate with NIP-07 extension
const identity = await nostr.authenticate('nip07');
console.log('Logged in:', identity.displayName || identity.npub);
```

### Individual Plugin Imports

```javascript
// Import specific plugins
import { Nip07Plugin } from '@johappel/nostr-framework/plugins/auth/Nip07Plugin.js';
import { Nip46Plugin } from '@johappel/nostr-framework/plugins/auth/Nip46Plugin.js';
import { NsecPlugin } from '@johappel/nostr-framework/plugins/auth/NsecPlugin.js';

// Import configuration
import { Config } from '@johappel/nostr-framework/config.js';
```

## CDN Installation

### Official CDN (jsDelivr)

```html
<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
  
  const nostr = new NostrFramework();
  await nostr.initialize();
  
  const identity = await nostr.authenticate('nip07');
  console.log('Hello Nostr!', identity.displayName);
</script>
```

### Alternative CDNs

```html
<!-- unpkg -->
<script type="module">
  import { NostrFramework } from 'https://unpkg.com/@johappel/nostr-framework/framework/index.js';
</script>

<!-- skypack -->
<script type="module">
  import { NostrFramework } from 'https://cdn.skypack.dev/@johappel/nostr-framework/framework/index.js';
</script>
```

### CDN with Configuration

```html
<script>
  // Configure before importing
  window.NostrConfig = {
    relays: ['wss://relay.damus.io', 'wss://nos.lol'],
    metadataCacheDuration: 1800000 // 30 minutes
  };
</script>

<script type="module">
  import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
  
  const nostr = new NostrFramework();
  await nostr.initialize();
</script>
```

## Development Setup

### Clone Repository

```bash
git clone https://github.com/johappel/nostr-client.git
cd nostr-client
```

### Install Dependencies

```bash
npm install
```

This will install:
- `nostr-tools` (v2.8.1) - For NIP-19 encoding/decoding and other Nostr utilities

### Development Server

Use VS Code Live Server or any other local web server:

```bash
# VS Code: Right-click on HTML file → "Open with Live Server"
# Or use another server, e.g.:
npx serve .
# Or Python 3:
python -m http.server 8000
```

## Configuration

### Default Configuration (v1.1.0)

The framework comes with optimized defaults:

```javascript
const defaultConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nostr.wine',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ],
  nostrToolsBaseUrl: 'https://cdn.jsdelivr.net/npm/nostr-tools@2.8.1',
  metadataCacheDuration: 3600000, // 1 hour
  connectionTimeout: 10000,        // 10 seconds
  maxRetries: 3                    // Connection retries
};
```

### Custom Configuration

You can override defaults by passing options:

```javascript
const nostr = new NostrFramework({
    relays: ['wss://my-relay.com'],
    metadataCacheDuration: 1800000, // 30 minutes
    connectionTimeout: 15000        // 15 seconds
});
```

### Global Configuration

For global configuration, define before importing:

```javascript
window.NostrConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ],
  nostrToolsBaseUrl: 'https://cdn.example.com/nostr-tools@2.8.1',
  metadataCacheDuration: 1800000
};

import { NostrFramework } from '@johappel/nostr-framework';
```

### Configuration File

Create a `config.example.html` file for your project:

```html
<script>
  window.NostrConfig = {
    relays: [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://nos.lol'
    ],
    metadataCacheDuration: 1800000,
    nostrToolsBaseUrl: 'https://cdn.jsdelivr.net/npm/nostr-tools@2.8.1'
  };
</script>
```

## Testing

### Live Tests (Browser)

Open these test files directly in your browser:

- **NIP-07 Tests**: [test-nip07.html](../../test-nip07.html)
- **NIP-46 Tests**: [test-nip46.html](../../test-nip46.html)
- **NSEC Tests**: [test-nsec.html](../../test-nsec.html)
- **Relay Tests**: [test-relay.html](../../test-relay.html)
- **Storage Tests**: [test-storage.html](../../test-storage.html)

### Automated Testing

```javascript
// In browser console
import { runEventBusTests } from './framework/core/EventBus.test.js';
import { runIdentityManagerTests } from './framework/core/IdentityManager.test.js';

const results1 = runEventBusTests();
const results2 = await runIdentityManagerTests();

console.table(results1.tests);
console.table(results2.tests);
```

### Test Key Generation (⚠️ Unsafe)

```javascript
import { NsecPlugin } from '@johappel/nostr-framework/plugins/auth/NsecPlugin.js';

// Generate test keys (FOR TESTING ONLY!)
const testKey = await NsecPlugin.generateTestKey();
console.log('Test nsec:', testKey.nsec);
console.log('Test npub:', testKey.npub);
```

## Browser Support

The framework supports all modern browsers that support:
- ES6 Modules
- Async/await
- WebSocket API
- localStorage
- Crypto API

### Supported Browsers

- ✅ Chrome 61+
- ✅ Firefox 60+
- ✅ Safari 10.1+
- ✅ Edge 16+

### Required Browser Features

- **ES6 Modules**: For module imports
- **WebSocket API**: For relay connections
- **Crypto API**: For encryption operations
- **localStorage**: For session persistence
- **Async/await**: For asynchronous operations

## Troubleshooting

### Common Issues

#### Module Import Errors

Ensure you're using ES6 modules:

```html
<script type="module">
  // Your code here
</script>
```

#### CORS Issues

When using CDN, make sure your server serves files with proper CORS headers.

#### WebSocket Connection Issues

Some relays might be temporarily unavailable. The framework will automatically try alternative relays.

#### NIP-07 Extension Not Detected

Make sure you have a NIP-07 extension installed:
- [Alby](https://getalby.com)
- [nos2x](https://github.com/fiatjaf/nos2x)
- [Flamingo](https://www.flamingo.me)

#### Metadata Not Loading

Check if relays are accessible and if the user has a kind 0 event:

```javascript
// Enable debug mode
const nostr = new NostrFramework();
nostr.setDebugMode(true);

// Check metadata manually
const identity = await nostr.authenticate('nip07');
console.log('Metadata:', identity.metadata);
```

### Debug Mode

Enable debug mode for detailed logging:

```javascript
const nostr = new NostrFramework();
nostr.setDebugMode(true);

// Or enable globally
window.NostrConfig = { debug: true };
```

### Version Compatibility

- **v1.1.0**: Current stable version with metadata support
- **v1.0.x**: Legacy versions without metadata fetching

## Project Setup Examples

### Basic HTML Application

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nostr Framework Demo</title>
</head>
<body>
    <div id="app">
        <h1>Nostr Framework v1.1.0</h1>
        <button id="loginBtn">Login with NIP-07</button>
        <div id="output"></div>
    </div>
    
    <script type="module">
        import { NostrFramework } from 'https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js';
        
        const nostr = new NostrFramework();
        await nostr.initialize();
        
        document.getElementById('loginBtn').onclick = async () => {
            try {
                const identity = await nostr.authenticate('nip07');
                document.getElementById('output').innerHTML = `
                    <h3>Logged in as: ${identity.displayName || identity.npub}</h3>
                    <p>Provider: ${identity.provider}</p>
                    <p>Metadata: ${JSON.stringify(identity.metadata, null, 2)}</p>
                `;
            } catch (error) {
                console.error('Login failed:', error);
            }
        };
    </script>
</body>
</html>
```

### Vite Project

```bash
# Create new project
npm create vite@latest my-nostr-app -- --template vanilla
cd my-nostr-app

# Install dependencies
npm install

# Add Nostr Framework
npm install @johappel/nostr-framework
```

```javascript
// main.js
import { NostrFramework } from '@johappel/nostr-framework';

const nostr = new NostrFramework();
await nostr.initialize();

// Test different auth methods
console.log('Testing NIP-07...');
try {
    const identity1 = await nostr.authenticate('nip07');
    console.log('NIP-07 Success:', identity1.displayName);
} catch (error) {
    console.log('NIP-07 failed:', error.message);
}

// Test NSEC (unsafe, for testing only)
try {
    const { NsecPlugin } = await import('@johappel/nostr-framework/plugins/auth/NsecPlugin.js');
    const testKey = await NsecPlugin.generateTestKey();
    const identity2 = await nostr.authenticate('nsec', { nsec: testKey.nsec });
    console.log('NSEC Test Success:', identity2.displayName);
} catch (error) {
    console.log('NSEC test failed:', error.message);
}
```

### React Application

```bash
# Create React app
npx create-react-app my-nostr-react-app
cd my-nostr-react-app

# Install Nostr Framework
npm install @johappel/nostr-framework
```

```javascript
// hooks/useNostr.js
import { useState, useEffect } from 'react';
import { NostrFramework } from '@johappel/nostr-framework';

export function useNostr() {
    const [nostr, setNostr] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [identity, setIdentity] = useState(null);
    
    useEffect(() => {
        const initNostr = async () => {
            const nostrInstance = new NostrFramework();
            await nostrInstance.initialize();
            setNostr(nostrInstance);
            setIsInitialized(true);
        };
        
        initNostr();
    }, []);
    
    const login = async (provider = 'nip07', credentials = {}) => {
        if (!nostr) return;
        try {
            const identity = await nostr.authenticate(provider, credentials);
            setIdentity(identity);
            return identity;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };
    
    const logout = async () => {
        if (!nostr) return;
        try {
            await nostr.logout();
            setIdentity(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };
    
    return { nostr, isInitialized, identity, login, logout };
}
```

```javascript
// components/NostrAuth.js
import { useNostr } from '../hooks/useNostr';

function NostrAuth() {
    const { nostr, isInitialized, identity, login, logout } = useNostr();
    
    if (!isInitialized) {
        return <div>Initializing Nostr Framework...</div>;
    }
    
    return (
        <div>
            {identity ? (
                <div>
                    <h3>Logged in as: {identity.displayName || identity.npub}</h3>
                    <p>Provider: {identity.provider}</p>
                    <button onClick={logout}>Logout</button>
                </div>
            ) : (
                <div>
                    <button onClick={() => login('nip07')}>
                        Login with NIP-07 Extension
                    </button>
                    <button onClick={() => {
                        // Generate test key (unsafe)
                        import('@johappel/nostr-framework/plugins/auth/NsecPlugin.js').then(({ NsecPlugin }) => {
                            NsecPlugin.generateTestKey().then(testKey => {
                                login('nsec', { nsec: testKey.nsec });
                            });
                        });
                    }}>
                        Login with Test Key (⚠️ Unsafe)
                    </button>
                </div>
            )}
        </div>
    );
}

export default NostrAuth;
```

## Next Steps

After installation, check out these guides:

- [Quick Start](quick-start.md)
- [Configuration](config.md)
- [API Reference](../api/README.md)
- [Auth Plugins](../api/plugins/AuthPlugin.md)

## Package Information

- **Package**: `@johappel/nostr-framework`
- **Version**: 1.1.1
- **License**: MIT
- **Repository**: https://github.com/johappel/nostr-client
- **CDN**: https://cdn.jsdelivr.net/npm/@johappel/nostr-framework/framework/index.js

## Support

For installation issues:

1. Check the [FAQ](../faq.md)
2. Search [existing issues](https://github.com/johappel/nostr-client/issues)
3. Create a [new issue](https://github.com/johappel/nostr-client/issues/new)
4. Join the [community discussion](https://github.com/johappel/nostr-client/discussions)