// framework/nextjs/index.tsx
// Next.js-spezifische Komponenten und Hooks

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NostrFramework } from '../index.js';
import type { FrameworkConfig, Identity } from '../types/index.js';

/**
 * Next.js Context für das Nostr Framework
 */
interface NostrContextType {
  framework: NostrFramework | null;
  isInitialized: boolean;
  isLoading: boolean;
  currentIdentity: Identity | null;
  isAuthenticated: boolean;
  error: Error | null;
  connect: (provider?: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const NostrContext = createContext<NostrContextType | null>(null);

/**
 * Next.js Provider für das Nostr Framework
 */
interface NostrProviderProps {
  children: ReactNode;
  config?: FrameworkConfig;
  autoConnect?: boolean;
}

export function NostrProvider({ 
  children, 
  config = {}, 
  autoConnect = false 
}: NostrProviderProps) {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Framework initialisieren
  useEffect(() => {
    const initFramework = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const nostr = new NostrFramework({
          relays: config.relays || [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.snort.social'
          ],
          ...config
        });

        // Event Listener
        nostr.on('identity:loaded', (identity: Identity) => {
          setCurrentIdentity(identity);
        });

        nostr.on('identity:cleared', () => {
          setCurrentIdentity(null);
        });

        await nostr.initialize();
        setFramework(nostr);
        setIsInitialized(true);

        // Auto-connect wenn gewünscht
        if (autoConnect) {
          try {
            const savedIdentity = await nostr.identity.loadSavedIdentity();
            if (savedIdentity) {
              setCurrentIdentity(savedIdentity);
            }
          } catch (err) {
            console.warn('Auto-connect failed:', err);
          }
        }

      } catch (err) {
        console.error('Framework initialization failed:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initFramework();

    return () => {
      framework?.destroy?.();
    };
  }, []);

  const connect = async (provider = 'nip07') => {
    if (!framework) throw new Error('Framework not initialized');
    
    try {
      const identity = await framework.identity.authenticate(provider);
      setCurrentIdentity(identity);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const disconnect = async () => {
    if (!framework) return;
    
    try {
      await framework.identity.clearIdentity();
      setCurrentIdentity(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const contextValue: NostrContextType = {
    framework,
    isInitialized,
    isLoading,
    currentIdentity,
    isAuthenticated: !!currentIdentity,
    error,
    connect,
    disconnect,
  };

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
}

/**
 * Hook für den Zugriff auf das Nostr Framework in Next.js
 */
export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}

/**
 * Hook für Nostr Events Publishing
 */
export function useNostrPublish() {
  const { framework, isAuthenticated } = useNostr();
  const [isPublishing, setIsPublishing] = useState(false);

  const publishNote = async (content: string, tags: string[][] = []) => {
    if (!framework || !isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setIsPublishing(true);
    try {
      const event = await framework.events.createEvent({
        kind: 1,
        content,
        tags,
      });
      
      const signedEvent = await framework.signer.signEvent(event);
      await framework.relay.publishEvent(signedEvent);
      
      return signedEvent;
    } finally {
      setIsPublishing(false);
    }
  };

  const publishEvent = async (eventData: any) => {
    if (!framework || !isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setIsPublishing(true);
    try {
      const event = await framework.events.createEvent(eventData);
      const signedEvent = await framework.signer.signEvent(event);
      await framework.relay.publishEvent(signedEvent);
      
      return signedEvent;
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    publishNote,
    publishEvent,
    isPublishing,
    canPublish: isAuthenticated,
  };
}

/**
 * Hook für Nostr Event Subscriptions
 */
export function useNostrEvents(filters: any[], enabled = true) {
  const { framework, isInitialized } = useNostr();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!framework || !isInitialized || !enabled || !filters.length) {
      return;
    }

    setIsLoading(true);
    let subscription: any;

    const startSubscription = async () => {
      try {
        subscription = await framework.relay.subscribe(filters);
        
        subscription.on('event', (event: any) => {
          setEvents(prev => {
            // Deduplizierung
            if (prev.some(e => e.id === event.id)) {
              return prev;
            }
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        });

        subscription.on('eose', () => {
          setIsLoading(false);
        });

      } catch (err) {
        console.error('Subscription failed:', err);
        setIsLoading(false);
      }
    };

    startSubscription();

    return () => {
      subscription?.close?.();
    };
  }, [framework, isInitialized, enabled, JSON.stringify(filters)]);

  return { events, isLoading };
}

/**
 * Hook für User Profile Management
 */
export function useNostrProfile(pubkey?: string) {
  const { framework, currentIdentity } = useNostr();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const targetPubkey = pubkey || currentIdentity?.pubkey;

  useEffect(() => {
    if (!framework || !targetPubkey) return;

    setIsLoading(true);
    
    const loadProfile = async () => {
      try {
        const profileData = await framework.identity.fetchProfile(targetPubkey);
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [framework, targetPubkey]);

  const updateProfile = async (profileData: any) => {
    if (!framework || !currentIdentity) {
      throw new Error('Not authenticated');
    }

    const event = await framework.events.createEvent({
      kind: 0,
      content: JSON.stringify(profileData),
      tags: [],
    });

    const signedEvent = await framework.signer.signEvent(event);
    await framework.relay.publishEvent(signedEvent);

    setProfile(profileData);
    return signedEvent;
  };

  return {
    profile,
    isLoading,
    updateProfile,
    isOwnProfile: targetPubkey === currentIdentity?.pubkey,
  };
}

// Next.js-spezifische Utility-Komponenten
export function NostrConnectionStatus() {
  const { isLoading, isAuthenticated, currentIdentity, connect, disconnect } = useNostr();

  if (isLoading) {
    return <div>Loading Nostr...</div>;
  }

  if (!isAuthenticated) {
    return (
      <button onClick={() => connect()}>
        Connect Wallet
      </button>
    );
  }

  return (
    <div>
      <span>Connected: {currentIdentity?.npub}</span>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}