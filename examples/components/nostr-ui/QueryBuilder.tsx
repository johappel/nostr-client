'use client'
import React, { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Play, Sparkles } from "lucide-react"

export interface NostrFilter {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  '#t'?: string[]
  '#d'?: string[]
  since?: number
  until?: number
  limit?: number
  search?: string
}

export interface QueryBuilderProps {
  value?: NostrFilter[]
  onChange?: (filters: NostrFilter[]) => void
  onExecute?: (filters: NostrFilter[]) => void
  allowedKinds?: number[]
  maxFilters?: number
  showPreview?: boolean
  showExecuteButton?: boolean
  disabled?: boolean
  className?: string
}

const FILTER_TYPES = [
  { value: 'authors', label: 'Authors', placeholder: 'Enter public keys (hex)', type: 'array' },
  { value: 'kinds', label: 'Event Kinds', placeholder: 'e.g. 1,6,7', type: 'number-array' },
  { value: 'ids', label: 'Event IDs', placeholder: 'Enter event IDs (hex)', type: 'array' },
  { value: '#p', label: 'Mentioned Users', placeholder: 'Enter public keys', type: 'array' },
  { value: '#e', label: 'Referenced Events', placeholder: 'Enter event IDs', type: 'array' },
  { value: '#t', label: 'Hashtags', placeholder: 'Enter hashtags', type: 'array' },
  { value: '#d', label: 'Identifiers', placeholder: 'Enter identifiers', type: 'array' },
  { value: 'since', label: 'Since (timestamp)', placeholder: 'Unix timestamp', type: 'number' },
  { value: 'until', label: 'Until (timestamp)', placeholder: 'Unix timestamp', type: 'number' },
  { value: 'limit', label: 'Limit', placeholder: 'Max results', type: 'number' },
  { value: 'search', label: 'Search Text', placeholder: 'Search content', type: 'string' }
]

const PRESET_QUERIES = [
  {
    name: 'Recent Posts',
    description: 'Latest text notes',
    filters: [{ kinds: [1], limit: 50 }],
    icon: '📝'
  },
  {
    name: 'Reactions',
    description: 'Like/dislike events',
    filters: [{ kinds: [7], limit: 100 }],
    icon: '❤️'
  },
  {
    name: 'Long-form Articles',
    description: 'NIP-23 articles',
    filters: [{ kinds: [30023], limit: 20 }],
    icon: '📚'
  },
  {
    name: 'Profile Updates',
    description: 'User metadata',
    filters: [{ kinds: [0], limit: 50 }],
    icon: '👤'
  },
  {
    name: 'Channel Messages',
    description: 'Chat messages',
    filters: [{ kinds: [42], limit: 100 }],
    icon: '💬'
  }
]

