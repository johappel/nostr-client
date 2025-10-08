// framework/react/simple-hooks.ts
// Vereinfachte React Hooks die mit der aktuellen API funktionieren

import { useState, useEffect, useCallback } from 'react';
import { NostrFramework } from '../index.js';
import type { FrameworkConfig, Identity } from '../types/index.js';

/**
 * Einfacher Hook für Framework-Initialisierung
 */
export function useNostrFramework(config: FrameworkConfig = {}) {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    if (isLoading || framework) return;

    setIsLoading(true);
    setError(null);

    try {
      const nostr = new NostrFramework({
        relays: ['wss://relay.damus.io', 'wss://nos.lol'],
        debug: true,
        ...config
      });

      // Event Listeners über öffentliche API
      nostr.on('identity:login', (data: any) => {
        setCurrentIdentity(data.identity);
      });

      nostr.on('identity:logout', () => {
        setCurrentIdentity(null);
      });

      await nostr.initialize();
      setFramework(nostr);
      setIsInitialized(true);
    } catch (err) {
      console.error('Framework initialization failed:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [config, isLoading, framework]);

  const authenticate = useCallback(async (provider = 'nip07') => {
    if (!framework) throw new Error('Framework not initialized');
    
    try {
      const identity = await framework.identity.authenticate(provider, {});
      setCurrentIdentity(identity);
      return identity;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [framework]);

  const logout = useCallback(async () => {
    if (!framework) return;
    
    try {
      await framework.identity.logout();
      setCurrentIdentity(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [framework]);

  const publishNote = useCallback(async (content: string, tags: string[][] = []) => {
    if (!framework || !currentIdentity) {
      throw new Error('Not authenticated');
    }

    try {
      const signedEvent = await framework.events.createEvent('nip01', {
        content,
        tags
      });
      
      // Publish über RelayManager
      await framework.relay.publish(signedEvent);
      return signedEvent;
    } catch (err) {
      console.error('Failed to publish note:', err);
      throw err;
    }
  }, [framework, currentIdentity]);

  return {
    // State
    framework,
    isInitialized,
    isLoading,
    currentIdentity,
    isAuthenticated: !!currentIdentity,
    error,
    
    // Actions
    initialize,
    authenticate,
    logout,
    publishNote,
  };
}

/**
 * Hook für Event-Subscriptions (vereinfacht)
 */
export function useNostrEvents(
  framework: NostrFramework | null,
  filters: any[] = [],
  enabled = true
) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!framework || !enabled || !filters.length) {
      return;
    }

    setIsLoading(true);
    let subscription: any = null;

    const startSubscription = async () => {
      try {
        // Subscription mit Callback
        subscription = framework.relay.subscribe(filters, (event: any) => {
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
  }, [framework, enabled, JSON.stringify(filters)]);

  return { events, isLoading };
}

/**
 * Hook für verfügbare Auth-Provider
 */
export function useNostrProviders(framework: NostrFramework | null) {
  const [providers, setProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!framework) return;

    setIsLoading(true);
    
    const loadProviders = async () => {
      try {
        const availableProviders = await framework.identity.getAvailablePlugins();
        setProviders(availableProviders);
      } catch (err) {
        console.error('Failed to load providers:', err);
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, [framework]);

  return { providers, isLoading };
}

// Type-Exports für einfache Verwendung
export type {
  FrameworkConfig,
  Identity,
} from '../types/index.js';

export interface NostrHookResult {
  framework: NostrFramework | null;
  isInitialized: boolean;
  isLoading: boolean;
  currentIdentity: Identity | null;
  isAuthenticated: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  authenticate: (provider?: string) => Promise<Identity>;
  logout: () => Promise<void>;
  publishNote: (content: string, tags?: string[][]) => Promise<any>;
}