'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react"

export interface LoginProvider {
  kind: 'nip07' | 'bunker' | 'local'
  uri?: string
  label?: string
}

export interface LoginSelectorProps {
  providers?: LoginProvider[]
  onChoose: (provider: LoginProvider) => void
  detectInstalled?: boolean
  className?: string
}

const DEFAULT_PROVIDERS: LoginProvider[] = [
  { kind: 'nip07' },
  { kind: 'bunker' },
  { kind: 'local' }
]

/**
 * Styled Login Selector Component for Examples
 * 
 * Uses shadcn/ui components for a polished look.
 * Perfect for copy-paste into user projects.
 */
export function LoginSelector({
  providers = DEFAULT_PROVIDERS,
  onChoose,
  detectInstalled = true,
  className = ''
}: LoginSelectorProps) {
  const [hasNip07, setHasNip07] = useState(false)
  const [bunkerUri, setBunkerUri] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<LoginProvider['kind'] | null>(null)

  // Detect NIP-07 browser extension
  useEffect(() => {
    if (!detectInstalled || typeof window === 'undefined') return

    const checkNip07 = () => {
      setHasNip07(!!(window as any).nostr)
    }

    checkNip07()
    
    // Re-check after a short delay (extensions might load asynchronously)
    const timer = setTimeout(checkNip07, 1000)
    return () => clearTimeout(timer)
  }, [detectInstalled])

  const handleProviderSelect = (kind: LoginProvider['kind']) => {
    setSelectedProvider(kind)
    
    if (kind === 'bunker') {
      // Wait for URI input
      return
    }
    
    const provider: LoginProvider = { kind }
    onChoose(provider)
  }

  const handleBunkerSubmit = () => {
    if (!bunkerUri.trim()) return
    
    const provider: LoginProvider = { 
      kind: 'bunker', 
      uri: bunkerUri.trim() 
    }
    onChoose(provider)
  }

  const isProviderEnabled = (kind: LoginProvider['kind']) => {
    return providers.some(p => p.kind === kind)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Connect to Nostr</h2>
        <p className="text-muted-foreground">
          Choose your preferred authentication method to continue
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 max-w-md mx-auto">
        {/* NIP-07 Browser Extension */}
        {isProviderEnabled('nip07') && (
          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Browser Extension</CardTitle>
                {hasNip07 && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Detected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use your Nostr browser extension like Alby, nos2x, or Flamingo
              </p>
              
              {hasNip07 ? (
                <Button
                  onClick={() => handleProviderSelect('nip07')}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Continue with Extension
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => handleProviderSelect('nip07')}
                    className="w-full"
                    size="lg"
                  >
                    Try Extension Login
                  </Button>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No extension detected. Install{' '}
                      <a 
                        href="https://getalby.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline inline-flex items-center"
                      >
                        Alby <ExternalLink className="w-3 h-3 ml-1" />
                      </a>{' '}
                      or{' '}
                      <a 
                        href="https://github.com/fiatjaf/nos2x" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline inline-flex items-center"
                      >
                        nos2x <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* NIP-46 Remote Bunker */}
        {isProviderEnabled('bunker') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Remote Bunker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect to a remote signing service via NIP-46
              </p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="bunker-uri">Bunker URI</Label>
                  <Input
                    id="bunker-uri"
                    placeholder="bunker://pubkey@relay.example.com"
                    value={bunkerUri}
                    onChange={(e) => setBunkerUri(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBunkerSubmit()}
                  />
                </div>
                <Button
                  onClick={handleBunkerSubmit}
                  disabled={!bunkerUri.trim()}
                  className="w-full"
                  size="lg"
                >
                  Connect to Bunker
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Need a bunker? Try{' '}
                  <a 
                    href="https://nsecbunker.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline inline-flex items-center"
                  >
                    nsecBunker <ExternalLink className="w-3 h-3 ml-1" />
                  </a>{' '}
                  or{' '}
                  <a 
                    href="https://nsec.app" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline inline-flex items-center"
                  >
                    nsec.app <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Local Key */}
        {isProviderEnabled('local') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Local Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use a private key stored locally in your browser
              </p>
              
              <Button
                variant="outline"
                onClick={() => handleProviderSelect('local')}
                className="w-full"
                size="lg"
              >
                Use Local Key
              </Button>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Warning:</strong> Local keys are stored in your browser. 
                  Only use this for testing or if you understand the security implications.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>

      {providers.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No authentication providers configured. Please configure at least one provider.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}