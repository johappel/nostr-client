import React from 'react'
import { useUserProfile, type UserProfile as UserProfileType, type UseUserProfileOptions } from '../hooks/useUserProfile'

export interface UserProfileProps {
  pubkey?: string
  relays?: string[]
  autoLoad?: boolean
  live?: boolean
  className?: string
  // UI component overrides for custom styling
  components?: {
    Container?: React.ComponentType<any>
    Header?: React.ComponentType<{ profile: UserProfileType | null; isLoading: boolean; onRefresh: () => void }>
    Avatar?: React.ComponentType<{ profile: UserProfileType | null; size?: string }>
    Info?: React.ComponentType<{ profile: UserProfileType | null }>
    EditForm?: React.ComponentType<{ 
      profile: UserProfileType | null; 
      onSave: (data: Partial<UserProfileType>) => void;
      onCancel: () => void;
      isUpdating: boolean;
    }>
    Loading?: React.ComponentType
    Empty?: React.ComponentType
    Error?: React.ComponentType<{ error: string | null; onRetry?: () => void; onClear?: () => void }>
    Actions?: React.ComponentType<{ profile: UserProfileType | null; onEdit: () => void; onCopy: () => void }>
  }
  // Event handlers
  onProfileUpdate?: (profile: UserProfileType) => void
  onProfileLoad?: (profile: UserProfileType | null) => void
  onError?: (error: string) => void
  // Display options
  showEditButton?: boolean
  showCopyButton?: boolean
  showRefreshButton?: boolean
  showStats?: boolean
  compact?: boolean
  // Custom rendering
  renderHeader?: (profile: UserProfileType | null) => React.ReactNode
  renderContent?: (profile: UserProfileType | null) => React.ReactNode
  renderActions?: (profile: UserProfileType | null) => React.ReactNode
}

/**
 * Headless User Profile Component
 * 
 * Provides a flexible, framework-agnostic component for displaying and editing
 * Nostr user profiles (Kind 0 events) with support for:
 * - Profile metadata display and editing
 * - Live profile updates
 * - Custom UI component overrides
 * - Multiple display modes (compact, full, stats)
 * - Error handling and loading states
 * 
 * This component is headless and doesn't include any styling,
 * making it suitable for use with any UI library.
 */
