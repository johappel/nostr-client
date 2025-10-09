    'use client'
    import React, { useState } from 'react'
    import { Button } from "@/components/ui/button"
    import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
    import { Separator } from "@/components/ui/separator"
    import { Textarea } from "@/components/ui/textarea"
    import { ScrollArea } from "@/components/ui/scroll-area"
    import { Badge } from "@/components/ui/badge"
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

    function Stub() {
      return (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Channeleventslist — MVP Example</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is a stub preview. Replace with the real import:
            </p>
            <ScrollArea className="h-40 rounded-md border p-3">
              <pre className="text-xs leading-relaxed"><code>{`import { Channeleventslist } from "@/components/nostr-ui/Channeleventslist"

export default function Demo() {
  return <Channeleventslist />
}`}</code></pre>
            </ScrollArea>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">shadcn/ui</Badge>
              <Badge variant="outline">Tailwind</Badge>
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
      const code = `import { Channeleventslist } from "@/components/nostr-ui/Channeleventslist"

export default function Demo() {
  return <Channeleventslist />
}`
      return (
        <div className="mx-auto max-w-3xl p-4 space-y-4">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Channeleventslist — MVP Example</h1>
            <CopyCodeButton code={code} />
          </header>
          <Separator />
          <Stub />
        </div>
      )
    }
