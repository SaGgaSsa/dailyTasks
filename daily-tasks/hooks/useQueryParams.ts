'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface QueryParams {
  search?: string
  tech?: string[]
  status?: string
  assignee?: string[]
}

export function useQueryParams(initialValues: Partial<QueryParams> = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>()
  
  const [params, setParams] = useState<QueryParams>(() => {
    const tech = searchParams.get('tech')
    const status = searchParams.get('status')
    const assignee = searchParams.get('assignee')
    
    return {
      search: searchParams.get('search') || '',
      tech: tech ? tech.split(',').filter(Boolean) : initialValues.tech || [],
      status: status || initialValues.status || '',
      assignee: assignee ? assignee.split(',').filter(Boolean) : [],
      ...initialValues
    }
  })

  const updateParam = useCallback((key: keyof QueryParams, value: string | string[]) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    
    // Update URL without navigation
    const urlParams = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length > 0) {
          urlParams.set(k, v.join(','))
        } else {
          urlParams.delete(k) // Remove parameter when array is empty
        }
      } else if (v && v !== '') {
        urlParams.set(k, v)
      } else {
        urlParams.delete(k) // Remove parameter when value is empty
      }
    })
    
    const queryString = urlParams.toString()
    const newUrl = queryString ? `/dashboard?${queryString}` : '/dashboard'
    router.replace(newUrl, { scroll: false })
  }, [params, router, searchParams])

  const updateSearchWithDebounce = useCallback((value: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      updateParam('search', value)
    }, 300)

    setSearchTimeout(timeout)
    
    // Update local state immediately for responsive UI
    setParams(prev => ({ ...prev, search: value }))
  }, [updateParam, searchTimeout])

  const resetFilters = useCallback(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    const defaultParams = {
      search: '',
      tech: [],
      status: '',
      assignee: []
    }
    setParams(defaultParams)
    
    // Update URL to remove all filter parameters
    const urlParams = new URLSearchParams(searchParams.toString())
    urlParams.delete('search')
    urlParams.delete('tech')
    urlParams.delete('status')
    urlParams.delete('assignee')
    
    const queryString = urlParams.toString()
    const newUrl = queryString ? `/dashboard?${queryString}` : '/dashboard'
    router.replace(newUrl, { scroll: false })
  }, [router, searchTimeout, searchParams])

  return { params, updateParam, updateSearchWithDebounce, resetFilters }
}