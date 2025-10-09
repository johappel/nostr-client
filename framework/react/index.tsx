// framework/react/index.tsx
// React-spezifische Hooks und Provider für das Nostr Framework

import React, { useContext, useEffect, useState, createContext, ReactNode } from 'react';
import { NostrFramework } from '../index.js';
import type { FrameworkConfig, Identity, EventBus } from '../types/index.js';

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

const NostrContext = createContext<NostrContextType>({
  framework: null,
  isInitialized: false,
  isLoading: false,
  currentIdentity: null,
  isAuthenticated: false,
  error: null,
});

/**
 * React Provider für das Nostr Framework
 */
export interface NostrProviderProps {
  children: ReactNode;
  config?: FrameworkConfig;
  autoConnect?: boolean;
}

export const NostrProvider: React.FC<NostrProviderProps> = ({
  children,
  config = {},
  autoConnect = true,
}) => {
  const [framework, setFramework] = useState<NostrFramework | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeFramework = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const nostrFramework = new NostrFramework(config);
        
        // Event listeners
        nostrFramework.on('identity:changed', (identity: Identity | null) => {
          setCurrentIdentity(identity);
        });

        nostrFramework.on('error', (err: Error) => {
          setError(err);
        });

        await nostrFramework.initialize();
        
        if (autoConnect) {
          await nostrFramework.identity.tryAutoConnect();
        }

        setFramework(nostrFramework);
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeFramework();

    return () => {
      framework?.destroy();
    };
  }, []);

  const contextValue: NostrContextType = {
    framework,
    isInitialized,
    isLoading,
    currentIdentity,
    isAuthenticated: !!currentIdentity,
    error,
  };

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
};

/**
 * Hook für den Zugriff auf das Nostr Framework
 */
export const useNostr = (): NostrContextType => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
};

/**
 * Hook für Identity-Management
 */
export const useNostrIdentity = () => {
  const { framework, currentIdentity, isAuthenticated } = useNostr();

  const connectWithProvider = async (provider: string, credentials?: any) => {
    if (!framework) throw new Error('Framework not initialized');
    return await framework.identity.connectWithProvider(provider, credentials);
  };

  const disconnect = async () => {
    if (!framework) throw new Error('Framework not initialized');
    await framework.identity.disconnect();
  };

  const getProfile = async (pubkey?: string) => {
    if (!framework) throw new Error('Framework not initialized');
    return await framework.identity.getProfile(pubkey);
  };

  return {
    currentIdentity,
    isAuthenticated,
    connectWithProvider,
    disconnect,
    getProfile,
  };
};

/**
 * Hook für Event-Publishing
 */
export const useNostrPublish = () => {
  const { framework } = useNostr();
  const [isPublishing, setIsPublishing] = useState(false);

  const publishEvent = async (event: any) => {
    if (!framework) throw new Error('Framework not initialized');
    
    setIsPublishing(true);
    try {
      return await framework.events.publish(event);
    } finally {
      setIsPublishing(false);
    }
  };

  const publishNote = async (content: string, tags?: string[][], kind: number = 1) => {
    const event = {
      kind,
      content,
      tags: tags || [],
      created_at: Math.floor(Date.now() / 1000),
    };
    return await publishEvent(event);
  };

  return {
    publishEvent,
    publishNote,
    isPublishing,
  };
};

/**
 * Hook für Event-Subscriptions
 */
export const useNostrSubscription = (filters: any[], deps: any[] = []) => {
  const { framework } = useNostr();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!framework || !filters.length) return;

    setIsLoading(true);
    const subscription = framework.events.subscribe(filters, {
      onEvent: (event: any) => {
        setEvents(prev => {
          // Deduplizierung
          const exists = prev.some(e => e.id === event.id);
          if (exists) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      onEose: () => {
        setIsLoading(false);
      },
    });

    return () => {
      subscription.close();
    };
  }, deps);

  return { events, isLoading };
};

// Re-exports
export { NostrContext };
export type { NostrContextType, NostrProviderProps };