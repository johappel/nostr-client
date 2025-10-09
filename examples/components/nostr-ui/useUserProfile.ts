'use client'

import { useState, useEffect, useCallback } from 'react'

// Types for Nostr events
export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface UserProfile {
  pubkey: string
  name?: string
  displayName?: string
  about?: string
  picture?: string
  banner?: string
  nip05?: string
  lud16?: string
  createdAt?: number
  updatedAt?: number
}

export interface UseUserProfileOptions {
  pubkey?: string
  relays?: string[]
  autoLoad?: boolean
  live?: boolean
}

export interface UseUserProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  isUpdating: boolean
  refresh: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  clearError: () => void
}

/**
 * Hook for fetching and managing Nostr user profiles (Kind 0 events)
 */
export function useUserProfile({
  pubkey,
  relays = ['wss://relay.damus.io', 'wss://nos.lol'],
  autoLoad = true,
  live = true
}: UseUserProfileOptions = {}): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Helper function to convert npub to hex
  const npubToHex = useCallback((npub: string): string | null => {
    try {
      // Simple bech32 decoding for npub
      const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
      
      // Remove prefix and separator
      const prefix = 'npub'
      if (!npub.startsWith(prefix + '1')) {
        return null;
      }
      
      const withoutPrefix = npub.slice(prefix.length + 1);
      
      // Convert from base32 to bytes (simplified)
      let bits = 0;
      let value = 0;
      const bytes: number[] = [];
      
      for (let i = 0; i < withoutPrefix.length - 6; i++) { // Exclude checksum
        const v = alphabet.indexOf(withoutPrefix[i]);
        if (v === -1) return null;
        
        value = (value << 5) | v;
        bits += 5;
        
        if (bits >= 8) {
          bits -= 8;
          bytes.push((value >>> bits) & 0xff);
        }
      }
      
      // Convert to hex
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[npubToHex] Error:', error);
      return null;
    }
  }, [])

  // Fetch profile from Nostr relays
  const fetchProfile = useCallback(async () => {
    if (!pubkey) return

    setIsLoading(true)
    setError(null)

    try {
      let profileData: UserProfile | null = null
      let hexPubkey = pubkey

      // Convert npub to hex if needed
      if (pubkey.startsWith('npub1')) {
        hexPubkey = npubToHex(pubkey)
        if (!hexPubkey) {
          console.warn(`[UserProfile] Invalid npub format: ${pubkey}`)
          throw new Error('Invalid npub format')
        }
      }

      console.log(`[UserProfile] Fetching profile from relays for: ${pubkey} (${hexPubkey})`)

      // Try to fetch from Nostr relays
      const filter = {
        kinds: [0],
        authors: [hexPubkey],
        limit: 1
      }

      for (const relayUrl of relays) {
        try {
          const event = await new Promise<NostrEvent | null>((resolve) => {
            const ws = new WebSocket(relayUrl)
            const timeout = setTimeout(() => {
              ws.close()
              resolve(null)
            }, 3000)

            ws.onopen = () => {
              const req = ["REQ", "profile", filter]
              ws.send(JSON.stringify(req))
            }

            ws.onmessage = (event) => {
              try {
                const [type, , data] = JSON.parse(event.data)
                if (type === "EVENT") {
                  clearTimeout(timeout)
                  ws.close()
                  resolve(data)
                } else if (type === "EOSE") {
                  clearTimeout(timeout)
                  ws.close()
                  resolve(null)
                }
              } catch (err) {
                console.warn('[UserProfile] Failed to parse WebSocket message:', err)
              }
            }

            ws.onerror = () => {
              clearTimeout(timeout)
              ws.close()
              resolve(null)
            }

            ws.onclose = () => {
              clearTimeout(timeout)
              resolve(null)
            }
          })

          if (event) {
            const metadata = JSON.parse(event.content)
            console.log(`[UserProfile] ✅ Profile loaded from relay ${relayUrl}:`, metadata)
            
            profileData = {
              pubkey,
              name: metadata.name,
              displayName: metadata.display_name || metadata.name,
              about: metadata.about,
              picture: metadata.picture,
              banner: metadata.banner,
              nip05: metadata.nip05,
              lud16: metadata.lud16 || metadata.lud06,
              createdAt: event.created_at,
              updatedAt: event.created_at
            }
            break // Found profile, stop trying other relays
          }
        } catch (relayErr) {
          console.warn(`[UserProfile] Relay ${relayUrl} failed:`, relayErr)
          continue
        }
      }

      // If no data found, create empty profile
      if (!profileData) {
        console.log('[UserProfile] No profile data found on relays, creating empty profile')
        profileData = {
          pubkey,
          displayName: 'Anonymous',
          about: 'No profile data available on relays',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        }
      }

      setProfile(profileData)
    } catch (err) {
      console.error('[UserProfile] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      
      // Set empty profile on error
      setProfile({
        pubkey,
        displayName: 'Error loading profile',
        about: 'Failed to load profile data from relays',
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000)
      })
    } finally {
      setIsLoading(false)
    }
  }, [pubkey, relays, npubToHex])

  // Update profile (publish new Kind 0 event)
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!pubkey) {
      setError('No pubkey provided for profile update')
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      // Create updated profile object
      const updatedProfile: UserProfile = {
        ...profile,
        ...data,
        pubkey,
        updatedAt: Math.floor(Date.now() / 1000)
      }

      // Create Kind 0 event content
      const eventContent = {
        name: updatedProfile.name,
        display_name: updatedProfile.displayName,
        about: updatedProfile.about,
        picture: updatedProfile.picture,
        banner: updatedProfile.banner,
        nip05: updatedProfile.nip05,
        lud16: updatedProfile.lud16
      }

      // Remove undefined values
      Object.keys(eventContent).forEach(key => {
        if (eventContent[key as keyof typeof eventContent] === undefined) {
          delete eventContent[key as keyof typeof eventContent]
        }
      })

      // In a real implementation, this would use a signer to create and publish the event
      // For now, we'll just update the local state
      setProfile(updatedProfile)

      console.log('Profile update requested:', eventContent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }, [pubkey, profile])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load profile when pubkey changes
  useEffect(() => {
    if (autoLoad && pubkey) {
      fetchProfile()
    }
  }, [autoLoad, pubkey, fetchProfile])

  // Set up live subscription (simplified version)
  useEffect(() => {
    if (!live || !pubkey) return

    // In a real implementation, this would set up a WebSocket subscription
    // For now, we'll just poll every 30 seconds
    const interval = setInterval(() => {
      fetchProfile()
    }, 30000)

    return () => clearInterval(interval)
  }, [live, pubkey, fetchProfile])

  return {
    profile,
    isLoading,
    error,
    isUpdating,
    refresh: fetchProfile,
    updateProfile,
    clearError
  }
}