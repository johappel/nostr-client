'use client'
import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Settings,
  Users,
  MessageSquare,
  Calendar,
  Search,
  Zap,
  Shield,
  Upload,
  Eye,
  Edit,
  FileText,
  Link as LinkIcon,
  Heart,
  Radio
} from "lucide-react"

interface Component {
  name: string
  slug: string
  description: string
  status: 'completed' | 'in-progress' | 'planned' | 'stub'
  priority: 'high' | 'medium' | 'low'
  category: 'auth' | 'events' | 'ui' | 'social' | 'config'
  icon: React.ComponentType<{ className?: string }>
  nips?: string[]
}

const components: Component[] = [
  // Completed
  {
    name: 'NostrConfigPanel',
    slug: 'nostrconfigpanel',
    description: 'Configuration panel for relays, storage, and framework settings',
    status: 'completed',
    priority: 'high',
    category: 'config',
    icon: Settings,
    nips: []
  },
  {
    name: 'LoginSelector',
    slug: 'loginselector',
    description: 'Authentication method selection (NIP-07, NIP-46, Local keys)',
    status: 'completed',
    priority: 'high',
    category: 'auth',
    icon: Shield,
    nips: ['07', '46']
  },
  
  // High Priority - In Progress
  {
    name: 'LoginDialog',
    slug: 'logindialog',
    description: 'Modal dialog for authentication flow',
    status: 'stub',
    priority: 'high',
    category: 'auth',
    icon: Shield,
    nips: ['07', '46']
  },
  {
    name: 'LoginForm',
    slug: 'loginform',
    description: 'Embedded login form component',
    status: 'stub',
    priority: 'high',
    category: 'auth',
    icon: Shield,
    nips: ['07', '46']
  },
  {
    name: 'QueryBuilder',
    slug: 'querybuilder',
    description: 'Visual query builder for Nostr filters',
    status: 'completed',
    priority: 'high',
    category: 'ui',
    icon: Search,
    nips: ['01']
  },
  {
    name: 'EventsList',
    slug: 'eventslist',
    description: 'Paginated list of Nostr events with filtering',
    status: 'completed',
    priority: 'high',
    category: 'events',
    icon: FileText,
    nips: ['01']
  },
  
  // Medium Priority  
  {
    name: 'UserProfile',
    slug: 'userprofile',
    description: 'User profile display with metadata and follow status',
    status: 'stub',
    priority: 'medium',
    category: 'social',
    icon: Users,
    nips: ['01', '05']
  },
  {
    name: 'NostrChat',
    slug: 'nostrchat',
    description: 'Real-time chat interface for kind 1 events',
    status: 'stub',
    priority: 'medium',
    category: 'social',
    icon: MessageSquare,
    nips: ['01']
  },
  {
    name: 'ZapButton',
    slug: 'zapbutton',
    description: 'Lightning zap button with LUD-16 support',
    status: 'stub',
    priority: 'medium',
    category: 'social',
    icon: Zap,
    nips: ['57']
  },
  {
    name: 'Reactions',
    slug: 'reactions',
    description: 'Like/dislike reactions with aggregation',
    status: 'stub',
    priority: 'medium',
    category: 'social',
    icon: Heart,
    nips: ['25']
  },
  {
    name: 'MediaUploader',
    slug: 'mediauploader',
    description: 'File upload with NIP-96 server support',
    status: 'stub',
    priority: 'medium',
    category: 'ui',
    icon: Upload,
    nips: ['94', '96']
  },
  {
    name: 'EventInspector',
    slug: 'eventinspector',
    description: 'Debug view for raw Nostr event data',
    status: 'stub',
    priority: 'medium',
    category: 'ui',
    icon: Eye,
    nips: ['01']
  },
  
  // Low Priority
  {
    name: 'CalendarView',
    slug: 'calendarview',
    description: 'Calendar interface for time-based events',
    status: 'stub',
    priority: 'low',
    category: 'events',
    icon: Calendar,
    nips: ['52']
  },
  {
    name: 'ThreadView',
    slug: 'threadview',
    description: 'Threaded conversation display',
    status: 'stub',
    priority: 'low',
    category: 'social',
    icon: MessageSquare,
    nips: ['01']
  },
  {
    name: 'LongformRenderer',
    slug: 'longformrenderer',
    description: 'Markdown renderer for long-form content',
    status: 'stub',
    priority: 'low',
    category: 'events',
    icon: FileText,
    nips: ['30023']
  },
  {
    name: 'ContentLinkifier',
    slug: 'contentlinkifier',
    description: 'Auto-link detection and rendering in text content',
    status: 'stub',
    priority: 'low',
    category: 'ui',
    icon: LinkIcon,
    nips: ['01']
  },
  {
    name: 'RelayHealthBadge',
    slug: 'relayhealthbadge',
    description: 'Real-time relay connection status indicator',
    status: 'stub',
    priority: 'low',
    category: 'config',
    icon: Radio,
    nips: []
  }
]

