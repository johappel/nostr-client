'use client'
import React, { useState } from 'react'
import { UserProfile } from "@/components/nostr-ui/UserProfile"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Edit, 
  Copy, 
  Code,
  RefreshCw,
  Settings,
  Search,
  Plus,
  Globe,
  Zap,
  Calendar,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function Demo() {
  const [pubkey, setPubkey] = useState("npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft")
  const [relays, setRelays] = useState([
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ])
  const [showEdit, setShowEdit] = useState(true)
  const [showCopy, setShowCopy] = useState(true)
  const [showRefresh, setShowRefresh] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [compact, setCompact] = useState(false)
  const [liveMode, setLiveMode] = useState(true)

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

  const handleProfileUpdate = (profile: any) => {
    console.log('Profile updated:', profile)
  }

  const handleProfileLoad = (profile: any) => {
    console.log('Profile loaded:', profile)
  }

  const handleError = (error: string) => {
    console.error('Profile error:', error)
  }

  const customActions = (profile: any) => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">
        <Globe className="h-3 w-3 mr-1" />
        {profile?.nip05 || 'No NIP-05'}
      </Badge>
      <Badge variant="outline">
        <Zap className="h-3 w-3 mr-1" />
        {profile?.lud16 || 'No Lightning'}
      </Badge>
      <Badge variant="outline">
        <Calendar className="h-3 w-3 mr-1" />
        {profile?.createdAt ? new Date(profile.createdAt * 1000).toLocaleDateString() : 'Unknown'}
      </Badge>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profile Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pubkey">Public Key (npub)</Label>
              <Input
                id="pubkey"
                value={pubkey}
                onChange={(e) => setPubkey(e.target.value)}
                placeholder="npub1..."
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Display Mode</Label>
              <Select value={compact ? "compact" : "full"} onValueChange={(value) => setCompact(value === "compact")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select display mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Profile</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showEdit"
                checked={showEdit}
                onChange={(e) => setShowEdit(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showEdit">Edit Button</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showCopy"
                checked={showCopy}
                onChange={(e) => setShowCopy(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showCopy">Copy Button</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRefresh"
                checked={showRefresh}
                onChange={(e) => setShowRefresh(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showRefresh">Refresh Button</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showStats"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showStats">Show Stats</Label>
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

      <UserProfile
        pubkey={pubkey}
        relays={relays}
        showEditButton={showEdit}
        showCopyButton={showCopy}
        showRefreshButton={showRefresh}
        showStats={showStats}
        compact={compact}
        onProfileUpdate={handleProfileUpdate}
        onProfileLoad={handleProfileLoad}
        onError={handleError}
        renderActions={customActions}
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
  const exampleCode = `import { UserProfile } from "@/components/nostr-ui/UserProfile"

export default function App() {
  return (
    <UserProfile
      pubkey="npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft"
      relays={[
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social'
      ]}
      live={true}
      showEditButton={true}
      showCopyButton={true}
      showRefreshButton={true}
      showStats={true}
      onProfileUpdate={(profile) => console.log('Profile updated:', profile)}
      onProfileLoad={(profile) => console.log('Profile loaded:', profile)}
      onError={(error) => console.error('Profile error:', error)}
    />
  )
}`

  const frameworkCode = `import { UserProfile, useUserProfile } from "@johappel/nostr-framework/react"
import type { UserProfile as UserProfileType } from "@johappel/nostr-framework/react"

export default function App() {
  // Custom profile rendering
  const renderHeader = (profile: UserProfileType | null) => {
    return (
      <div className="custom-header">
        <h1>{profile?.displayName || profile?.name || 'Anonymous'}</h1>
        <p>{profile?.about}</p>
      </div>
    )
  }

  // Custom actions
  const renderActions = (profile: UserProfileType | null) => {
    return (
      <div className="custom-actions">
        <button onClick={() => console.log('Custom action')}>
          Custom Action
        </button>
      </div>
    )
  }

  return (
    <UserProfile
      pubkey="npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft"
      relays={['wss://relay.damus.io']}
      live={true}
      renderHeader={renderHeader}
      renderActions={renderActions}
      components={{
        Container: ({ children }) => (
          <div className="custom-container">{children}</div>
        ),
        Header: ({ profile, onRefresh }) => (
          <div className="custom-header">
            <h2>Custom Header</h2>
            <button onClick={onRefresh}>Refresh</button>
          </div>
        )
      }}
    />
  )
}`

  const advancedCode = `import { UserProfile, useUserProfile } from "@/components/nostr-ui/UserProfile"

export default function AdvancedExample() {
  const [selectedPubkey, setSelectedPubkey] = useState("")
  
  // Handle profile updates
  const handleProfileUpdate = (profile: any) => {
    console.log('Profile was updated:', profile)
    // Show success notification
  }
  
  // Handle profile loading
  const handleProfileLoad = (profile: any) => {
    console.log('Profile loaded:', profile)
    // Update UI state
  }
  
  // Custom error handling
  const handleError = (error: string) => {
    console.error('Profile error:', error)
    // Show error notification
  }
  
  // Custom actions with profile data
  const customActions = (profile: any) => (
    <div className="flex gap-2">
      {profile?.nip05 && (
        <button onClick={() => window.open(\`https://\${profile.nip05.split('@')[1]}\`, '_blank')}>
          Visit Website
        </button>
      )}
      {profile?.lud16 && (
        <button onClick={() => console.log('Send zap to:', profile.lud16)}>
          Send Zap
        </button>
      )}
    </div>
  )
  
  return (
    <div>
      <input
        type="text"
        placeholder="Enter npub..."
        value={selectedPubkey}
        onChange={(e) => setSelectedPubkey(e.target.value)}
      />
      
      {selectedPubkey && (
        <UserProfile
          pubkey={selectedPubkey}
          live={true}
          showStats={true}
          onProfileUpdate={handleProfileUpdate}
          onProfileLoad={handleProfileLoad}
          onError={handleError}
          renderActions={customActions}
        />
      )}
    </div>
  )
}`

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">UserProfile</h1>
          <CopyCodeButton code={exampleCode} />
        </div>
        <p className="text-muted-foreground">
          A comprehensive user profile component for Nostr applications with support for 
          viewing and editing Kind 0 metadata, live updates, and customizable rendering.
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
                <User className="w-4 h-4" />
                Profile Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>View and edit Nostr user profiles with support for all Kind 0 metadata fields.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Kind 0</Badge>
                <Badge variant="outline">Metadata</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Live Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Real-time profile updates with configurable polling intervals and instant refresh.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Real-time</Badge>
                <Badge variant="outline">WebSocket</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Built-in profile editing with form validation and optimistic updates.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Forms</Badge>
                <Badge variant="outline">Validation</Badge>
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
              <p>Override any UI component or provide custom rendering for full control.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Components</Badge>
                <Badge variant="outline">Rendering</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Data Export
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Copy profile data to clipboard with one-click export functionality.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Export</Badge>
                <Badge variant="outline">Clipboard</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                NIP Support
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Full support for NIP-05 verification and LUD-16 Lightning addresses.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">NIP-05</Badge>
                <Badge variant="outline">LUD-16</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
