'use client'

import React, { useState } from 'react'
import { useUserProfile, type UserProfileDataType as UserProfileType } from '@johappel/nostr-framework/react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Edit, 
  Save, 
  X, 
  RefreshCw, 
  Copy,
  ExternalLink,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Mail,
  Zap,
  Globe,
  Calendar
} from "lucide-react"

export interface UserProfileProps {
  pubkey?: string
  relays?: string[]
  className?: string
  // Display options
  showEditButton?: boolean
  showCopyButton?: boolean
  showRefreshButton?: boolean
  showStats?: boolean
  compact?: boolean
  // Event handlers
  onProfileUpdate?: (profile: UserProfileType) => void
  onProfileLoad?: (profile: UserProfileType | null) => void
  onError?: (error: string) => void
  // Custom rendering
  renderHeader?: (profile: UserProfileType | null) => React.ReactNode
  renderContent?: (profile: UserProfileType | null) => React.ReactNode
  renderActions?: (profile: UserProfileType | null) => React.ReactNode
}

/**
 * Styled User Profile Component for Examples
 * 
 * Uses shadcn/ui components for a polished look with support for:
 * - Viewing and editing Nostr user profiles (Kind 0)
 * - Avatar and banner display
 * - Profile metadata management
 * - Live profile updates
 * - Copy profile data functionality
 * 
 * Perfect for copy-paste into user projects.
 */
export function UserProfile({
  pubkey,
  relays,
  className = '',
  showEditButton = true,
  showCopyButton = true,
  showRefreshButton = true,
  showStats = true,
  compact = false,
  onProfileUpdate,
  onProfileLoad,
  onError,
  renderHeader,
  renderContent,
  renderActions
}: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfileType>>({})
  const [copySuccess, setCopySuccess] = useState(false)

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
    autoLoad: true,
    live: true
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
  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      name: profile?.name || '',
      displayName: profile?.displayName || '',
      about: profile?.about || '',
      picture: profile?.picture || '',
      banner: profile?.banner || '',
      nip05: profile?.nip05 || '',
      lud16: profile?.lud16 || ''
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({})
  }

  const handleSave = async () => {
    if (!pubkey) return

    try {
      await updateProfile(editForm)
      setIsEditing(false)
      setEditForm({})
      onProfileUpdate?.(profile!)
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const handleCopyProfile = async () => {
    if (!profile) return

    const profileData = JSON.stringify(profile, null, 2)
    await navigator.clipboard.writeText(profileData)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleRefresh = async () => {
    await refresh()
  }

  const formatPubkey = (key: string) => {
    return `${key.slice(0, 8)}...${key.slice(-8)}`
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Custom header rendering
  if (renderHeader) {
    return <div className={className}>{renderHeader(profile)}</div>
  }

  // Compact mode
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${className}`}>
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {profile?.picture ? (
            <img
              src={profile.picture}
              alt={profile?.name || profile?.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {profile?.displayName || profile?.name || 'Anonymous'}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {profile?.nip05 || formatPubkey(pubkey || '')}
          </div>
        </div>
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    )
  }

  // Custom content rendering
  if (renderContent) {
    return <div className={className}>{renderContent(profile)}</div>
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Banner */}
      <Card className="overflow-hidden">
        {/* Banner */}
        {profile?.banner && (
          <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${profile.banner})` }} />
        )}
        
        <CardHeader className={`${profile?.banner ? 'pt-4' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {profile?.picture ? (
                    <img
                      src={profile.picture}
                      alt={profile?.name || profile?.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                {showEditButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleEdit}
                    disabled={isLoading || isUpdating}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                <CardTitle className="text-xl">
                  {profile?.displayName || profile?.name || 'Anonymous'}
                  {profile?.name && profile?.displayName && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (@{profile.name})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.nip05 && (
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {profile.nip05}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-mono">
                    {formatPubkey(pubkey || '')}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {showCopyButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyProfile}
                  disabled={!profile}
                >
                  {copySuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
              {showRefreshButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading || isUpdating}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading || isUpdating ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Profile Content */}
        <CardContent>
          {profile?.about && (
            <p className="text-sm text-muted-foreground mb-4">{profile.about}</p>
          )}
          
          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {profile?.lud16 && (
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>{profile.lud16}</span>
              </div>
            )}
            {profile?.createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {formatDate(profile.createdAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Username</Label>
                <Input
                  id="name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={editForm.displayName || ''}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Display Name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={editForm.about || ''}
                onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="picture">Profile Picture URL</Label>
                <Input
                  id="picture"
                  value={editForm.picture || ''}
                  onChange={(e) => setEditForm({ ...editForm, picture: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner">Banner URL</Label>
                <Input
                  id="banner"
                  value={editForm.banner || ''}
                  onChange={(e) => setEditForm({ ...editForm, banner: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nip05">NIP-05 Address</Label>
                <Input
                  id="nip05"
                  value={editForm.nip05 || ''}
                  onChange={(e) => setEditForm({ ...editForm, nip05: e.target.value })}
                  placeholder="username@domain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lud16">Lightning Address (LUD-16)</Label>
                <Input
                  id="lud16"
                  value={editForm.lud16 || ''}
                  onChange={(e) => setEditForm({ ...editForm, lud16: e.target.value })}
                  placeholder="username@domain.com"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {showStats && profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Public Key:</span>
                    <div className="font-mono text-xs break-all mt-1">{pubkey}</div>
                  </div>
                  <div>
                    <span className="font-medium">Profile Created:</span>
                    <div className="mt-1">{formatDate(profile.createdAt)}</div>
                  </div>
                  {profile.updatedAt && profile.updatedAt !== profile.createdAt && (
                    <div>
                      <span className="font-medium">Last Updated:</span>
                      <div className="mt-1">{formatDate(profile.updatedAt)}</div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="technical" className="space-y-4">
                <ScrollArea className="h-64 rounded-md border p-4">
                  <pre className="text-xs">
                    <code>{JSON.stringify(profile, null, 2)}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Custom Actions */}
      {renderActions && (
        <Card>
          <CardContent className="pt-6">
            {renderActions(profile)}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !profile && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-y-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading profile...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export types for external use
export type { UserProfileType }
export type { UseUserProfileOptions, UseUserProfileReturn } from './useUserProfile'