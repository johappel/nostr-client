import React, { useState, useCallback } from 'react'

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

export interface FilterRule {
  id: string
  type: 'ids' | 'authors' | 'kinds' | 'tags' | 'time' | 'limit' | 'search'
  field: keyof NostrFilter
  value: string | number | string[]
  operator?: 'equals' | 'contains' | 'since' | 'until'
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
  components?: {
    Card?: React.ComponentType<any>
    Button?: React.ComponentType<any>
    Input?: React.ComponentType<any>
    Select?: React.ComponentType<any>
    Badge?: React.ComponentType<any>
    Textarea?: React.ComponentType<any>
    Label?: React.ComponentType<any>
  }
}

const DEFAULT_COMPONENTS = {
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Textarea: (props: any) => <textarea {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}

const FILTER_TYPES = [
  { value: 'authors', label: 'Authors', placeholder: 'Enter public keys (hex)' },
  { value: 'kinds', label: 'Event Kinds', placeholder: 'e.g. 1,6,7' },
  { value: 'ids', label: 'Event IDs', placeholder: 'Enter event IDs (hex)' },
  { value: '#p', label: 'Mentioned Users', placeholder: 'Enter public keys' },
  { value: '#e', label: 'Referenced Events', placeholder: 'Enter event IDs' },
  { value: '#t', label: 'Hashtags', placeholder: 'Enter hashtags' },
  { value: '#d', label: 'Identifiers', placeholder: 'Enter identifiers' },
  { value: 'since', label: 'Since (timestamp)', placeholder: 'Unix timestamp' },
  { value: 'until', label: 'Until (timestamp)', placeholder: 'Unix timestamp' },
  { value: 'limit', label: 'Limit', placeholder: 'Max results' },
  { value: 'search', label: 'Search Text', placeholder: 'Search content' }
]

const PRESET_QUERIES = [
  {
    name: 'Recent Posts',
    filters: [{ kinds: [1], limit: 50 }]
  },
  {
    name: 'Reactions',
    filters: [{ kinds: [7], limit: 100 }]
  },
  {
    name: 'Long-form Articles',
    filters: [{ kinds: [30023], limit: 20 }]
  },
  {
    name: 'Profile Updates',
    filters: [{ kinds: [0], limit: 50 }]
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
  className,
  components: providedComponents = {}
}: QueryBuilderProps) {
  const components = { ...DEFAULT_COMPONENTS, ...providedComponents }
  const { Card, Button, Input, Select, Badge, Textarea, Label } = components

  const [filters, setFilters] = useState<NostrFilter[]>(value)
  const [activeFilterIndex, setActiveFilterIndex] = useState(0)

  const updateFilters = useCallback((newFilters: NostrFilter[]) => {
    setFilters(newFilters)
    onChange?.(newFilters)
  }, [onChange])

  const addFilter = useCallback(() => {
    if (filters.length < maxFilters) {
      const newFilters = [...filters, {}]
      updateFilters(newFilters)
      setActiveFilterIndex(newFilters.length - 1)
    }
  }, [filters, maxFilters, updateFilters])

  const removeFilter = useCallback((index: number) => {
    if (filters.length > 1) {
      const newFilters = filters.filter((_, i) => i !== index)
      updateFilters(newFilters)
      setActiveFilterIndex(Math.min(activeFilterIndex, newFilters.length - 1))
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
    setActiveFilterIndex(0)
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

  return (
    <div className={className}>
      <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Query Builder
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Build Nostr queries visually
          </p>
        </div>

        {/* Preset Queries */}
        <div style={{ marginBottom: '1rem' }}>
          <Label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
            Quick Presets:
          </Label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_QUERIES.map((preset) => (
              <Button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                disabled={disabled}
                style={{ 
                  fontSize: '0.8rem', 
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {filters.map((_, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Button
                  onClick={() => setActiveFilterIndex(index)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    backgroundColor: activeFilterIndex === index ? '#3b82f6' : '#f3f4f6',
                    color: activeFilterIndex === index ? 'white' : '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Filter {index + 1}
                </Button>
                {filters.length > 1 && (
                  <Button
                    onClick={() => removeFilter(index)}
                    disabled={disabled}
                    style={{
                      padding: '0.25rem',
                      fontSize: '0.7rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {filters.length < maxFilters && (
              <Button
                onClick={addFilter}
                disabled={disabled}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                + Add Filter
              </Button>
            )}
          </div>

          {/* Active Filter Editor */}
          <Card style={{ padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
              Filter {activeFilterIndex + 1} Configuration
            </h4>
            
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {FILTER_TYPES.map((filterType) => {
                const currentValue = filters[activeFilterIndex]?.[filterType.value as keyof NostrFilter]
                const isDisabled = disabled || (allowedKinds && filterType.value === 'kinds')
                
                return (
                  <div key={filterType.value}>
                    <Label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '500' }}>
                      {filterType.label}
                    </Label>
                    <Input
                      type={filterType.value === 'since' || filterType.value === 'until' || filterType.value === 'limit' ? 'number' : 'text'}
                      placeholder={filterType.placeholder}
                      value={
                        Array.isArray(currentValue) 
                          ? currentValue.join(', ')
                          : currentValue?.toString() || ''
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value
                        let parsedValue: any
                        
                        if (filterType.value === 'kinds') {
                          parsedValue = value ? parseNumberArrayValue(value) : undefined
                        } else if (filterType.value === 'since' || filterType.value === 'until' || filterType.value === 'limit') {
                          parsedValue = value ? parseNumberValue(value) : undefined
                        } else if (filterType.value.startsWith('#') || filterType.value === 'ids' || filterType.value === 'authors') {
                          parsedValue = value ? parseArrayValue(value) : undefined
                        } else {
                          parsedValue = value || undefined
                        }
                        
                        updateFilterField(activeFilterIndex, filterType.value as keyof NostrFilter, parsedValue)
                      }}
                      disabled={isDisabled}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Preview */}
        {showPreview && (
          <div style={{ marginBottom: '1rem' }}>
            <Label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
              Generated Query:
            </Label>
            <Textarea
              value={JSON.stringify(filters, null, 2)}
              readOnly
              style={{
                width: '100%',
                height: '120px',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                backgroundColor: '#f9fafb'
              }}
            />
          </div>
        )}

        {/* Execute Button */}
        {showExecuteButton && (
          <Button
            onClick={handleExecute}
            disabled={disabled}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            Execute Query
          </Button>
        )}
      </Card>
    </div>
  )
}