'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

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
 * Hook for managing Nostr event lists with deduplication and virtualization support (Examples version)
 * 
 * This is the styled version for the examples app.
 * For production use: import { useEventsList } from "@johappel/nostr-framework/react"
 * 
 * Provides functionality to query, display, and manage Nostr events with support for
 * live subscriptions, pagination, and optimistic updates.
 */
export function useEventsList(options: UseEventsListOptions) {
  const [state, setState] = useState<EventsListState>(INITIAL_STATE)
  const relayManagerRef = useRef<any>(null)

  const {
    filters,
    relays = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.snort.social'],
    live = true,
    limit = 50,
    autoLoad = true
  } = options

  // Initialize RelayManager
  const initRelayManager = useCallback(async () => {
    if (relayManagerRef.current) return relayManagerRef.current

    try {
      // Dynamic import to avoid SSR issues
      const { RelayManager } = await import('../../../framework/dist/core/RelayManager')
      const { SimplePool } = await import('nostr-tools')
      
      console.log('Creating RelayManager with relays:', relays)
      
      const manager = new RelayManager(null, {
        relays: relays,
        SimplePoolClass: SimplePool
      })
      
      // Initialize the RelayManager
      await manager.initialize()
      console.log('RelayManager initialized successfully')
      
      // Debug: Test direct SimplePool usage
      console.log('=== DEBUG: Testing direct SimplePool usage ===')
      try {
        const directPool = manager._pool
        const testRelays = ['wss://relay.damus.io', 'wss://nos.lol']
        const testFilters = [{ 
          kinds: [1], 
          limit: 10,
          since: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
        }]
        
        console.log('Direct pool:', directPool)
        console.log('Test relays:', testRelays)  
        console.log('Test filters:', testFilters)
        
        let directEvents: any[] = []
        const directSub = directPool.subscribeMany(testRelays, testFilters, {
          onevent: (event: any) => {
            console.log('=== Direct event received:', event.id)
            directEvents.push(event)
          },
          oneose: () => {
            console.log('=== Direct EOSE received ===')
          },
          onclose: (reason: any) => {
            console.log('=== Direct close:', reason)
          }
        })
        
        // Wait a bit and then close
        setTimeout(() => {
          directSub.close()
          console.log('=== Direct test: Got', directEvents.length, 'events ===')
        }, 3000)
        
      } catch (error) {
        console.error('=== DEBUG: Direct test failed ===', error)
      }
      
      relayManagerRef.current = manager
      return manager
    } catch (error) {
      console.error('Failed to initialize RelayManager:', error)
      throw error
    }
  }, [relays])

  // Load events from relays
  const loadEvents = useCallback(async (append = false) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }))

    try {
      console.log('Loading real events with filters:', filters)
      
      const relayManager = await initRelayManager()
      
      // Prepare filters with limit and reasonable time range to satisfy relay requirements
      const queryFilters = filters.map(filter => ({
        ...filter,
        limit: limit,
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days instead of 24 hours
      }))
      
      console.log('Querying relays with filters:', queryFilters)
      
      // Query real events from relays
      const events = await relayManager.query(queryFilters, {
        timeout: 8000,
        limit: limit
      })
      
      console.log(`Received ${events.length} real events from relays`)

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      console.error('Failed to load events:', errorMessage)
    }
  }, [filters, relays, limit, initRelayManager])

  // Load more events (pagination)
  const loadMore = useCallback(() => {
    if (!state.isLoading && state.hasMore) {
      loadEvents(true)
    }
  }, [state.isLoading, state.hasMore, loadEvents])

  // Refresh events (replace current list)
  const refresh = useCallback(() => {
    console.log('Refreshing events list...')
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
      console.log('Added new event:', event.id)
      return {
        ...prev,
        events: newEvents
      }
    })
  }, [])

  // Remove an event
  const removeEvent = useCallback((eventId: string) => {
    setState(prev => {
      const newEvents = prev.events.filter(e => e.id !== eventId)
      console.log('Removed event:', eventId)
      return {
        ...prev,
        events: newEvents
      }
    })
  }, [])

  // Update an event
  const updateEvent = useCallback((eventId: string, updates: Partial<NostrEvent>) => {
    setState(prev => {
      const newEvents = prev.events.map(e => 
        e.id === eventId ? { ...e, ...updates } : e
      )
      console.log('Updated event:', eventId)
      return {
        ...prev,
        events: newEvents
      }
    })
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && filters.length > 0) {
      loadEvents(false)
    }
  }, [autoLoad, filters, loadEvents])

  // Live subscription for real events
  useEffect(() => {
    if (!live || filters.length === 0) return

    let isActive = true
    let subscription: any = null

    const setupLiveSubscription = async () => {
      try {
        console.log('Setting up live subscription with filters:', filters)
        
        const relayManager = await initRelayManager()
        
        subscription = await relayManager.subscribe(filters, (event: NostrEvent) => {
          if (!isActive) return
          
          console.log('Received live event:', event.id)
          addEvent(event)
        })
        
        console.log('Live subscription established')
      } catch (error) {
        console.error('Failed to setup live subscription:', error)
      }
    }

    setupLiveSubscription()

    return () => {
      isActive = false
      if (subscription?.close) {
        subscription.close()
        console.log('Live subscription closed')
      }
    }
  }, [live, filters, addEvent, initRelayManager])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (relayManagerRef.current?.destroy) {
        relayManagerRef.current.destroy()
        console.log('RelayManager destroyed')
      }
    }
  }, [])

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

