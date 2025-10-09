'use client'
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { NostrConfigPanel } from "@/components/nostr-ui/NostrConfigPanel"
import { useNostrConfig } from "@/components/nostr-ui/useNostrConfig"

function Demo() {
  const { config, setConfig, clearConfig, exportConfig, createStoragePlugin, isLoaded, isHydrated } = useNostrConfig()

  // Mock relay health check
  const mockRelayHealth = async (url: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
    return {
      latencyMs: Math.floor(100 + Math.random() * 400),
      ok: Math.random() > 0.2 // 80% success rate
    }
  }

  // Show loading state until config is loaded
  if (!isHydrated || !isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Loading Configuration...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">NostrConfigPanel — MVP Example</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your Nostr connection settings. Changes are automatically saved to your selected storage.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <NostrConfigPanel
          value={config}
          onChange={setConfig}
          relayHealth={mockRelayHealth}
          allowCustomAuth={true}
        />
        
        {/* Config Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">shadcn/ui</Badge>
            <Badge variant="outline">Tailwind</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Auto-saved ({config.storage.type})
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Framework Storage Plugins
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const storagePlugin = createStoragePlugin()
                console.log('Current storage plugin:', storagePlugin)
              }}
            >
              Test Plugin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(exportConfig())
              }}
            >
              Export Config
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('This will reset all settings to defaults. Continue?')) {
                  clearConfig()
                }
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CopyCodeButton({ code }: { code: string }) {
  const [ok, setOk] = useState(false)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={async () => { await navigator.clipboard.writeText(code); setOk(true); setTimeout(()=>setOk(false),1200) }}
            aria-label="Copy code"
            variant="outline"
          >
            {ok ? 'Copied ✓' : 'Copy code'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copies the example usage to your clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function Page() {
  const code = `import { NostrConfigPanel } from "@/components/nostr-ui/NostrConfigPanel"
import { useNostrConfig } from "@/components/nostr-ui/useNostrConfig"

export default function Demo() {
  const { config, setConfig } = useNostrConfig()

  return (
    <NostrConfigPanel
      value={config}
      onChange={setConfig}
      allowCustomAuth={true}
    />
  )
}`
  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">NostrConfigPanel — MVP Example</h1>
        <CopyCodeButton code={code} />
      </header>
      <Separator />
      <Demo />
    </div>
  )
}