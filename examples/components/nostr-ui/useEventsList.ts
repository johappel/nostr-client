'use client'

import { useState, useCallback, useEffect } from 'react'

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

  const {
    filters,
    relays = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.snort.social'],
    live = true,
    limit = 50,
    autoLoad = true
  } = options

  // Load events from relays
  const loadEvents = useCallback(async (append = false) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }))

    try {
      // In a real implementation, this would use nostr-tools or similar
      // For demo purposes, we'll simulate with mock data
      console.log('Loading events with filters:', filters)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Generate mock events for demonstration
      // Extract allowed kinds from filters, default to all kinds if not specified
      const allowedKinds = filters.length > 0 && filters[0].kinds
        ? filters[0].kinds
        : [1, 3, 7, 9735] // Default kinds
      
      console.log('Using allowed kinds:', allowedKinds)
      
      const mockEvents: NostrEvent[] = Array.from({ length: Math.min(limit, 15) }, (_, i) => {
        // Select kind from allowed kinds
        const kind = allowedKinds[Math.floor(Math.random() * allowedKinds.length)]
        const baseTime = Math.floor(Date.now() / 1000)
        
        return {
          id: `demo_event_${Date.now()}_${i}`,
          pubkey: `demo_pubkey_${Math.random().toString(36).substr(2, 9)}`,
          created_at: baseTime - (i * 120), // 2 minutes apart
          kind,
          tags: kind === 7 ? [['e', `reply_to_${i}`]] : [],
          content: getEventContent(kind, i),
          sig: `demo_signature_${Math.random().toString(36).substr(2, 20)}`
        }
      })

      setState(prev => {
        const existingEvents = append ? prev.events : []
        const newEvents = [...existingEvents, ...mockEvents]
        
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
          hasMore: mockEvents.length === limit
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
  }, [filters, relays, limit])

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

  // Live subscription simulation
  useEffect(() => {
    if (!live) return

    // In a real implementation, this would set up a live subscription
    // For demo purposes, we'll simulate receiving new events periodically
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of new event
        // Extract allowed kinds from filters for live events
        const allowedKinds = filters.length > 0 && filters[0].kinds
          ? filters[0].kinds
          : [1, 7] // Default kinds for live events
        
        const kind = allowedKinds[Math.floor(Math.random() * allowedKinds.length)]
        
        const newEvent: NostrEvent = {
          id: `live_event_${Date.now()}`,
          pubkey: `live_pubkey_${Math.random().toString(36).substr(2, 9)}`,
          created_at: Math.floor(Date.now() / 1000),
          kind,
          tags: kind === 7 ? [['e', state.events[0]?.id || '']] : [],
          content: getEventContent(kind, 0, true),
          sig: `live_signature_${Math.random().toString(36).substr(2, 20)}`
        }
        
        addEvent(newEvent)
      }
    }, 8000) // Every 8 seconds

    return () => clearInterval(interval)
  }, [live, addEvent, state.events])

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

// Helper function to generate realistic event content
function getEventContent(kind: number, index: number, isLive = false): string {
  const timestamp = new Date().toLocaleString()
  
  switch (kind) {
    case 1: // Text note
      if (isLive) {
        return `🔴 Live update: Just published something interesting at ${timestamp}`
      }
      return `This is demo note #${index + 1} with some interesting content. Published at ${timestamp}`
    
    case 3: // Follow list
      return `Following ${Math.floor(Math.random() * 100) + 10} awesome nostriches`
    
    case 7: // Reaction
      const reactions = ['+', '❤️', '👍', '🔥', '👏', '🎉']
      return reactions[Math.floor(Math.random() * reactions.length)]
    
    case 9735: // Zap
      const amount = Math.floor(Math.random() * 10000) + 1000
      return `Zapped ${amount} sats! ⚡`
    
    default:
      return `Event content for kind ${kind}`
  }
}