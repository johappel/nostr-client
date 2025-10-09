'use client'
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card" 
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoginSelector, type LoginProvider } from "@/components/nostr-ui/LoginSelector"
import { useLogin } from "@/components/nostr-ui/useLogin"
import { CheckCircle2, LogOut, Copy, Code } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"

function Demo() {
  const { isLoggedIn, provider, pubkey, error, isLoading, login, logout, clearError } = useLogin()
  
  const handleProviderChoose = async (selectedProvider: LoginProvider) => {
    await login(selectedProvider)
  }

  if (isLoggedIn && provider && pubkey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="default" className="capitalize">
            {provider.kind}
          </Badge>
          <code className="text-xs bg-muted p-2 rounded block break-all">
            {pubkey}
          </code>
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LoginSelector Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <LoginSelector onChoose={handleProviderChoose} detectInstalled={true} />
        {isLoading && <div>Loading...</div>}
      </CardContent>
    </Card>
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
  const exampleCode = `import { LoginSelector, useLogin } from "@/components/nostr-ui/LoginSelector"

export default function MyApp() {
  const { login, logout, isLoggedIn, pubkey } = useLogin()
  
  return (
    <LoginSelector 
      onChoose={login}
      detectInstalled={true}
    />
  )
}`

  const frameworkCode = `import { LoginSelector, useLogin } from "@johappel/nostr-framework/react"

export default function MyApp() {
  const { login, logout, isLoggedIn, pubkey } = useLogin()
  
  return (
    <LoginSelector 
      onChoose={login}
      detectInstalled={true}
      components={{
        // Override with your UI components
        Card: MyCard,
        Button: MyButton,
        Alert: MyAlert
      }}
    />
  )
}`

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">LoginSelector</h1>
          <CopyCodeButton code={exampleCode} />
        </div>
        <p className="text-muted-foreground">
          A comprehensive authentication selector that supports NIP-07 browser extensions, 
          NIP-46 bunker connections, and local key management.
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Development (Examples)</CardTitle>
              <CopyCodeButton code={exampleCode} label="Copy" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded-md border p-4">
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
              <ScrollArea className="h-48 rounded-md border p-4">
                <pre className="text-sm">
                  <code>{frameworkCode}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Browser Extensions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Automatically detects NIP-07 extensions:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">nos2x</Badge>
                <Badge variant="outline">Alby</Badge>
                <Badge variant="outline">Flamingo</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Remote Signing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Connect via NIP-46:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Bunker URI</Badge>
                <Badge variant="outline">Secure</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Local Keys</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Import or generate keys:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">nsec Import</Badge>
                <Badge variant="outline">Generation</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dual Implementation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Two variants available:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Headless</Badge>
                <Badge variant="default">Styled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
