import { useState, useMemo } from 'react'
import { TrackedItemWithPrice } from './useTrackedItems'

export type FilterType = 'all' | 'produto' | 'combustivel'
export type FilterStatus = 'all' | 'active' | 'paused'

export function useTrackedItemsFilters(items: TrackedItemWithPrice[] = []) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = item.nickname.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Type filter
      const matchesType = typeFilter === 'all' || item.item_type === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'paused' && !item.is_active)
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [items, searchTerm, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter(item => item.is_active).length
    const paused = items.filter(item => !item.is_active).length
    const products = items.filter(item => item.item_type === 'produto').length
    const fuels = items.filter(item => item.item_type === 'combustivel').length
    
    return { total, active, paused, products, fuels }
  }, [items])

  return {
    filteredItems,
    stats,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter
  }
}