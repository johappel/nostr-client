'use client'
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Code, Play, Trash2, Copy } from "lucide-react"

interface NostrFilter {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  '#t'?: string[]
  '#d'?: string[]
  since?: number
  until?: number
  limit?: number
  search?: string
}

function Demo() {
  const [filter, setFilter] = useState<NostrFilter>({
    kinds: [1],
    limit: 20
  })
  
  const [executedQuery, setExecutedQuery] = useState<NostrFilter | null>(null)
  
  const updateFilter = (field: keyof NostrFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const parseArrayInput = (value: string): string[] => {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  
  const parseNumberArrayInput = (value: string): number[] => {
    return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  }
  
  const executeQuery = () => {
    setExecutedQuery(filter)
  }
  
  const clearFilter = () => {
    setFilter({})
    setExecutedQuery(null)
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Visual Query Builder
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Build Nostr queries using form fields
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Types */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kinds">Event Kinds</Label>
              <Input
                id="kinds"
                placeholder="1,6,7,30023 (comma separated)"
                value={filter.kinds?.join(', ') || ''}
                onChange={(e) => updateFilter('kinds', e.target.value ? parseNumberArrayInput(e.target.value) : undefined)}
              />
              <p className="text-xs text-muted-foreground">1=posts, 6=reposts, 7=reactions, 30023=articles</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Result Limit</Label>
              <Input
                id="limit"
                type="number"
                placeholder="20"
                value={filter.limit || ''}
                onChange={(e) => updateFilter('limit', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
          
          {/* Authors & IDs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="authors">Authors (Pubkeys)</Label>
              <Textarea
                id="authors"
                placeholder="npub1... or hex pubkeys (comma separated)"
                value={filter.authors?.join(', ') || ''}
                onChange={(e) => updateFilter('authors', e.target.value ? parseArrayInput(e.target.value) : undefined)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ids">Event IDs</Label>
              <Textarea
                id="ids"
                placeholder="note1... or hex event ids (comma separated)"
                value={filter.ids?.join(', ') || ''}
                onChange={(e) => updateFilter('ids', e.target.value ? parseArrayInput(e.target.value) : undefined)}
                rows={3}
              />
            </div>
          </div>
          
          {/* Tags */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tag-p">Mentioned Users (#p)</Label>
              <Input
                id="tag-p"
                placeholder="pubkeys"
                value={filter['#p']?.join(', ') || ''}
                onChange={(e) => updateFilter('#p', e.target.value ? parseArrayInput(e.target.value) : undefined)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tag-e">Referenced Events (#e)</Label>
              <Input
                id="tag-e"
                placeholder="event ids"
                value={filter['#e']?.join(', ') || ''}
                onChange={(e) => updateFilter('#e', e.target.value ? parseArrayInput(e.target.value) : undefined)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tag-t">Hashtags (#t)</Label>
              <Input
                id="tag-t"
                placeholder="bitcoin,nostr"
                value={filter['#t']?.join(', ') || ''}
                onChange={(e) => updateFilter('#t', e.target.value ? parseArrayInput(e.target.value) : undefined)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tag-d">Identifiers (#d)</Label>
              <Input
                id="tag-d"
                placeholder="identifiers"
                value={filter['#d']?.join(', ') || ''}
                onChange={(e) => updateFilter('#d', e.target.value ? parseArrayInput(e.target.value) : undefined)}
              />
            </div>
          </div>
          
          {/* Time Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="since">Since (Unix Timestamp)</Label>
              <Input
                id="since"
                type="number"
                placeholder="1672531200"
                value={filter.since || ''}
                onChange={(e) => updateFilter('since', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-xs text-muted-foreground">Events after this time</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="until">Until (Unix Timestamp)</Label>
              <Input
                id="until"
                type="number"
                placeholder="1672617600"
                value={filter.until || ''}
                onChange={(e) => updateFilter('until', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-xs text-muted-foreground">Events before this time</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Text (NIP-50)</Label>
            <Input
              id="search"
              placeholder="Search in event content"
              value={filter.search || ''}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={executeQuery} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Execute Query
            </Button>
            <Button variant="outline" onClick={clearFilter}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
          
          {/* Current Filter Preview */}
          <div className="space-y-2">
            <Label>Current Filter Preview</Label>
            <ScrollArea className="h-32 rounded-md border p-4">
              <pre className="text-sm">
                <code>{JSON.stringify(filter, null, 2)}</code>
              </pre>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      
      {/* Query Results */}
      {executedQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Query Executed Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">42</div>
                  <div className="text-sm text-muted-foreground">Events Found</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-muted-foreground">Relays Queried</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-purple-600">182ms</div>
                  <div className="text-sm text-muted-foreground">Query Time</div>
                </Card>
              </div>
              
              <div>
                <Label className="mb-2 block">Executed Query JSON</Label>
                <ScrollArea className="h-32 rounded-md border p-4">
                  <pre className="text-sm">
                    <code>{JSON.stringify(executedQuery, null, 2)}</code>
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
            <Copy className="w-4 h-4 mr-2" />
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
  const exampleCode = `import { QueryBuilder, useQueryBuilder } from "@/components/nostr-ui/QueryBuilder"

export default function MyApp() {
  const { filters, setFilters, executeQuery } = useQueryBuilder({
    initialFilters: [{ kinds: [1], limit: 20 }],
    onExecute: (filters) => {
      console.log('Executing query:', filters)
      // Execute query against your Nostr relays
    }
  })
  
  return (
    <QueryBuilder
      value={filters}
      onChange={setFilters}
      onExecute={executeQuery}
      showPreview={true}
    />
  )
}`

  const frameworkCode = `import { QueryBuilder, useQueryBuilder } from "@johappel/nostr-framework/react"

export default function MyApp() {
  const { filters, setFilters, executeQuery } = useQueryBuilder({
    initialFilters: [{ kinds: [1], limit: 20 }],
    onExecute: (filters) => {
      // Execute query against your Nostr relays
      queryNostrRelays(filters)
    }
  })
  
  return (
    <QueryBuilder
      value={filters}
      onChange={setFilters}
      onExecute={executeQuery}
      components={{
        // Override with your UI components
        Card: MyCard,
        Button: MyButton,
        Input: MyInput
      }}
    />
  )
}`
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">QueryBuilder</h1>
          <CopyCodeButton code={exampleCode} />
        </div>
        <p className="text-muted-foreground">
          Visual form-based query builder for constructing complex Nostr filters.
          Build queries using intuitive form fields instead of writing JSON manually.
        </p>
      </header>
      
      <Separator className="mb-8" />
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">Interactive Query Builder</h2>
          <Demo />
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Usage Examples</h2>
          
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
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Authors</Badge>
                <Badge variant="outline">Kinds</Badge>
                <Badge variant="outline">Tags (#p, #e, #t)</Badge>
                <Badge variant="outline">Time Range</Badge>
                <Badge variant="outline">Search Text</Badge>
                <Badge variant="outline">Event IDs</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Quick Reference</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Event Kinds</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>1 - Text Notes</div>
                <div>6 - Reposts</div>
                <div>7 - Reactions</div>
                <div>30023 - Long-form Articles</div>
                <div>42 - Channel Messages</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Tag Types</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>#p - Mentioned Users</div>
                <div>#e - Referenced Events</div>
                <div>#t - Hashtags</div>
                <div>#d - Identifiers</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Time Filters</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>since - Events after timestamp</div>
                <div>until - Events before timestamp</div>
                <div>Unix timestamps (seconds)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
