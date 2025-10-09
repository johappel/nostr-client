import { useState, useEffect, useCallback } from 'react'

export type RelayConfig = { 
  url: string
  read: boolean
  write: boolean
}

export interface NostrConfig {
  relays: RelayConfig[]
  auth: { type: 'nip07' | 'bunker' | 'local'; uri?: string }
  storage: { 
    type: 'localStorage' | 'sqlite' | 'sqlite-file'
    config?: {
      keyPrefix?: string
      maxEvents?: number
      dbName?: string
      filePath?: string
    }
  }
  policy?: { allowPublishKinds: number[]; allowDelete?: boolean }
}

const DEFAULT_CONFIG: NostrConfig = {
  relays: [
    { url: 'wss://relay.damus.io', read: true, write: true }
  ],
  auth: { type: 'nip07' },
  storage: { 
    type: 'localStorage',
    config: {
      keyPrefix: 'nostr_events_',
      maxEvents: 1000
    }
  }
}

const CONFIG_STORAGE_KEY = 'nostr-config'

/**
 * Hook to manage Nostr configuration with automatic persistence
 * 
 * @param initialConfig - Optional initial configuration
 * @param storageKey - Optional custom storage key (default: 'nostr-config')
 */
export function useNostrConfig(
  initialConfig?: Partial<NostrConfig>,
  storageKey: string = CONFIG_STORAGE_KEY
) {
  const [config, setConfigState] = useState<NostrConfig>(DEFAULT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load config from storage on mount
  useEffect(() => {
    setIsHydrated(true)
    
    // Only use localStorage in browser environment
    if (typeof window === 'undefined') {
      setConfigState({ ...DEFAULT_CONFIG, ...initialConfig })
      setIsLoaded(true)
      return
    }
    
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedConfig = JSON.parse(stored) as NostrConfig
        setConfigState({ ...DEFAULT_CONFIG, ...parsedConfig, ...initialConfig })
      } else if (initialConfig) {
        setConfigState({ ...DEFAULT_CONFIG, ...initialConfig })
      }
    } catch (error) {
      console.warn('Failed to load Nostr config from localStorage:', error)
      setConfigState({ ...DEFAULT_CONFIG, ...initialConfig })
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey])

  // Save config to storage whenever it changes
  const setConfig = useCallback((newConfig: NostrConfig | ((prev: NostrConfig) => NostrConfig)) => {
    setConfigState(prev => {
      const nextConfig = typeof newConfig === 'function' ? newConfig(prev) : newConfig
      
      // Persist to storage based on the selected storage type (browser only)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextConfig))
        } catch (error) {
          console.warn('Failed to persist Nostr config:', error)
        }
      }
      
      return nextConfig
    })
  }, [storageKey])

  // Clear config
  const clearConfig = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.warn('Failed to clear Nostr config:', error)
      }
    }
    setConfigState(DEFAULT_CONFIG)
  }, [storageKey])

  // Export config as JSON string
  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2)
  }, [config])

  // Import config from JSON string
  const importConfig = useCallback((configJson: string) => {
    try {
      const importedConfig = JSON.parse(configJson) as NostrConfig
      setConfig({ ...DEFAULT_CONFIG, ...importedConfig })
      return true
    } catch (error) {
      console.warn('Failed to import config:', error)
      return false
    }
  }, [setConfig])

  // Create storage plugin instance (placeholder - would import actual plugins in real implementation)
  const createStoragePlugin = useCallback(() => {
    if (typeof window === 'undefined') return null

    try {
      // In a real implementation, these would be dynamic imports:
      // const { LocalStoragePlugin } = await import('../plugins/storage/LocalStoragePlugin')
      // return new LocalStoragePlugin(config.storage.config)
      
      console.log(`Creating ${config.storage.type} plugin with config:`, config.storage.config)
      return {
        type: config.storage.type,
        config: config.storage.config,
        // Mock plugin methods
        initialize: async () => console.log(`${config.storage.type} initialized`),
        save: async (events: any[]) => console.log(`Saved ${events.length} events to ${config.storage.type}`),
        query: async (filters: any[]) => console.log(`Querying ${config.storage.type} with filters:`, filters),
        delete: async (ids: string[]) => console.log(`Deleted ${ids.length} events from ${config.storage.type}`),
        clear: async () => console.log(`Cleared ${config.storage.type}`),
        getStats: async () => ({ totalEvents: 0, totalSize: 0 })
      }
    } catch (error) {
      console.error('Failed to create storage plugin:', error)
      return null
    }
  }, [config.storage])

  return {
    config,
    setConfig,
    clearConfig,
    exportConfig,
    importConfig,
    createStoragePlugin,
    isLoaded,
    isHydrated
  }
}