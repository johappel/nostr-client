'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, AlertCircle, CheckCircle2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export type RelayConfig = { 
  url: string
  read: boolean
  write: boolean
}

export interface NostrConfigPanelProps {
  value: {
    relays: RelayConfig[]
    auth: { type: 'nip07' | 'bunker' | 'local'; uri?: string }
    storage: { type: 'indexeddb' | 'server-db' }
    policy?: { allowPublishKinds: number[]; allowDelete?: boolean }
  }
  onChange: (next: NostrConfigPanelProps['value']) => void
  relayHealth?: (url: string) => Promise<{ latencyMs: number; ok: boolean }>
  allowCustomAuth?: boolean
  className?: string
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.current.fyi'
]

export function NostrConfigPanel({
  value,
  onChange,
  relayHealth,
  allowCustomAuth = true,
  className = ''
}: NostrConfigPanelProps) {
  const [newRelayUrl, setNewRelayUrl] = useState('')
  const [relayHealthStatus, setRelayHealthStatus] = useState<Map<string, { latencyMs: number; ok: boolean }>>(new Map())
  const [healthChecking, setHealthChecking] = useState<Set<string>>(new Set())

  // Test relay health
  const testRelayHealth = async (url: string) => {
    if (!relayHealth) return

    setHealthChecking(prev => new Set(prev).add(url))
    try {
      const result = await relayHealth(url)
      setRelayHealthStatus(prev => new Map(prev).set(url, result))
    } catch (error) {
      setRelayHealthStatus(prev => new Map(prev).set(url, { latencyMs: 0, ok: false }))
    } finally {
      setHealthChecking(prev => {
        const next = new Set(prev)
        next.delete(url)
        return next
      })
    }
  }

  // Add relay
  const addRelay = () => {
    if (!newRelayUrl.trim()) return
    
    const url = newRelayUrl.trim()
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      return // Invalid URL
    }

    if (value.relays.some(r => r.url === url)) {
      return // Already exists
    }

    const newRelay: RelayConfig = { url, read: true, write: true }
    onChange({
      ...value,
      relays: [...value.relays, newRelay]
    })
    setNewRelayUrl('')
    
    // Test health if available
    if (relayHealth) {
      testRelayHealth(url)
    }
  }

  // Remove relay
  const removeRelay = (index: number) => {
    const newRelays = value.relays.filter((_, i) => i !== index)
    onChange({
      ...value,
      relays: newRelays
    })
  }

  // Toggle relay read/write
  const toggleRelay = (index: number, field: 'read' | 'write') => {
    const newRelays = value.relays.map((relay, i) => 
      i === index ? { ...relay, [field]: !relay[field] } : relay
    )
    onChange({
      ...value,
      relays: newRelays
    })
  }

  // Update auth method
  const updateAuth = (type: 'nip07' | 'bunker' | 'local', uri?: string) => {
    onChange({
      ...value,
      auth: { type, uri }
    })
  }

  // Update storage type
  const updateStorage = (type: 'indexeddb' | 'server-db') => {
    onChange({
      ...value,
      storage: { type }
    })
  }

  // Add suggested relay
  const addSuggestedRelay = (url: string) => {
    if (value.relays.some(r => r.url === url)) return
    
    const newRelay: RelayConfig = { url, read: true, write: true }
    onChange({
      ...value,
      relays: [...value.relays, newRelay]
    })
    
    if (relayHealth) {
      testRelayHealth(url)
    }
  }

  // Get health badge
  const getHealthBadge = (url: string) => {
    const isChecking = healthChecking.has(url)
    const status = relayHealthStatus.get(url)

    if (isChecking) {
      return <Badge variant="outline">Testing...</Badge>
    }

    if (!status) {
      return null
    }

    if (status.ok) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {status.latencyMs}ms
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Offline
        </Badge>
      )
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Relays Section */}
      <Card>
        <CardHeader>
          <CardTitle>Relay Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Relays */}
          <div className="space-y-3">
            {value.relays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relays configured</p>
            ) : (
              value.relays.map((relay, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{relay.url}</span>
                      {getHealthBadge(relay.url)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={relay.read}
                          onCheckedChange={() => toggleRelay(index, 'read')}
                          id={`read-${index}`}
                        />
                        <Label htmlFor={`read-${index}`} className="text-sm">Read</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={relay.write}
                          onCheckedChange={() => toggleRelay(index, 'write')}
                          id={`write-${index}`}
                        />
                        <Label htmlFor={`write-${index}`} className="text-sm">Write</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRelay(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add New Relay */}
          <div className="flex gap-2">
            <Input
              placeholder="wss://relay.example.com"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRelay()}
            />
            <Button onClick={addRelay} disabled={!newRelayUrl.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Suggested Relays */}
          {value.relays.length === 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Popular relays:</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_RELAYS.map(url => (
                  <Button
                    key={url}
                    variant="outline"
                    size="sm"
                    onClick={() => addSuggestedRelay(url)}
                  >
                    {url.replace('wss://', '')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Authentication Method</Label>
            <Select value={value.auth.type} onValueChange={(type: 'nip07' | 'bunker' | 'local') => updateAuth(type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nip07">NIP-07 (Browser Extension)</SelectItem>
                {allowCustomAuth && <SelectItem value="bunker">NIP-46 (Remote Bunker)</SelectItem>}
                {allowCustomAuth && <SelectItem value="local">Local Key</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {value.auth.type === 'bunker' && (
            <div className="space-y-2">
              <Label>Bunker URI</Label>
              <Input
                placeholder="bunker://pubkey@relay.example.com"
                value={value.auth.uri || ''}
                onChange={(e) => updateAuth('bunker', e.target.value)}
              />
            </div>
          )}

          {value.auth.type === 'nip07' && (
            <div className="text-sm text-muted-foreground relative z-0">
              Make sure you have a Nostr browser extension installed (like Alby, nos2x, or Flamingo).
            </div>
          )}

          {value.auth.type === 'local' && (
            <div className="text-sm text-muted-foreground relative z-0">
              ⚠️ Local keys are stored in your browser. Use with caution.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Section */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Storage Type</Label>
            <Select value={value.storage.type} onValueChange={(type: 'indexeddb' | 'server-db') => updateStorage(type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indexeddb">IndexedDB (Local)</SelectItem>
                <SelectItem value="server-db">Server Database</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground relative z-0">
            {value.storage.type === 'indexeddb' 
              ? 'Events are stored locally in your browser.'
              : 'Events are stored on the server (requires authentication).'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}