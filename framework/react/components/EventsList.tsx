import React from 'react'
import { useEventsList, type NostrEvent, type NostrFilter, type UseEventsListOptions } from '../hooks/useEventsList'

export interface EventsListProps {
  filters: NostrFilter[]
  relays?: string[]
  live?: boolean
  limit?: number
  autoLoad?: boolean
  className?: string
  // UI component overrides for custom styling
  components?: {
    Container?: React.ComponentType<any>
    EventItem?: React.ComponentType<{ event: NostrEvent; index: number }>
    Loading?: React.ComponentType
    Empty?: React.ComponentType
    Error?: React.ComponentType<{ error: string | null; onRetry?: () => void }>
    LoadMore?: React.ComponentType<{ onLoadMore: () => void; hasMore: boolean; isLoading: boolean }>
    Header?: React.ComponentType<{ eventCount: number; isLoading: boolean; onRefresh: () => void }>
  }
  // Event handlers
  onEventClick?: (event: NostrEvent) => void
  onEventDelete?: (event: NostrEvent) => void
  onEventUpdate?: (event: NostrEvent) => void
  // Custom event rendering
  renderEvent?: (event: NostrEvent, index: number) => React.ReactNode
  // Virtualization options
  virtualized?: boolean
  itemHeight?: number
  maxHeight?: number
}

/**
 * Headless Events List Component
 * 
 * Provides a flexible, framework-agnostic component for displaying Nostr events
 * with support for live subscriptions, pagination, and custom rendering.
 * 
 * Features:
 * - Deduplication by event ID
 * - Optimistic updates when publishing
 * - Live subscription support
 * - Virtualization for large lists
 * - Custom UI component overrides
 */
export function EventsList({
  filters,
  relays,
  live = true,
  limit = 50,
  autoLoad = true,
  className = '',
  components = {},
  onEventClick,
  onEventDelete,
  onEventUpdate,
  renderEvent,
  virtualized = false,
  itemHeight = 80,
  maxHeight = 400
}: EventsListProps) {
  const {
    events,
    isLoading,
    error,
    hasMore,
    loadEvents,
    loadMore,
    refresh,
    addEvent,
    removeEvent,
    updateEvent
  } = useEventsList({
    filters,
    relays,
    live,
    limit,
    autoLoad
  })

  // Default components (basic HTML elements)
  const {
    Container = ({ children, ...props }: any) => (
      <div className={`space-y-4 ${className}`} {...props}>
        {children}
      </div>
    ),
    EventItem = ({ event, index }: { event: NostrEvent; index: number }) => (
      <div 
        className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
        onClick={() => onEventClick?.(event)}
        style={{ minHeight: itemHeight }}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs text-gray-500">Kind: {event.kind}</span>
          <span className="text-xs text-gray-500">
            {new Date(event.created_at * 1000).toLocaleString()}
          </span>
        </div>
        <div className="text-sm font-mono mb-2">{event.id.slice(0, 16)}...</div>
        <div className="text-sm">{event.content}</div>
      </div>
    ),
    Loading = () => (
      <div className="flex justify-center p-4">
        <div className="text-gray-500">Loading events...</div>
      </div>
    ),
    Empty = () => (
      <div className="text-center p-8 text-gray-500">
        <div className="text-lg mb-2">No events found</div>
        <div className="text-sm">Try adjusting your filters or check back later</div>
      </div>
    ),
    Error = ({ error, onRetry }: { error: string | null; onRetry?: () => void }) => (
      <div className="border border-red-200 bg-red-50 rounded p-4">
        <div className="text-red-800 mb-2">Error loading events</div>
        <div className="text-red-600 text-sm mb-3">{error}</div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="text-red-700 underline text-sm"
          >
            Try again
          </button>
        )}
      </div>
    ),
    LoadMore = ({ onLoadMore, hasMore, isLoading }: any) => (
      hasMore && (
        <div className="text-center p-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className={`px-4 py-2 rounded border ${
              isLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )
    ),
    Header = ({ eventCount, isLoading, onRefresh }: any) => (
      <div className="flex justify-between items-center p-4 border-b">
        <div className="font-medium">
          {eventCount === 0 ? 'No events' : `${eventCount} event${eventCount === 1 ? '' : 's'}`}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`px-3 py-1 text-sm rounded border ${
            isLoading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Refresh
        </button>
      </div>
    )
  } = components

  const handleEventClick = (event: NostrEvent) => {
    onEventClick?.(event)
  }

  const handleRetry = () => {
    refresh()
  }

  const handleLoadMore = () => {
    loadMore()
  }

  const handleRefresh = () => {
    refresh()
  }

  // Handle custom event rendering
  const renderEventItem = (event: NostrEvent, index: number) => {
    if (renderEvent) {
      return renderEvent(event, index)
    }
    return <EventItem event={event} index={index} />
  }

  // Virtualized rendering (simplified version)
  if (virtualized && events.length > 0) {
    // In a real implementation, this would use react-window or similar
    // For now, we'll render with max height and overflow
    return (
      <Container>
        <Header 
          eventCount={events.length} 
          isLoading={isLoading} 
          onRefresh={handleRefresh}
        />
        <div style={{ maxHeight, overflow: 'auto' }}>
          {error && <Error error={error} onRetry={handleRetry} />}
          
          {events.length === 0 && !isLoading && !error && <Empty />}
          
          {isLoading && events.length === 0 && <Loading />}
          
          {events.map((event, index) => (
            <div key={event.id}>
              {renderEventItem(event, index)}
            </div>
          ))}
        </div>
        <LoadMore 
          onLoadMore={handleLoadMore} 
          hasMore={hasMore} 
          isLoading={isLoading}
        />
      </Container>
    )
  }

  // Standard rendering
  return (
    <Container>
      <Header 
        eventCount={events.length} 
        isLoading={isLoading} 
        onRefresh={handleRefresh}
      />
      
      {error && <Error error={error} onRetry={handleRetry} />}
      
      {events.length === 0 && !isLoading && !error && <Empty />}
      
      {isLoading && events.length === 0 && <Loading />}
      
      {events.map((event, index) => (
        <div key={event.id}>
          {renderEventItem(event, index)}
        </div>
      ))}
      
      <LoadMore 
        onLoadMore={handleLoadMore} 
        hasMore={hasMore} 
        isLoading={isLoading}
      />
    </Container>
  )
}

// Export types for external use
export type { NostrEvent, NostrFilter, UseEventsListOptions }