'use client'

import React, { useState } from 'react'
import { useEventsList, type NostrEvent, type NostrFilter } from './useEventsList'
import { UserProfile } from './UserProfile'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RefreshCw,
  MessageSquare,
  Users,
  Heart,
  Zap,
  Plus,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  Server,
  X,
  Edit
} from "lucide-react"

export interface EventsListProps {
  filters: NostrFilter[]
  relays?: string[]
  live?: boolean
  limit?: number
  autoLoad?: boolean
  className?: string
  // Event handlers
  onEventClick?: (event: NostrEvent) => void
  onEventDelete?: (event: NostrEvent) => void
  onEventUpdate?: (event: NostrEvent) => void
  onRelaysChange?: (relays: string[]) => void
  onEventEdit?: (event: NostrEvent) => void
  onEventReact?: (event: NostrEvent, reaction: string) => void
  onEventComment?: (event: NostrEvent) => void
  // Custom event rendering
  renderEvent?: (event: NostrEvent, index: number) => React.ReactNode
  // Virtualization options
  virtualized?: boolean
  maxHeight?: number
  // Show additional features
  showFilters?: boolean
  showStats?: boolean
  showRelaySelector?: boolean
  showUserProfile?: boolean
  showActions?: boolean
}

/**
 * Styled Events List Component for Examples
 * 
 * Uses shadcn/ui components for a polished look with support for:
 * - Live event subscriptions
 * - Event filtering and pagination
 * - Virtualization for large lists
 * - Custom event rendering
 * - Interactive event cards
 * 
 * Perfect for copy-paste into user projects.
 */
