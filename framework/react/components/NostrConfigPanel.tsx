import React, { useState } from 'react'

export type RelayConfig = { 
  url: string
  read: boolean
  write: boolean
}

export interface NostrConfigPanelProps {
  value: {
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
  onChange: (next: NostrConfigPanelProps['value']) => void
  relayHealth?: (url: string) => Promise<{ latencyMs: number; ok: boolean }>
  allowCustomAuth?: boolean
  className?: string
  // UI component overrides for custom styling
  components?: {
    Card?: React.ComponentType<any>
    Button?: React.ComponentType<any>
    Input?: React.ComponentType<any>
    Select?: React.ComponentType<any>
    Switch?: React.ComponentType<any>
    Label?: React.ComponentType<any>
    Badge?: React.ComponentType<any>
  }
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.current.fyi'
]

/**
 * Headless Nostr Configuration Panel
 * 
 * This is a framework-agnostic component that can be styled with any UI library.
 * For shadcn/ui integration, use the version from @johappel/nostr-client/examples
 */
export function NostrConfigPanel({
  value,
  onChange,
  relayHealth,
  allowCustomAuth = true,
  className = '',
  components = {}
}: NostrConfigPanelProps) {
  const [newRelayUrl, setNewRelayUrl] = useState('')
  const [relayHealthStatus, setRelayHealthStatus] = useState<Map<string, { latencyMs: number; ok: boolean }>>(new Map())
  const [healthChecking, setHealthChecking] = useState<Set<string>>(new Set())

  // Default components (basic HTML elements)
  const {
    Card = ({ children, ...props }: any) => <div className={`border rounded-lg p-4 ${props.className || ''}`}>{children}</div>,
    Button = ({ children, onClick, disabled, className, ...props }: any) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    ),
    Input = ({ placeholder, value, onChange, onKeyDown, className, ...props }: any) => (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`px-3 py-2 border rounded w-full ${className || ''}`}
        {...props}
      />
    ),
    Select = ({ value, onValueChange, children, className }: any) => (
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`px-3 py-2 border rounded w-full ${className || ''}`}
      >
        {children}
      </select>
    ),
    Switch = ({ checked, onCheckedChange, id, className }: any) => (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        id={id}
        className={`${className || ''}`}
      />
    ),
    Label = ({ children, htmlFor, className }: any) => (
      <label htmlFor={htmlFor} className={`text-sm font-medium ${className || ''}`}>
        {children}
      </label>
    ),
    Badge = ({ children, variant, className }: any) => (
      <span className={`px-2 py-1 text-xs rounded ${variant === 'destructive' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} ${className || ''}`}>
        {children}
      </span>
    )
  } = components

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
  const updateStorage = (type: 'localStorage' | 'sqlite' | 'sqlite-file', config?: any) => {
    onChange({
      ...value,
      storage: { type, config: { ...value.storage.config, ...config } }
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
        <Badge variant="default" className="bg-green-100 text-green-800">
          ✓ {status.latencyMs}ms
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive">
          ✗ Offline
        </Badge>
      )
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Relays Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Relay Connections</h3>
        <div className="space-y-4">
          {/* Current Relays */}
          <div className="space-y-3">
            {value.relays.length === 0 ? (
              <p className="text-sm text-gray-500">No relays configured</p>
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
                        <Label htmlFor={`read-${index}`}>Read</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={relay.write}
                          onCheckedChange={() => toggleRelay(index, 'write')}
                          id={`write-${index}`}
                        />
                        <Label htmlFor={`write-${index}`}>Write</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeRelay(index)}
                    className="shrink-0 bg-red-50 text-red-600 border-red-200"
                  >
                    Remove
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
              onChange={(e: any) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && addRelay()}
            />
            <Button onClick={addRelay} disabled={!newRelayUrl.trim()}>
              Add Relay
            </Button>
          </div>

          {/* Suggested Relays */}
          {value.relays.length === 0 && (
            <div className="space-y-2">
              <Label className="font-medium">Popular relays:</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_RELAYS.map(url => (
                  <Button
                    key={url}
                    onClick={() => addSuggestedRelay(url)}
                    className="text-sm"
                  >
                    {url.replace('wss://', '')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Authentication Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Authentication Method</Label>
            <Select value={value.auth.type} onValueChange={(type: string) => updateAuth(type as any)}>
              <option value="nip07">NIP-07 (Browser Extension)</option>
              {allowCustomAuth && <option value="bunker">NIP-46 (Remote Bunker)</option>}
              {allowCustomAuth && <option value="local">Local Key</option>}
            </Select>
          </div>

          {value.auth.type === 'bunker' && (
            <div className="space-y-2">
              <Label>Bunker URI</Label>
              <Input
                placeholder="bunker://pubkey@relay.example.com"
                value={value.auth.uri || ''}
                onChange={(e: any) => updateAuth('bunker', e.target.value)}
              />
            </div>
          )}

          {value.auth.type === 'nip07' && (
            <div className="text-sm text-gray-600">
              Make sure you have a Nostr browser extension installed (like Alby, nos2x, or Flamingo).
            </div>
          )}

          {value.auth.type === 'local' && (
            <div className="text-sm text-gray-600">
              ⚠️ Local keys are stored in your browser. Use with caution.
            </div>
          )}
        </div>
      </Card>

      {/* Storage Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Storage</h3>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Storage Type</Label>
            <Select value={value.storage.type} onValueChange={(type: string) => updateStorage(type as any)}>
              <option value="localStorage">LocalStorage Plugin</option>
              <option value="sqlite">SQLite Plugin (WASM)</option>
              <option value="sqlite-file">SQLite File Plugin (Node.js)</option>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            {value.storage.type === 'localStorage' && 
              'Events stored in browser localStorage (~5-10MB limit). Fast for small datasets.'
            }
            {value.storage.type === 'sqlite' && 
              'Events stored in SQLite WASM database. Scalable for large datasets with SQL queries.'
            }
            {value.storage.type === 'sqlite-file' && 
              'Events stored in SQLite file. Requires Node.js environment.'
            }
          </div>

          {/* Storage Configuration */}
          {value.storage.type === 'localStorage' && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="font-medium">LocalStorage Configuration</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Key Prefix</Label>
                  <Input
                    placeholder="nostr_events_"
                    value={value.storage.config?.keyPrefix || ''}
                    onChange={(e: any) => updateStorage(value.storage.type, { keyPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Events</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={value.storage.config?.maxEvents || ''}
                    onChange={(e: any) => updateStorage(value.storage.type, { maxEvents: parseInt(e.target.value) || 1000 })}
                  />
                </div>
              </div>
            </div>
          )}

          {(value.storage.type === 'sqlite' || value.storage.type === 'sqlite-file') && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="font-medium">SQLite Configuration</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Database Name</Label>
                  <Input
                    placeholder="nostr_events.db"
                    value={value.storage.config?.dbName || ''}
                    onChange={(e: any) => updateStorage(value.storage.type, { dbName: e.target.value })}
                  />
                </div>
                {value.storage.type === 'sqlite-file' && (
                  <div className="space-y-2">
                    <Label className="text-xs">File Path</Label>
                    <Input
                      placeholder="./nostr_events.db"
                      value={value.storage.config?.filePath || ''}
                      onChange={(e: any) => updateStorage(value.storage.type, { filePath: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}