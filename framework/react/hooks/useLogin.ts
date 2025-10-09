import { useState, useCallback } from 'react'

export interface LoginProvider {
  kind: 'nip07' | 'bunker' | 'local'
  uri?: string
  label?: string
}

export interface LoginState {
  isLoggedIn: boolean
  provider: LoginProvider | null
  pubkey: string | null
  error: string | null
  isLoading: boolean
}

const INITIAL_STATE: LoginState = {
  isLoggedIn: false,
  provider: null,
  pubkey: null,
  error: null,
  isLoading: false
}

/**
 * Hook for managing login state and authentication flow
 * 
 * Provides login/logout functionality with support for different providers.
 * Handles NIP-07, NIP-46, and local key authentication.
 */
export function useLogin() {
  const [state, setState] = useState<LoginState>(INITIAL_STATE)

  const login = useCallback(async (provider: LoginProvider) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      let pubkey: string | null = null

      switch (provider.kind) {
        case 'nip07': {
          if (typeof window === 'undefined' || !(window as any).nostr) {
            throw new Error('NIP-07 extension not found')
          }
          
          const nostr = (window as any).nostr
          pubkey = await nostr.getPublicKey()
          break
        }

        case 'bunker': {
          if (!provider.uri) {
            throw new Error('Bunker URI is required')
          }
          
          // In a real implementation, this would connect to the bunker
          // For now, we'll simulate the connection
          console.log('Connecting to bunker:', provider.uri)
          
          // Extract pubkey from bunker URI if possible
          const match = provider.uri.match(/bunker:\/\/([a-f0-9]{64})/)
          if (match) {
            pubkey = match[1]
          } else {
            throw new Error('Invalid bunker URI format')
          }
          break
        }

        case 'local': {
          // In a real implementation, this would show a dialog to enter/generate a private key
          // For now, we'll simulate with a dummy pubkey
          console.log('Using local key authentication')
          pubkey = 'dummy_local_pubkey_' + Math.random().toString(36).substr(2, 9)
          break
        }

        default:
          throw new Error(`Unsupported provider: ${provider.kind}`)
      }

      if (!pubkey) {
        throw new Error('Failed to obtain public key')
      }

      setState({
        isLoggedIn: true,
        provider,
        pubkey,
        error: null,
        isLoading: false
      })

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }))
    }
  }, [])

  const logout = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Sign event (placeholder implementation)
  const signEvent = useCallback(async (event: any) => {
    if (!state.isLoggedIn || !state.provider) {
      throw new Error('Not logged in')
    }

    switch (state.provider.kind) {
      case 'nip07': {
        if (typeof window === 'undefined' || !(window as any).nostr) {
          throw new Error('NIP-07 extension not found')
        }
        return await (window as any).nostr.signEvent(event)
      }

      case 'bunker': {
        // In a real implementation, this would send a signing request to the bunker
        console.log('Signing with bunker:', state.provider.uri)
        throw new Error('Bunker signing not implemented in demo')
      }

      case 'local': {
        // In a real implementation, this would sign with the local private key
        console.log('Signing with local key')
        throw new Error('Local key signing not implemented in demo')
      }

      default:
        throw new Error(`Unsupported provider: ${state.provider.kind}`)
    }
  }, [state.isLoggedIn, state.provider])

  return {
    ...state,
    login,
    logout,
    clearError,
    signEvent
  }
}