export function QueryBuilder({
  value = [{}],
  onChange,
  onExecute,
  allowedKinds,
  maxFilters = 5,
  showPreview = true,
  showExecuteButton = true,
  disabled = false,
  className
}: QueryBuilderProps) {
  const [filters, setFilters] = useState<NostrFilter[]>(value)
  const [activeFilterIndex, setActiveFilterIndex] = useState("0")

  const updateFilters = useCallback((newFilters: NostrFilter[]) => {
    setFilters(newFilters)
    onChange?.(newFilters)
  }, [onChange])

  const addFilter = useCallback(() => {
    if (filters.length < maxFilters) {
      const newFilters = [...filters, {}]
      updateFilters(newFilters)
      setActiveFilterIndex((newFilters.length - 1).toString())
    }
  }, [filters, maxFilters, updateFilters])

  const removeFilter = useCallback((index: number) => {
    if (filters.length > 1) {
      const newFilters = filters.filter((_, i) => i !== index)
      updateFilters(newFilters)
      const newActiveIndex = Math.min(parseInt(activeFilterIndex), newFilters.length - 1)
      setActiveFilterIndex(newActiveIndex.toString())
    }
  }, [filters, activeFilterIndex, updateFilters])

  const updateFilterField = useCallback((index: number, field: keyof NostrFilter, value: any) => {
    const newFilters = [...filters]
    if (value === '' || value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[index][field]
    } else {
      newFilters[index] = { ...newFilters[index], [field]: value }
    }
    updateFilters(newFilters)
  }, [filters, updateFilters])

  const handleExecute = useCallback(() => {
    onExecute?.(filters)
  }, [filters, onExecute])

  const loadPreset = useCallback((preset: typeof PRESET_QUERIES[0]) => {
    updateFilters(preset.filters)
    setActiveFilterIndex("0")
  }, [updateFilters])

  const parseArrayValue = (value: string): string[] => {
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  const parseNumberValue = (value: string): number | undefined => {
    const num = parseInt(value, 10)
    return isNaN(num) ? undefined : num
  }

  const parseNumberArrayValue = (value: string): number[] => {
    return value.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n))
  }

  const formatFilterValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return value?.toString() || ''
  }

  const getActiveFilterFields = () => {
    const activeFilter = filters[parseInt(activeFilterIndex)] || {}
    return Object.entries(activeFilter).length
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Query Builder
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Build complex Nostr queries with an intuitive visual interface
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Preset Queries */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Start Templates</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {PRESET_QUERIES.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                  disabled={disabled}
                  className="h-auto p-3 flex flex-col items-center gap-1 text-center"
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-xs font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Filter Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">Query Filters</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {filters.length} filter{filters.length !== 1 ? 's' : ''}
                </Badge>
                {filters.length < maxFilters && (
                  <Button
                    size="sm"
                    onClick={addFilter}
                    disabled={disabled}
                    className="h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Filter
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs value={activeFilterIndex} onValueChange={setActiveFilterIndex}>
              <div className="flex items-center gap-2 mb-4">
                <TabsList className="grid w-full grid-cols-auto">
                  {filters.map((_, index) => (
                    <TabsTrigger key={index} value={index.toString()} className="relative">
                      Filter {index + 1}
                      {index === parseInt(activeFilterIndex) && getActiveFilterFields() > 0 && (
                        <Badge className="ml-1 h-4 w-4 rounded-full p-0 text-xs">
                          {getActiveFilterFields()}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {filters.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(parseInt(activeFilterIndex))}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Filter Content */}
              {filters.map((filter, index) => (
                <TabsContent key={index} value={index.toString()}>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {FILTER_TYPES.map((filterType) => {
                          const currentValue = filter[filterType.value as keyof NostrFilter]
                          const isDisabled = disabled || (allowedKinds && filterType.value === 'kinds')
                          
                          return (
                            <div key={filterType.value} className="space-y-2">
                              <Label className="text-sm font-medium">
                                {filterType.label}
                              </Label>
                              <Input
                                type={filterType.type === 'number' ? 'number' : 'text'}
                                placeholder={filterType.placeholder}
                                value={formatFilterValue(currentValue)}
                                onChange={(e) => {
                                  const value = e.target.value
                                  let parsedValue: any
                                  
                                  if (filterType.type === 'number-array') {
                                    parsedValue = value ? parseNumberArrayValue(value) : undefined
                                  } else if (filterType.type === 'number') {
                                    parsedValue = value ? parseNumberValue(value) : undefined
                                  } else if (filterType.type === 'array') {
                                    parsedValue = value ? parseArrayValue(value) : undefined
                                  } else {
                                    parsedValue = value || undefined
                                  }
                                  
                                  updateFilterField(index, filterType.value as keyof NostrFilter, parsedValue)
                                }}
                                disabled={isDisabled}
                                className="text-sm"
                              />
                              {currentValue && (
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(currentValue) ? (
                                    currentValue.slice(0, 3).map((item, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {item.toString().substring(0, 8)}...
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      {currentValue.toString()}
                                    </Badge>
                                  )}
                                  {Array.isArray(currentValue) && currentValue.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{currentValue.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* JSON Preview */}
          {showPreview && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Generated Query JSON</Label>
              <Textarea
                value={JSON.stringify(filters, null, 2)}
                readOnly
                className="font-mono text-sm h-32 bg-muted"
              />
            </div>
          )}

          {/* Execute Button */}
          {showExecuteButton && (
            <Button
              onClick={handleExecute}
              disabled={disabled}
              size="lg"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Execute Query
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}