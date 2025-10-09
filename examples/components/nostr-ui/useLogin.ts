'use client'

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
 * Hook for managing login state and authentication flow (Examples version)
 * 
 * This is the styled version for the examples app.
 * For production use: import { useLogin } from "@johappel/nostr-framework/react"
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
            throw new Error('NIP-07 extension not found. Please install a Nostr browser extension.')
          }
          
          const nostr = (window as any).nostr
          pubkey = await nostr.getPublicKey()
          break
        }

        case 'bunker': {
          if (!provider.uri) {
            throw new Error('Bunker URI is required')
          }
          
          // Validate bunker URI format
          if (!provider.uri.startsWith('bunker://')) {
            throw new Error('Invalid bunker URI format. Must start with bunker://')
          }
          
          // Extract pubkey from bunker URI if possible
          const match = provider.uri.match(/bunker:\/\/([a-f0-9]{64})/)
          if (match) {
            pubkey = match[1]
          } else {
            // For demo purposes, simulate successful connection
            pubkey = 'demo_bunker_pubkey_' + Math.random().toString(36).substr(2, 9)
          }
          
          console.log('Connected to bunker:', provider.uri)
          break
        }

        case 'local': {
          // In a real implementation, this would show a dialog to enter/generate a private key
          // For demo purposes, generate a dummy pubkey
          pubkey = 'demo_local_pubkey_' + Math.random().toString(36).substr(2, 9)
          console.log('Using local key authentication')
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

      // Show success message
      console.log(`Successfully logged in with ${provider.kind}:`, pubkey)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      console.error('Login failed:', errorMessage)
    }
  }, [])

  const logout = useCallback(() => {
    setState(INITIAL_STATE)
    console.log('Logged out successfully')
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Sign event (demo implementation)
  const signEvent = useCallback(async (event: any) => {
    if (!state.isLoggedIn || !state.provider) {
      throw new Error('Not logged in')
    }

    console.log('Signing event with', state.provider.kind, ':', event)

    switch (state.provider.kind) {
      case 'nip07': {
        if (typeof window === 'undefined' || !(window as any).nostr) {
          throw new Error('NIP-07 extension not found')
        }
        return await (window as any).nostr.signEvent(event)
      }

      case 'bunker': {
        // Simulate bunker signing
        console.log('Signing with bunker:', state.provider.uri)
        return { ...event, sig: 'demo_bunker_signature_' + Date.now() }
      }

      case 'local': {
        // Simulate local key signing
        console.log('Signing with local key')
        return { ...event, sig: 'demo_local_signature_' + Date.now() }
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