const getStatusInfo = (status: Component['status']) => {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle2, label: 'Completed', variant: 'default' as const, color: 'text-green-600' }
    case 'in-progress':
      return { icon: Clock, label: 'In Progress', variant: 'secondary' as const, color: 'text-blue-600' }
    case 'planned':
      return { icon: AlertCircle, label: 'Planned', variant: 'outline' as const, color: 'text-yellow-600' }
    case 'stub':
      return { icon: AlertCircle, label: 'Stub', variant: 'outline' as const, color: 'text-gray-600' }
  }
}

const getPriorityInfo = (priority: Component['priority']) => {
  switch (priority) {
    case 'high':
      return { label: 'High', variant: 'destructive' as const }
    case 'medium':
      return { label: 'Medium', variant: 'secondary' as const }
    case 'low':
      return { label: 'Low', variant: 'outline' as const }
  }
}

const getCategoryInfo = (category: Component['category']) => {
  switch (category) {
    case 'auth':
      return { label: 'Authentication', color: 'bg-purple-100 text-purple-800' }
    case 'events':
      return { label: 'Events', color: 'bg-blue-100 text-blue-800' }
    case 'ui':
      return { label: 'UI Components', color: 'bg-green-100 text-green-800' }
    case 'social':
      return { label: 'Social', color: 'bg-pink-100 text-pink-800' }
    case 'config':
      return { label: 'Configuration', color: 'bg-orange-100 text-orange-800' }
  }
}

export default function Page() {
  const completedCount = components.filter(c => c.status === 'completed').length
  const totalCount = components.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)

  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = []
    }
    acc[component.category].push(component)
    return acc
  }, {} as Record<string, Component[]>)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Nostr UI Components</h1>
        <p className="text-xl text-muted-foreground mb-6">
          A comprehensive React component library for Nostr applications
        </p>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">{completedCount} of {totalCount} components completed</span>
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium">{progressPercentage}%</span>
        </div>
        
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/nostrconfigpanel">
              <Settings className="w-4 h-4 mr-2" />
              Config Panel
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/loginselector">
              <Shield className="w-4 h-4 mr-2" />
              Login Selector
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="https://github.com/johappel/nostr-client" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              GitHub
            </a>
          </Button>
        </div>
      </header>

      <Separator className="mb-8" />

      {Object.entries(groupedComponents).map(([category, categoryComponents]) => {
        const categoryInfo = getCategoryInfo(category as Component['category'])
        
        return (
          <div key={category} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold">{categoryInfo.label}</h2>
              <Badge className={categoryInfo.color}>
                {categoryComponents.length} components
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryComponents.map((component) => {
                const statusInfo = getStatusInfo(component.status)
                const priorityInfo = getPriorityInfo(component.priority)
                const IconComponent = component.icon
                
                return (
                  <Card key={component.slug} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-5 h-5" />
                          <CardTitle className="text-lg">{component.name}</CardTitle>
                        </div>
                        <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {component.description}
                      </p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                        <Badge variant={priorityInfo.variant}>
                          {priorityInfo.label}
                        </Badge>
                        {component.nips && component.nips.length > 0 && (
                          <div className="flex gap-1">
                            {component.nips.map(nip => (
                              <Badge key={nip} variant="outline" className="text-xs">
                                NIP-{nip}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {component.status === 'completed' ? (
                          <Button asChild size="sm" className="flex-1">
                            <Link href={`/${component.slug}`}>
                              View Demo
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="flex-1">
                            <Link href={`/${component.slug}`}>
                              View Stub
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
      
      <footer className="mt-16 pt-8 border-t">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">
            Built with <strong>Next.js</strong>, <strong>shadcn/ui</strong>, and <strong>Tailwind CSS</strong>
          </p>
          <p className="text-sm">
            Part of the <strong>@johappel/nostr-framework</strong> ecosystem
          </p>
        </div>
      </footer>
    </div>
  )
}