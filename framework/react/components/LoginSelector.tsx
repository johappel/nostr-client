import React, { useState, useEffect } from 'react'

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
  // UI component overrides for custom styling
  components?: {
    Card?: React.ComponentType<any>
    Button?: React.ComponentType<any>
    Input?: React.ComponentType<any>
    Badge?: React.ComponentType<any>
    Alert?: React.ComponentType<any>
  }
}

const DEFAULT_PROVIDERS: LoginProvider[] = [
  { kind: 'nip07' },
  { kind: 'bunker' },
  { kind: 'local' }
]

/**
 * Headless Login Selector Component
 * 
 * Provides authentication method selection with auto-detection of browser extensions.
 * Framework-agnostic component that can be styled with any UI library.
 */
export function LoginSelector({
  providers = DEFAULT_PROVIDERS,
  onChoose,
  detectInstalled = true,
  className = '',
  components = {}
}: LoginSelectorProps) {
  const [hasNip07, setHasNip07] = useState(false)
  const [bunkerUri, setBunkerUri] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<LoginProvider['kind'] | null>(null)

  // Default components (basic HTML elements)
  const {
    Card = ({ children, title, ...props }: any) => (
      <div className={`border rounded-lg p-4 ${props.className || ''}`}>
        {title && <h3 className="font-semibold mb-2">{title}</h3>}
        {children}
      </div>
    ),
    Button = ({ children, onClick, disabled, variant, className, ...props }: any) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded border ${
          variant === 'default' ? 'bg-blue-500 text-white border-blue-500' :
          variant === 'outline' ? 'border-gray-300 hover:bg-gray-50' :
          'border-gray-300 hover:bg-gray-50'
        } disabled:opacity-50 ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    ),
    Input = ({ placeholder, value, onChange, className, ...props }: any) => (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`px-3 py-2 border rounded w-full ${className || ''}`}
        {...props}
      />
    ),
    Badge = ({ children, variant, className }: any) => (
      <span className={`px-2 py-1 text-xs rounded ${
        variant === 'success' ? 'bg-green-100 text-green-800' :
        variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
        'bg-blue-100 text-blue-800'
      } ${className || ''}`}>
        {children}
      </span>
    ),
    Alert = ({ children, variant, className }: any) => (
      <div className={`p-3 rounded ${
        variant === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
        'bg-blue-50 border border-blue-200 text-blue-800'
      } ${className || ''}`}>
        {children}
      </div>
    )
  } = components

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
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-4">
        {/* NIP-07 Browser Extension */}
        {isProviderEnabled('nip07') && (
          <Card title="Browser Extension" className="relative">
            {hasNip07 && (
              <Badge variant="success" className="absolute top-2 right-2">
                ✓ Detected
              </Badge>
            )}
            <p className="text-sm text-gray-600 mb-3">
              Use your Nostr browser extension (Alby, nos2x, Flamingo, etc.)
            </p>
            {hasNip07 ? (
              <Button
                variant="default"
                onClick={() => handleProviderSelect('nip07')}
                className="w-full"
              >
                Continue with Browser Extension
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleProviderSelect('nip07')}
                  className="w-full"
                >
                  Try Browser Extension
                </Button>
                <Alert variant="warning">
                  No Nostr extension detected. Please install a browser extension like{' '}
                  <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="underline">
                    Alby
                  </a>{' '}
                  or{' '}
                  <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="underline">
                    nos2x
                  </a>
                  .
                </Alert>
              </div>
            )}
          </Card>
        )}

        {/* NIP-46 Remote Bunker */}
        {isProviderEnabled('bunker') && (
          <Card title="Remote Bunker (NIP-46)">
            <p className="text-sm text-gray-600 mb-3">
              Connect to a remote signing service or bunker URL
            </p>
            <div className="space-y-3">
              <Input
                placeholder="bunker://pubkey@relay.example.com"
                value={bunkerUri}
                onChange={(e: any) => setBunkerUri(e.target.value)}
              />
              <Button
                variant="default"
                onClick={handleBunkerSubmit}
                disabled={!bunkerUri.trim()}
                className="w-full"
              >
                Connect to Bunker
              </Button>
            </div>
            <Alert className="mt-3">
              <strong>Need a bunker?</strong> Try{' '}
              <a href="https://nsecbunker.com" target="_blank" rel="noopener noreferrer" className="underline">
                nsecBunker
              </a>{' '}
              or{' '}
              <a href="https://nsec.app" target="_blank" rel="noopener noreferrer" className="underline">
                nsec.app
              </a>
            </Alert>
          </Card>
        )}

        {/* Local Key */}
        {isProviderEnabled('local') && (
          <Card title="Local Key">
            <p className="text-sm text-gray-600 mb-3">
              Use a private key stored locally in your browser
            </p>
            <Button
              variant="outline"
              onClick={() => handleProviderSelect('local')}
              className="w-full"
            >
              Use Local Key
            </Button>
            <Alert variant="warning" className="mt-3">
              ⚠️ Local keys are stored in your browser. Only use this for testing or if you understand the security implications.
            </Alert>
          </Card>
        )}
      </div>

      {providers.length === 0 && (
        <Alert variant="warning">
          No authentication providers configured. Please configure at least one provider.
        </Alert>
      )}
    </div>
  )
}