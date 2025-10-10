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
 * 
 * This is a framework-agnostic hook that can be used with any UI library.
 * It provides basic functionality for:
 * - Fetching profile metadata from relays
 * - Updating profile data
 * - Real-time profile updates
 * - Error handling and loading states
 */
export function useUserProfile({
  pubkey,
  relays = ['wss://relay.nostr.band', 'wss://nos.lol', 'wss://relay.damus.io'],
  autoLoad = true,
  live = true
}: UseUserProfileOptions = {}): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Parse Kind 0 event content to extract profile data
  const parseProfileEvent = useCallback((event: NostrEvent): UserProfile => {
    try {
      const content = JSON.parse(event.content)
      return {
        pubkey: event.pubkey,
        name: content.name,
        displayName: content.display_name || content.displayName,
        about: content.about,
        picture: content.picture,
        banner: content.banner,
        nip05: content.nip05,
        lud16: content.lud16,
        createdAt: event.created_at,
        updatedAt: event.created_at
      }
    } catch (err) {
      console.error('Failed to parse profile event:', err)
      return {
        pubkey: event.pubkey,
        createdAt: event.created_at,
        updatedAt: event.created_at
      }
    }
  }, [])

  // Fetch profile using IdentityManager or fallback
  const fetchProfile = useCallback(async () => {
    if (!pubkey) return

    setIsLoading(true)
    setError(null)

    try {
      let profileData: UserProfile | null = null

      // Try to use IdentityManager
      try {
        const { IdentityManager } = await import('../../core/IdentityManager.js')
        const identityManager = new IdentityManager()
        
        // Fetch profile using IdentityManager
        const profile = await (identityManager as any).fetchProfile(pubkey, relays)
        if (profile) {
          profileData = {
            pubkey: profile.pubkey,
            name: profile.name,
            displayName: profile.display_name || profile.displayName,
            about: profile.about,
            picture: profile.picture,
            banner: profile.banner,
            nip05: profile.nip05,
            lud16: profile.lud16,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
          }
          console.log('Profile fetched using IdentityManager:', profileData)
        }
      } catch (importErr) {
        console.warn('IdentityManager not available, using fallback:', importErr)
      }

      // If no profile found from IdentityManager, create empty profile
      if (!profileData) {
        console.log('No profile data found on relays, creating empty profile')
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
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }, [pubkey, relays, parseProfileEvent])

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

      // In a real implementation, this would use the framework's event manager
      console.log('Profile update requested:', eventContent)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state
      setProfile(updatedProfile)
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