export function UserProfile({
  pubkey,
  relays,
  autoLoad = true,
  live = true,
  className = '',
  components = {},
  onProfileUpdate,
  onProfileLoad,
  onError,
  showEditButton = true,
  showCopyButton = true,
  showRefreshButton = true,
  showStats = true,
  compact = false,
  renderHeader,
  renderContent,
  renderActions
}: UserProfileProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  
  const {
    profile,
    isLoading,
    error,
    isUpdating,
    refresh,
    updateProfile,
    clearError
  } = useUserProfile({
    pubkey,
    relays,
    autoLoad,
    live
  })

  // Handle profile load
  React.useEffect(() => {
    if (profile !== undefined) {
      onProfileLoad?.(profile)
    }
  }, [profile, onProfileLoad])

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  // Handle edit mode
  const handleEdit = React.useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleSave = React.useCallback(async (data: Partial<UserProfileType>) => {
    try {
      await updateProfile(data)
      setIsEditing(false)
      onProfileUpdate?.(profile!)
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }, [updateProfile, profile, onProfileUpdate])

  const handleCancel = React.useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleCopy = React.useCallback(() => {
    if (!profile) return
    
    const profileData = JSON.stringify(profile, null, 2)
    navigator.clipboard.writeText(profileData)
  }, [profile])

  const handleRetry = React.useCallback(() => {
    refresh()
  }, [refresh])

  const handleClearError = React.useCallback(() => {
    clearError()
  }, [clearError])

  // Default components (basic HTML elements)
  const {
    Container = ({ children, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    Header = ({ profile, isLoading, onRefresh }: any) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>
          {profile?.displayName || profile?.name || 'Anonymous'}
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          style={{ 
            padding: '0.5rem 1rem', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            background: isLoading ? '#f5f5f5' : 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    ),
    Avatar = ({ profile, size = '64px' }: any) => (
      <div style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {profile?.picture ? (
          <img 
            src={profile.picture} 
            alt={profile?.name || profile?.displayName} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ color: '#999', fontSize: '1.5rem' }}>👤</div>
        )}
      </div>
    ),
    Info = ({ profile }: any) => (
      <div style={{ padding: '1rem' }}>
        {profile?.about && <p style={{ margin: '0 0 1rem 0' }}>{profile.about}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
          {profile?.nip05 && (
            <div>
              <strong>NIP-05:</strong> {profile.nip05}
            </div>
          )}
          {profile?.lud16 && (
            <div>
              <strong>Lightning:</strong> {profile.lud16}
            </div>
          )}
          <div>
            <strong>Pubkey:</strong> 
            <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
              {profile?.pubkey?.slice(0, 8)}...{profile?.pubkey?.slice(-8)}
            </code>
          </div>
        </div>
      </div>
    ),
    EditForm = ({ profile, onSave, onCancel, isUpdating }: any) => {
      const [formData, setFormData] = React.useState({
        name: profile?.name || '',
        displayName: profile?.displayName || '',
        about: profile?.about || '',
        picture: profile?.picture || '',
        banner: profile?.banner || '',
        nip05: profile?.nip05 || '',
        lud16: profile?.lud16 || ''
      })

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
      }

      const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
      }

      return (
        <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Display Name:</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>About:</label>
              <textarea
                value={formData.about}
                onChange={(e) => handleChange('about', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Picture URL:</label>
              <input
                type="url"
                value={formData.picture}
                onChange={(e) => handleChange('picture', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>NIP-05:</label>
              <input
                type="text"
                value={formData.nip05}
                onChange={(e) => handleChange('nip05', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Lightning Address:</label>
              <input
                type="text"
                value={formData.lud16}
                onChange={(e) => handleChange('lud16', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isUpdating}
              style={{ 
                padding: '0.5rem 1rem', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              style={{ 
                padding: '0.5rem 1rem', 
                border: '1px solid #007bff', 
                borderRadius: '4px',
                background: '#007bff',
                color: 'white',
                cursor: isUpdating ? 'not-allowed' : 'pointer'
              }}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )
    },
    Loading = () => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading profile...</div>
      </div>
    ),
    Empty = () => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>No profile found</div>
      </div>
    ),
    Error = ({ error, onRetry, onClear }: any) => (
      <div style={{ 
        padding: '1rem', 
        margin: '1rem', 
        border: '1px solid #dc3545', 
        borderRadius: '4px',
        backgroundColor: '#f8d7da',
        color: '#721c24'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{ 
                padding: '0.25rem 0.5rem', 
                border: '1px solid #dc3545', 
                borderRadius: '4px',
                background: '#dc3545',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              style={{ 
                padding: '0.25rem 0.5rem', 
                border: '1px solid #6c757d', 
                borderRadius: '4px',
                background: '#6c757d',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    ),
    Actions = ({ profile, onEdit, onCopy }: any) => (
      <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
        {showEditButton && (
          <button
            onClick={onEdit}
            style={{ 
              padding: '0.5rem 1rem', 
              border: '1px solid #007bff', 
              borderRadius: '4px',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        )}
        {showCopyButton && (
          <button
            onClick={onCopy}
            disabled={!profile}
            style={{ 
              padding: '0.5rem 1rem', 
              border: '1px solid #6c757d', 
              borderRadius: '4px',
              background: '#6c757d',
              color: 'white',
              cursor: profile ? 'pointer' : 'not-allowed'
            }}
          >
            Copy
          </button>
        )}
      </div>
    )
  } = components

  // Custom header rendering
  if (renderHeader) {
    return <Container>{renderHeader(profile)}</Container>
  }

  // Compact mode
  if (compact) {
    return (
      <Container>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}>
          <Avatar profile={profile} size="40px" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.displayName || profile?.name || 'Anonymous'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nip05 || profile?.pubkey?.slice(0, 8) + '...' + profile?.pubkey?.slice(-8)}
            </div>
          </div>
          {showRefreshButton && (
            <button
              onClick={refresh}
              disabled={isLoading}
              style={{ 
                padding: '0.25rem 0.5rem', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                background: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '⏳' : '🔄'}
            </button>
          )}
        </div>
      </Container>
    )
  }

  // Custom content rendering
  if (renderContent) {
    return <Container>{renderContent(profile)}</Container>
  }

  // Standard rendering
  return (
    <Container>
      <Header 
        profile={profile} 
        isLoading={isLoading} 
        onRefresh={refresh}
      />
      
      {error && <Error error={error} onRetry={handleRetry} onClear={handleClearError} />}
      
      {isLoading && !profile && <Loading />}
      
      {!isLoading && !profile && !error && <Empty />}
      
      {profile && !isEditing && (
        <>
          <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
            <Avatar profile={profile} />
            <div style={{ flex: 1 }}>
              <Info profile={profile} />
            </div>
          </div>
          
          <Actions 
            profile={profile} 
            onEdit={handleEdit} 
            onCopy={handleCopy}
          />
        </>
      )}
      
      {isEditing && (
        <EditForm 
          profile={profile} 
          onSave={handleSave}
          onCancel={handleCancel}
          isUpdating={isUpdating}
        />
      )}
      
      {showStats && profile && renderActions && (
        <div style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
          {renderActions(profile)}
        </div>
      )}
    </Container>
  )
}

// Export types for external use
export type { UserProfileType, UseUserProfileOptions }