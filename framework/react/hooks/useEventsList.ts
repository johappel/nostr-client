import { useState, useCallback, useEffect } from 'react'
import { RelayManager } from '../../index.js'

export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface NostrFilter {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  since?: number
  until?: number
  limit?: number
  search?: string
  [key: string]: any
}

export interface EventsListState {
  events: NostrEvent[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
}

export interface UseEventsListOptions {
  filters: NostrFilter[]
  relays?: string[]
  live?: boolean
  limit?: number
  autoLoad?: boolean
}

const INITIAL_STATE: EventsListState = {
  events: [],
  isLoading: false,
  error: null,
  hasMore: true
}

/**
 * Hook for managing Nostr event lists with deduplication and virtualization support
 * 
 * Provides functionality to query, display, and manage Nostr events with support for
 * live subscriptions, pagination, and optimistic updates.
 */
export function useEventsList(options: UseEventsListOptions) {
  const [state, setState] = useState<EventsListState>(INITIAL_STATE)
  const [relayManager, setRelayManager] = useState<RelayManager | null>(null)

  const {
    filters,
    relays = ['wss://relay.nostr.band', 'wss://nos.lol', 'wss://relay.damus.io'],
    live = true,
    limit = 50,
    autoLoad = true
  } = options

  // Initialize RelayManager
  useEffect(() => {
    const initializeRelayManager = async () => {
      try {
        console.log('[useEventsList] Initializing RelayManager with relays:', relays)
        const manager = new RelayManager(null, { relays })
        await manager.initialize()
        console.log('[useEventsList] RelayManager initialized successfully')
        setRelayManager(manager)
        
        // Test connection with a simple query
        setTimeout(async () => {
          try {
            console.log('[useEventsList] Testing relay connection...')
            const testEvents = await manager.query([{ kinds: [1], limit: 5 }], {
              relays,
              timeout: 5000
            })
            console.log('[useEventsList] Test query returned:', testEvents.length, 'events')
          } catch (testError) {
            console.error('[useEventsList] Test query failed:', testError)
          }
        }, 1000)
        
      } catch (error) {
        console.error('[useEventsList] Failed to initialize RelayManager:', error)
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize relay manager'
        }))
      }
    }

    initializeRelayManager()

    return () => {
      if (relayManager) {
        relayManager.destroy()
      }
    }
  }, [])

  // Load events from relays
  const loadEvents = useCallback(async (append = false) => {
    if (!relayManager) {
      setState(prev => ({
        ...prev,
        error: 'Relay manager not initialized'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      console.log('[useEventsList] Loading events with filters:', filters)
      console.log('[useEventsList] Using relays:', relays)
      
      // Query events from relays with longer timeout for better results
      const events = await relayManager.query(filters, {
        relays,
        timeout: 10000, // Increased from 5000ms to 10000ms
        limit
      })
      
      console.log('[useEventsList] Query returned:', events.length, 'events')
      if (events.length === 0) {
        console.warn('[useEventsList] No events returned - checking relay status...')
        const status = relayManager.getRelayStatus()
        console.log('[useEventsList] Relay status:', Object.fromEntries(status))
      }

      setState(prev => {
        const existingEvents = append ? prev.events : []
        const newEvents = [...existingEvents, ...events]
        
        // Deduplicate by id
        const dedupedEvents = newEvents.filter((event, index, self) =>
          index === self.findIndex(e => e.id === event.id)
        )
        
        // Sort by created_at descending
        dedupedEvents.sort((a, b) => b.created_at - a.created_at)
        
        return {
          events: dedupedEvents,
          isLoading: false,
          error: null,
          hasMore: events.length === limit
        }
      })

    } catch (error) {
      console.error('[useEventsList] Failed to load events:', error)
      console.error('[useEventsList] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filters,
        relays
      })
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }))
    }
  }, [filters, relays, limit, relayManager])

  // Load more events (pagination)
  const loadMore = useCallback(() => {
    if (!state.isLoading && state.hasMore) {
      loadEvents(true)
    }
  }, [state.isLoading, state.hasMore, loadEvents])

  // Refresh events (replace current list)
  const refresh = useCallback(() => {
    loadEvents(false)
  }, [loadEvents])

  // Optimistically add a new event
  const addEvent = useCallback((event: NostrEvent) => {
    setState(prev => {
      // Check if event already exists
      if (prev.events.some(e => e.id === event.id)) {
        return prev
      }
      
      const newEvents = [event, ...prev.events]
      return {
        ...prev,
        events: newEvents
      }
    })
  }, [])

  // Remove an event
  const removeEvent = useCallback((eventId: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== eventId)
    }))
  }, [])

  // Update an event
  const updateEvent = useCallback((eventId: string, updates: Partial<NostrEvent>) => {
    setState(prev => ({
      ...prev,
      events: prev.events.map(e => 
        e.id === eventId ? { ...e, ...updates } : e
      )
    }))
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && filters.length > 0) {
      loadEvents(false)
    }
  }, [autoLoad, filters, loadEvents])

  // Live subscription
  useEffect(() => {
    if (!live || !relayManager || filters.length === 0) return

    console.log('Setting up live subscription with filters:', filters)

    const subscription = relayManager.subscribe(
      filters,
      (event: NostrEvent) => {
        console.log('Received live event:', event.id)
        addEvent(event)
      },
      { relays }
    )

    return () => {
      if (subscription) {
        subscription.close()
      }
    }
  }, [live, filters, relays, relayManager, addEvent])

  return {
    ...state,
    loadEvents,
    loadMore,
    refresh,
    addEvent,
    removeEvent,
    updateEvent
  }
}