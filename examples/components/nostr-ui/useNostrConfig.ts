'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RelayConfig } from './NostrConfigPanel'

export interface NostrConfig {
  relays: RelayConfig[]
  auth: { type: 'nip07' | 'bunker' | 'local'; uri?: string }
  storage: { type: 'indexeddb' | 'server-db' }
  policy?: { allowPublishKinds: number[]; allowDelete?: boolean }
}

const DEFAULT_CONFIG: NostrConfig = {
  relays: [
    { url: 'wss://relay.damus.io', read: true, write: true }
  ],
  auth: { type: 'nip07' },
  storage: { type: 'indexeddb' }
}

const CONFIG_STORAGE_KEY = 'nostr-config'

/**
 * Hook to manage Nostr configuration with automatic persistence
 */
export function useNostrConfig(initialConfig?: Partial<NostrConfig>) {
  const [config, setConfigState] = useState<NostrConfig>(DEFAULT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load config from storage on mount
  useEffect(() => {
    setIsHydrated(true)
    
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
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
  }, [])

  // Save config to storage whenever it changes
  const setConfig = useCallback((newConfig: NostrConfig | ((prev: NostrConfig) => NostrConfig)) => {
    setConfigState(prev => {
      const nextConfig = typeof newConfig === 'function' ? newConfig(prev) : newConfig
      
      // Persist to storage based on the selected storage type
      try {
        if (nextConfig.storage.type === 'indexeddb') {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig))
        } else if (nextConfig.storage.type === 'server-db') {
          // TODO: Implement server-side persistence
          console.log('Server-side storage not yet implemented, falling back to localStorage')
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig))
        }
      } catch (error) {
        console.warn('Failed to persist Nostr config:', error)
      }
      
      return nextConfig
    })
  }, [])

  // Clear config
  const clearConfig = useCallback(() => {
    try {
      localStorage.removeItem(CONFIG_STORAGE_KEY)
      setConfigState(DEFAULT_CONFIG)
    } catch (error) {
      console.warn('Failed to clear Nostr config:', error)
    }
  }, [])

  // Export config
  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2)
  }, [config])

  // Import config
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

  return {
    config,
    setConfig,
    clearConfig,
    exportConfig,
    importConfig,
    isLoaded,
    isHydrated
  }
}