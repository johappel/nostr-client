'use client'
import React, { useState } from 'react'
import { EventsList } from "@/components/nostr-ui/EventsList"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card" 
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageSquare, 
  Users, 
  Heart, 
  Zap, 
  Filter,
  Copy, 
  Code,
  RefreshCw,
  Settings,
  Search,
  Plus
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function Demo() {
  const [filters, setFilters] = useState<any[]>([{ kinds: [1, 3, 7, 9735] }])
  const [selectedKind, setSelectedKind] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [liveMode, setLiveMode] = useState(true)
  const [relays, setRelays] = useState([
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ])

  const handleKindChange = (kind: string) => {
    setSelectedKind(kind)
    
    if (kind === "all") {
      setFilters([{ kinds: [1, 3, 7, 9735] }])
    } else {
      const kindNum = parseInt(kind)
      setFilters([{ kinds: [kindNum] }])
    }
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    
    if (term.trim()) {
      setFilters([{ 
        kinds: selectedKind === "all" ? [1, 3, 7, 9735] : [parseInt(selectedKind)],
        search: term.trim()
      }])
    } else {
      handleKindChange(selectedKind)
    }
  }

  const addRelay = () => {
    if (relays.length < 5) {
      setRelays([...relays, 'wss://new.relay.example.com'])
    }
  }

  const removeRelay = (index: number) => {
    if (relays.length > 1) {
      setRelays(relays.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Event Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-kind">Event Kind</Label>
              <Select value={selectedKind} onValueChange={handleKindChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kinds</SelectItem>
                  <SelectItem value="1">Text Notes</SelectItem>
                  <SelectItem value="3">Follow Lists</SelectItem>
                  <SelectItem value="7">Reactions</SelectItem>
                  <SelectItem value="9735">Zaps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search">Search Content</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Live Mode</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={liveMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLiveMode(true)}
                >
                  Live
                </Button>
                <Button
                  variant={!liveMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLiveMode(false)}
                >
                  Static
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Relays ({relays.length})</Label>
            <div className="flex flex-wrap gap-2">
              {relays.map((relay, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {relay.replace('wss://', '')}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeRelay(index)}
                  >
                    ×
                  </Button>
                </Badge>
              ))}
              {relays.length < 5 && (
                <Button variant="outline" size="sm" onClick={addRelay}>
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EventsList
        filters={filters}
        relays={relays}
        live={liveMode}
        limit={20}
        autoLoad={true}
        showFilters={false}
        showStats={true}
        onEventClick={(event) => {
          console.log('Event clicked:', event.id)
        }}
      />
    </div>
  )
}

function CopyCodeButton({ code, label = "Copy Code" }: { code: string, label?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
          >
            <Code className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy example usage to clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function Page() {
  const exampleCode = `import { EventsList } from "@/components/nostr-ui/EventsList"
import type { NostrFilter } from "@/components/nostr-ui/EventsList"

export default function MyApp() {
  const filters: NostrFilter[] = [
    { kinds: [1, 3, 7, 9735] }, // Text notes, follows, reactions, zaps
    { limit: 50 }
  ]
  
  const relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ]
  
  return (
    <EventsList
      filters={filters}
      relays={relays}
      live={true}
      onEventClick={(event) => {
        console.log('Event clicked:', event.id)
      }}
    />
  )
}`

  const frameworkCode = `import { EventsList, useEventsList } from "@johappel/nostr-framework/react"
import type { NostrFilter, NostrEvent } from "@johappel/nostr-framework/react"

export default function MyApp() {
  const filters: NostrFilter[] = [
    { kinds: [1, 3, 7, 9735] },
    { limit: 50 }
  ]
  
  const relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ]
  
  // Custom event rendering
  const renderEvent = (event: NostrEvent) => {
    return (
      <div className="my-event-item">
        <h4>{event.content}</h4>
        <small>Kind: {event.kind}</small>
      </div>
    )
  }
  
  return (
    <EventsList
      filters={filters}
      relays={relays}
      live={true}
      renderEvent={renderEvent}
      components={{
        EventItem: MyCustomEventItem,
        Loading: MyCustomLoader,
        Empty: MyCustomEmptyState
      }}
    />
  )
}`

  const advancedCode = `import { EventsList, useEventsList } from "@/components/nostr-ui/EventsList"

export default function AdvancedExample() {
  const [filters, setFilters] = useState([])
  
  // Search events
  const handleSearch = (query: string) => {
    if (query.trim()) {
      setFilters([{ 
        kinds: [1], 
        search: query.trim(),
        limit: 20 
      }])
    } else {
      setFilters([{ kinds: [1, 3, 7, 9735], limit: 20 }])
    }
  }
  
  // Real-time subscription to user's follows
  const handleUserSelect = (pubkey: string) => {
    setFilters([{ 
      '#p': [pubkey], 
      kinds: [1, 6, 7], 
      limit: 50 
    }])
  }
  
  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      <EventsList
        filters={filters}
        live={true}
        virtualized={true}
        maxHeight={600}
        onEventClick={handleEventClick}
      />
    </div>
  )
}`

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">EventsList</h1>
          <CopyCodeButton code={exampleCode} />
        </div>
        <p className="text-muted-foreground">
          A powerful, virtualized event list component with real-time subscriptions, 
          filtering, and custom rendering support for Nostr events.
        </p>
      </header>
      
      <Separator className="mb-8" />
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Live Demo</h2>
          <Demo />
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Usage Examples</h2>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="framework">Framework</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Development (Examples)</CardTitle>
                  <CopyCodeButton code={exampleCode} label="Copy" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 rounded-md border p-4">
                    <pre className="text-sm">
                      <code>{exampleCode}</code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="framework" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Production (npm)</CardTitle>
                  <CopyCodeButton code={frameworkCode} label="Copy" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 rounded-md border p-4">
                    <pre className="text-sm">
                      <code>{frameworkCode}</code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Advanced Features</CardTitle>
                  <CopyCodeButton code={advancedCode} label="Copy" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 rounded-md border p-4">
                    <pre className="text-sm">
                      <code>{advancedCode}</code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Live subscriptions to nostr relays with instant updates when new events arrive.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">WebSocket</Badge>
                <Badge variant="outline">Live</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Advanced Filtering
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Support for all Nostr filter types including kinds, authors, tags, and search.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Kinds</Badge>
                <Badge variant="outline">Authors</Badge>
                <Badge variant="outline">Tags</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Custom Rendering
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Override any UI component or provide custom event rendering for full control.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Components</Badge>
                <Badge variant="outline">Rendering</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Deduplication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Automatic deduplication by event ID prevents duplicates from multiple relays.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Smart</Badge>
                <Badge variant="outline">Efficient</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Virtualization
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Virtual scrolling for handling thousands of events without performance issues.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Performance</Badge>
                <Badge variant="outline">Scrolling</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Optimistic Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Instant UI updates when publishing events with automatic roll-back on errors.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Fast</Badge>
                <Badge variant="outline">Responsive</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
