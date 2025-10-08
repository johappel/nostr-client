// framework/react/hooks.ts
// React Hooks für das Nostr Framework (ohne JSX)

import React, { useContext, useEffect, useState, createContext, ReactNode } from 'react';
import { NostrFramework } from '../index.js';
import type { FrameworkConfig, Identity } from '../types/index.js';

/**
 * React Context für das Nostr Framework
 */
export interface NostrContextType {
  framework: NostrFramework | null;
  isInitialized: boolean;
  isLoading: boolean;
  currentIdentity: Identity | null;
  isAuthenticated: boolean;
  error: Error | null;
}

export const NostrContext = createContext<NostrContextType>({
  framework: null,
  isInitialized: false,
  isLoading: false,
  currentIdentity: null,
  isAuthenticated: false,
  error: null,
});

/**
 * Hook für den Zugriff auf das Nostr Framework
 */
export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}

/**
 * Hook für Identity-Management
 */
export function useNostrIdentity() {
  const { framework, currentIdentity, isAuthenticated } = useNostr();

  const connect = async (provider = 'nip07', credentials?: any) => {
    if (!framework) throw new Error('Framework not initialized');
    return await framework.identity.authenticate(provider, credentials);
  };

  const disconnect = async () => {
    if (!framework) throw new Error('Framework not initialized');
    await framework.identity.logout();
  };

  const getProfile = async (pubkey?: string) => {
    if (!framework) throw new Error('Framework not initialized');
    // Profile-Funktionalität muss noch implementiert werden
    return null;
  };

  return {
    currentIdentity,
    isAuthenticated,
    connect,
    disconnect,
    getProfile,
  };
}

/**
 * Hook für Event-Publishing
 */
export function useNostrPublish() {
  const { framework, isAuthenticated } = useNostr();
  const [isPublishing, setIsPublishing] = useState(false);

  const publishEvent = async (eventData: any) => {
    if (!framework || !isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setIsPublishing(true);
    try {
      const event = await framework.events.createEvent(eventData.kind, eventData.content, eventData.tags);
      const signedEvent = await framework.signer.signEvent(event);
      await framework.relay.publish(signedEvent);
      return signedEvent;
    } finally {
      setIsPublishing(false);
    }
  };

  const publishNote = async (content: string, tags: string[][] = [], kind: number = 1) => {
    return await publishEvent({ kind, content, tags });
  };

  return {
    publishEvent,
    publishNote,
    isPublishing,
    canPublish: isAuthenticated,
  };
}

/**
 * Hook für Event-Subscriptions
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
        subscription = await framework.relay.subscribe(filters, (event: any) => {
          setEvents(prev => {
            // Deduplizierung
            if (prev.some(e => e.id === event.id)) {
              return prev;
            }
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Subscription failed:', err);
        setIsLoading(false);
      }
    };

    startSubscription();

    return () => {
      if (subscription && typeof subscription.close === 'function') {
        subscription.close();
      }
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
        // TODO: Profile-Funktionalität implementieren
        // Temporär: Leeres Profil zurückgeben
        setProfile({ pubkey: targetPubkey });
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

    const event = await framework.events.createEvent('nip01', { content: JSON.stringify(profileData), tags: [] });
    const signedEvent = await framework.signer.signEvent(event);
    await framework.relay.publish(signedEvent);

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

// Provider Props Interface
export interface NostrProviderProps {
  children: ReactNode;
  config?: FrameworkConfig;
  autoConnect?: boolean;
}

// Context State für Provider
export interface NostrProviderState extends NostrContextType {
  connect: (provider?: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

// Provider-Factory-Funktion
export function createNostrProvider() {
  return function NostrProvider({ 
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
              // TODO: Auto-connect implementieren
              console.log('Auto-connect requested but not yet implemented');
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
        await framework.identity.logout();
        setCurrentIdentity(null);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    };

    const contextValue: NostrProviderState = {
      framework,
      isInitialized,
      isLoading,
      currentIdentity,
      isAuthenticated: !!currentIdentity,
      error,
      connect,
      disconnect,
    };

    // React.createElement verwenden statt JSX
    return React.createElement(
      NostrContext.Provider,
      { value: contextValue },
      children
    );
  };
}