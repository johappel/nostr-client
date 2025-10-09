// framework/react/index.ts
// React Hooks für das Nostr Framework (TypeScript-only exports)

import { useState, useCallback } from 'react';
import { NostrFramework } from '../index.js';
import type { FrameworkConfig, Identity } from '../types/index.js';

/**
 * Hook für Framework-Initialisierung
 */
export function useNostrFramework(config: FrameworkConfig) {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    if (isLoading || framework) return;

    setIsLoading(true);
    setError(null);

    try {
      const nostr = new NostrFramework(config);
      await nostr.initialize();
      setFramework(nostr);
      setIsInitialized(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [config, isLoading, framework]);

  const destroy = useCallback(() => {
    if (framework && typeof framework.destroy === 'function') {
      framework.destroy();
      setFramework(null);
      setIsInitialized(false);
    }
  }, [framework]);

  return {
    framework,
    isInitialized,
    isLoading,
    error,
    initialize,
    destroy,
  };
}

/**
 * Hook für Authentication
 */
export function useNostrAuth(framework: NostrFramework | null) {
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = useCallback(async (provider = 'nip07', credentials = {}) => {
    if (!framework) throw new Error('Framework not initialized');

    setIsAuthenticating(true);
    try {
      const identity = await framework.identity.authenticate(provider, credentials);
      setCurrentIdentity(identity);
      return identity;
    } finally {
      setIsAuthenticating(false);
    }
  }, [framework]);

  const logout = useCallback(async () => {
    if (!framework) return;

    try {
      await framework.identity.logout();
      setCurrentIdentity(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [framework]);

  return {
    currentIdentity,
    isAuthenticated: !!currentIdentity,
    isAuthenticating,
    authenticate,
    logout,
  };
}

/**
 * Hook für Event Publishing
 */
export function useNostrPublish(framework: NostrFramework | null) {
  const [isPublishing, setIsPublishing] = useState(false);

  const publishEvent = useCallback(async (templateName: string, data: any) => {
    if (!framework) throw new Error('Framework not initialized');

    setIsPublishing(true);
    try {
      const signedEvent = await framework.events.createEvent(templateName, data);
      await framework.relay.publish(signedEvent);
      return signedEvent;
    } finally {
      setIsPublishing(false);
    }
  }, [framework]);

  const publishNote = useCallback(async (content: string, tags: string[][] = []) => {
    return await publishEvent('nip01', { content, tags });
  }, [publishEvent]);

  return {
    publishEvent,
    publishNote,
    isPublishing,
  };
}

/**
 * Hook für Event Subscriptions
 */
export function useNostrSubscription(
  framework: NostrFramework | null,
  filters: any[],
  enabled = true
) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useCallback(async () => {
    if (!framework || !enabled || !filters.length) return;

    setIsLoading(true);
    try {
      const subscription = await framework.relay.subscribe(filters, (event: any) => {
        setEvents(prev => {
          if (prev.some(e => e.id === event.id)) {
            return prev;
          }
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      });

      setIsLoading(false);
      return subscription;
    } catch (err) {
      console.error('Subscription failed:', err);
      setIsLoading(false);
    }
  }, [framework, enabled, filters]);

  return {
    events,
    isLoading,
    subscribe,
  };
}

// Type exports
export type { FrameworkConfig, Identity } from '../types/index.js';

// Utility types for React components
export interface NostrComponentProps {
  framework?: NostrFramework | null;
  config?: FrameworkConfig;
  children?: React.ReactNode;
}

export interface NostrHookOptions {
  autoConnect?: boolean;
  debug?: boolean;
}