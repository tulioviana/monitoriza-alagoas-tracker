import { useState, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface SefazCacheConfig {
  defaultTTL: number // em milissegundos
  maxEntries: number
}

const DEFAULT_CONFIG: SefazCacheConfig = {
  defaultTTL: 30 * 60 * 1000, // 30 minutos
  maxEntries: 100
}

class SefazCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: SefazCacheConfig

  constructor(config: SefazCacheConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  private generateKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params, Object.keys(params).sort())}`
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private evictExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    }
  }

  private evictOldest(): void {
    if (this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
  }

  get<T>(endpoint: string, params: any): T | null {
    this.evictExpired()
    
    const key = this.generateKey(endpoint, params)
    const entry = this.cache.get(key)
    
    if (!entry || this.isExpired(entry)) {
      return null
    }
    
    return entry.data
  }

  set<T>(endpoint: string, params: any, data: T, ttl?: number): void {
    this.evictExpired()
    this.evictOldest()
    
    const key = this.generateKey(endpoint, params)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    }
    
    this.cache.set(key, entry)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    this.evictExpired()
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      defaultTTL: this.config.defaultTTL
    }
  }
}

// Singleton instance
const sefazCache = new SefazCache()

export function useSefazCache() {
  const [stats, setStats] = useState(sefazCache.getStats())

  const getCached = useCallback(<T>(endpoint: string, params: any): T | null => {
    return sefazCache.get<T>(endpoint, params)
  }, [])

  const setCached = useCallback(<T>(endpoint: string, params: any, data: T, ttl?: number): void => {
    sefazCache.set(endpoint, params, data, ttl)
    setStats(sefazCache.getStats())
  }, [])

  const clearCache = useCallback((): void => {
    sefazCache.clear()
    setStats(sefazCache.getStats())
  }, [])

  const refreshStats = useCallback((): void => {
    setStats(sefazCache.getStats())
  }, [])

  return {
    getCached,
    setCached,
    clearCache,
    refreshStats,
    stats
  }
}