export function EventsList({
  filters,
  relays,
  live = true,
  limit = 50,
  autoLoad = true,
  className = '',
  onEventClick,
  onEventDelete,
  onEventUpdate,
  onRelaysChange,
  onEventEdit,
  onEventReact,
  onEventComment,
  renderEvent,
  virtualized = false,
  maxHeight = 500,
  showFilters = true,
  showStats = true,
  showRelaySelector = true,
  showUserProfile = true,
  showActions = true
}: EventsListProps) {
  const [selectedEvent, setSelectedEvent] = useState<NostrEvent | null>(null)
  const [currentRelays, setCurrentRelays] = useState<string[]>(relays || ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.snort.social'])
  const [newRelayUrl, setNewRelayUrl] = useState('')
  
  const {
    events,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useEventsList({
    filters,
    relays: currentRelays,
    live,
    limit,
    autoLoad
  })

  const handleAddRelay = () => {
    if (newRelayUrl.trim() && !currentRelays.includes(newRelayUrl.trim())) {
      const updatedRelays = [...currentRelays, newRelayUrl.trim()]
      setCurrentRelays(updatedRelays)
      onRelaysChange?.(updatedRelays)
      setNewRelayUrl('')
    }
  }

  const handleRemoveRelay = (relayToRemove: string) => {
    if (currentRelays.length > 1) {
      const updatedRelays = currentRelays.filter(relay => relay !== relayToRemove)
      setCurrentRelays(updatedRelays)
      onRelaysChange?.(updatedRelays)
    }
  }

  const handleEventClick = (event: NostrEvent) => {
    setSelectedEvent(event)
    onEventClick?.(event)
  }

  const getKindIcon = (kind: number) => {
    switch (kind) {
      case 1: return <MessageSquare className="w-4 h-4" />
      case 3: return <Users className="w-4 h-4" />
      case 7: return <Heart className="w-4 h-4" />
      case 9735: return <Zap className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getKindLabel = (kind: number) => {
    switch (kind) {
      case 1: return 'Text Note'
      case 3: return 'Follow List'
      case 7: return 'Reaction'
      case 9735: return 'Zap'
      default: return `Kind ${kind}`
    }
  }

  const getKindColor = (kind: number) => {
    switch (kind) {
      case 1: return 'default'
      case 3: return 'secondary'
      case 7: return 'destructive'
      case 9735: return 'outline'
      default: return 'default'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const renderEventItem = (event: NostrEvent, index: number) => {
    if (renderEvent) {
      return renderEvent(event, index)
    }

    return (
      <Card
        key={event.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleEventClick(event)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getKindIcon(event.kind)}
              <Badge variant={getKindColor(event.kind) as any}>
                {getKindLabel(event.kind)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTime(event.created_at)}
            </div>
          </div>
          
          {/* User Profile */}
          {showUserProfile && (
            <div className="mb-3">
              <UserProfile
                pubkey={event.pubkey}
                relays={currentRelays}
                compact={true}
                showEditButton={false}
                showCopyButton={false}
                showRefreshButton={false}
                showStats={false}
                className="mb-2"
              />
            </div>
          )}
          
          <div className="mb-3">
            <p className="text-sm line-clamp-3">{event.content}</p>
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventReact?.(event, '+')
                  }}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Like
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventComment?.(event)
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comment
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {event.pubkey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventEdit?.(event)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(`https://njump.me/${event.id}`)
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-muted animate-pulse rounded" />
              <div className="w-20 h-5 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-full h-4 bg-muted animate-pulse rounded mb-2" />
            <div className="w-3/4 h-4 bg-muted animate-pulse rounded mb-3" />
            <div className="flex justify-between">
              <div className="w-24 h-3 bg-muted animate-pulse rounded" />
              <div className="w-16 h-3 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Events List
            {live && (
              <Badge variant="secondary" className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Live
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        
        {showStats && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{events.length} events loaded</span>
              {filters.length > 0 && (
                <span>• {filters.length} filter{filters.length === 1 ? '' : 's'}</span>
              )}
              {currentRelays && currentRelays.length > 0 && (
                <span>• {currentRelays.length} relay{currentRelays.length === 1 ? '' : 's'}</span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Relay Selector */}
      {showRelaySelector && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="w-5 h-5" />
              Relay Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-relay">Add Relay</Label>
              <div className="flex gap-2">
                <Input
                  id="new-relay"
                  placeholder="wss://relay.example.com"
                  value={newRelayUrl}
                  onChange={(e) => setNewRelayUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRelay()}
                />
                <Button onClick={handleAddRelay} disabled={!newRelayUrl.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Active Relays ({currentRelays.length})</Label>
              <div className="flex flex-wrap gap-2">
                {currentRelays.map((relay, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {relay.replace('wss://', '')}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveRelay(relay)}
                      disabled={currentRelays.length <= 1}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && events.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-y-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading events...</span>
            </div>
            {renderLoadingSkeleton()}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && events.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or check back later for new events.
            </p>
            {filters.length === 0 && (
              <Button onClick={refresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Load Events
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {events.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {virtualized ? (
              <ScrollArea style={{ maxHeight }}>
                <div className="p-4 space-y-4">
                  {events.map((event, index) => renderEventItem(event, index))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-4 space-y-4">
                {events.map((event, index) => renderEventItem(event, index))}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Load More Events
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {!hasMore && events.length > 0 && (
              <div className="p-4 border-t text-center text-sm text-muted-foreground">
                End of events list
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">ID:</span>
                <div className="font-mono text-xs break-all">{selectedEvent.id}</div>
              </div>
              <div>
                <span className="font-medium">Kind:</span>
                <div>{getKindLabel(selectedEvent.kind)}</div>
              </div>
              <div>
                <span className="font-medium">Author:</span>
                <div className="font-mono text-xs break-all">{selectedEvent.pubkey}</div>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <div>{new Date(selectedEvent.created_at * 1000).toLocaleString()}</div>
              </div>
            </div>
            
            <div>
              <span className="font-medium">Content:</span>
              <div className="mt-1 p-3 bg-muted rounded text-sm">
                {selectedEvent.content}
              </div>
            </div>
            
            {selectedEvent.tags.length > 0 && (
              <div>
                <span className="font-medium">Tags:</span>
                <div className="mt-1">
                  {selectedEvent.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="mr-2 mb-2">
                      {tag.join(':')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export types for external use
export type { NostrEvent, NostrFilter }