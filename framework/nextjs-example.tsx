// framework/nextjs-example.tsx
// Beispiel für die Verwendung des Nostr Frameworks in Next.js mit TypeScript

import React, { useEffect, useState } from 'react';
import {
  NostrFramework,
  FrameworkConfig,
  Identity,
  EventBus,
  IdentityManager
} from '@johappel/nostr-framework';

interface NostrProviderProps {
  children: React.ReactNode;
  config?: FrameworkConfig;
}

interface NostrContextType {
  framework: NostrFramework | null;
  isInitialized: boolean;
  currentIdentity: Identity | null;
  isAuthenticated: boolean;
  eventBus: EventBus | null;
  identityManager: IdentityManager | null;
}

export const NostrContext = React.createContext<NostrContextType>({
  framework: null,
  isInitialized: false,
  currentIdentity: null,
  isAuthenticated: false,
  eventBus: null,
  identityManager: null,
});

export function NostrProvider({ children, config }: NostrProviderProps) {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);

  // Standardkonfiguration für Next.js
  const defaultConfig: FrameworkConfig = {
    relays: [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://nostr.wine',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ],
    debug: process.env.NODE_ENV === 'development',
    standardTemplates: true,
    ...config
  };

  useEffect(() => {
    let mounted = true;

    const initializeFramework = async () => {
      try {
        console.log('[NostrProvider] Initializing framework...');

        const fw = new NostrFramework(defaultConfig);

        // Event-Listener für Identity-Änderungen
        fw.on('identity:changed', (identity: Identity | null) => {
          if (mounted) {
            setCurrentIdentity(identity);
            console.log('[NostrProvider] Identity changed:', identity?.displayName || identity?.npub || 'None');
          }
        });

        await fw.initialize();

        if (mounted) {
          setFramework(fw);
          setIsInitialized(true);
          console.log('[NostrProvider] Framework initialized successfully');
        }
      } catch (error) {
        console.error('[NostrProvider] Failed to initialize framework:', error);
      }
    };

    initializeFramework();

    // Cleanup
    return () => {
      mounted = false;
      if (framework) {
        framework.destroy().catch(console.error);
      }
    };
  }, [config]);

  const contextValue: NostrContextType = {
    framework,
    isInitialized,
    currentIdentity,
    isAuthenticated: currentIdentity !== null,
    eventBus: framework?.getEventBus() || null,
    identityManager: framework?.identity || null,
  };

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
}

// Custom Hook für einfache Framework-Nutzung
export function useNostrFramework() {
  const context = React.useContext(NostrContext);

  if (!context) {
    throw new Error('useNostrFramework must be used within a NostrProvider');
  }

  return context;
}

// Beispiel-Komponente für Authentifizierung
export function NostrAuthButton() {
  const { identityManager, isAuthenticated, currentIdentity } = useNostrFramework();

  const handleLogin = async () => {
    if (!identityManager) return;

    try {
      // NIP-07 Browser Extension verwenden
      await identityManager.authenticate('nip07');
    } catch (error) {
      console.error('Login failed:', error);

      // Fallback auf andere Auth-Methoden
      const availablePlugins = await identityManager.getAvailablePlugins();
      console.log('Available auth methods:', availablePlugins);
    }
  };

  const handleLogout = async () => {
    if (!identityManager) return;

    try {
      await identityManager.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <button onClick={handleLogin} className="nostr-login-btn">
        Mit Nostr anmelden
      </button>
    );
  }

  return (
    <div className="nostr-user-info">
      <img
        src={currentIdentity?.metadata?.picture}
        alt={currentIdentity?.displayName || 'User'}
        className="user-avatar"
      />
      <span className="user-name">
        {currentIdentity?.displayName || 'Nostr User'}
      </span>
      <button onClick={handleLogout} className="logout-btn">
        Abmelden
      </button>
    </div>
  );
}

// Beispiel für Event-Erstellung
export function NostrEventComposer() {
  const { framework, isAuthenticated } = useNostrFramework();
  const [content, setContent] = useState('');

  const handlePublishNote = async () => {
    if (!framework || !isAuthenticated || !content.trim()) return;

    try {
      // Einfacher Text-Post (Kind 1)
      const eventData = {
        kind: 1,
        content: content.trim(),
        tags: []
      };

      // Event erstellen und signieren
      const unsignedEvent = framework.templates.build('nip01-note', eventData);

      // Signieren mit dem aktuellen Signer
      const signedEvent = await framework.signer.signEvent(unsignedEvent);

      // An Relays senden
      await framework.events.publish(signedEvent);

      console.log('Note published successfully!');
      setContent('');

    } catch (error) {
      console.error('Failed to publish note:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="composer-disabled">
        Bitte melden Sie sich an, um Posts zu verfassen
      </div>
    );
  }

  return (
    <div className="event-composer">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Schreiben Sie Ihre Nachricht..."
        maxLength={280}
      />
      <div className="composer-actions">
        <span className="char-count">{content.length}/280</span>
        <button
          onClick={handlePublishNote}
          disabled={!content.trim()}
          className="publish-btn"
        >
          Veröffentlichen
        </button>
      </div>
    </div>
  );
}

// Hauptseite-Beispiel
export default function NostrPage() {
  return (
    <NostrProvider>
      <div className="nostr-app">
        <header className="app-header">
          <h1>Meine Nostr App</h1>
          <NostrAuthButton />
        </header>

        <main className="app-main">
          <NostrEventComposer />

          <div className="app-content">
            {/* Hier können Sie weitere Nostr-Komponenten hinzufügen */}
            <p>
              Willkommen in Ihrer dezentralen Social Media App!
              Das Framework läuft mit voller TypeScript-Unterstützung.
            </p>
          </div>
        </main>
      </div>
    </NostrProvider>
  );
}