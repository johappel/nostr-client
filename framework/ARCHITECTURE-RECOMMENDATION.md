// Empfohlene finale Architektur

/**
 * @johappel/nostr-framework
 * 
 * Haupt-Exports (TypeScript-basiert):
 * - NostrFramework (Core-Framework)
 * - EventBus, IdentityManager, etc. (Core-Module)
 * - Type-Definitionen
 */

/**
 * @johappel/nostr-framework/react
 * 
 * React-spezifische Hooks:
 * - useNostr() - Framework-Zugriff
 * - useNostrAuth() - Authentication
 * - useNostrPublish() - Event Publishing
 * - useNostrSubscribe() - Event Subscriptions
 */

/**
 * @johappel/nostr-framework/nextjs
 * 
 * Next.js-spezifische Komponenten:
 * - NostrProvider (SSR-kompatibel)
 * - useNostrSSR() - Server-Side Rendering
 * - NostrPageProps (Type für getServerSideProps)
 */

// Beispiel-Verwendung:

// 1. Vanilla TypeScript/JavaScript
import { NostrFramework } from '@johappel/nostr-framework';
const nostr = new NostrFramework({ relays: [...] });

// 2. React
import { useNostr, useNostrAuth } from '@johappel/nostr-framework/react';
const { framework } = useNostr();
const { authenticate } = useNostrAuth(framework);

// 3. Next.js
import { NostrProvider } from '@johappel/nostr-framework/nextjs';
<NostrProvider config={{ relays: [...] }}>
  <App />
</NostrProvider>