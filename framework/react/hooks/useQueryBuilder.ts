import { useState, useCallback } from 'react'

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

export interface UseQueryBuilderOptions {
  initialFilters?: NostrFilter[]
  maxFilters?: number
  onExecute?: (filters: NostrFilter[]) => void
}

export interface UseQueryBuilderReturn {
  filters: NostrFilter[]
  setFilters: (filters: NostrFilter[]) => void
  addFilter: () => void
  removeFilter: (index: number) => void
  updateFilter: (index: number, filter: NostrFilter) => void
  updateFilterField: (index: number, field: keyof NostrFilter, value: any) => void
  clearFilters: () => void
  executeQuery: () => void
  isValid: boolean
  hasFilters: boolean
}

export function useQueryBuilder({
  initialFilters = [{}],
  maxFilters = 5,
  onExecute
}: UseQueryBuilderOptions = {}): UseQueryBuilderReturn {
  const [filters, setFiltersState] = useState<NostrFilter[]>(initialFilters)

  const setFilters = useCallback((newFilters: NostrFilter[]) => {
    setFiltersState(newFilters)
  }, [])

  const addFilter = useCallback(() => {
    if (filters.length < maxFilters) {
      setFiltersState([...filters, {}])
    }
  }, [filters, maxFilters])

  const removeFilter = useCallback((index: number) => {
    if (filters.length > 1) {
      setFiltersState(filters.filter((_, i) => i !== index))
    }
  }, [filters])

  const updateFilter = useCallback((index: number, filter: NostrFilter) => {
    const newFilters = [...filters]
    newFilters[index] = filter
    setFiltersState(newFilters)
  }, [filters])

  const updateFilterField = useCallback((index: number, field: keyof NostrFilter, value: any) => {
    const newFilters = [...filters]
    if (value === '' || value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[index][field]
    } else {
      newFilters[index] = { ...newFilters[index], [field]: value }
    }
    setFiltersState(newFilters)
  }, [filters])

  const clearFilters = useCallback(() => {
    setFiltersState([{}])
  }, [])

  const executeQuery = useCallback(() => {
    onExecute?.(filters)
  }, [filters, onExecute])

  const isValid = filters.some(filter => Object.keys(filter).length > 0)
  const hasFilters = filters.length > 0 && isValid

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    updateFilter,
    updateFilterField,
    clearFilters,
    executeQuery,
    isValid,
    hasFilters
  }
}