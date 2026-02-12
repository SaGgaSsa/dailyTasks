'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'

interface SearchParamsState {
  search?: string
  tech?: string[]
  status?: string[]
  assignee?: string[]
  mine?: boolean
}

interface UseSearchParamsSyncReturn {
  params: SearchParamsState
  updateSearch: (value: string) => void
  updateTech: (values: string[]) => void
  updateStatus: (values: string[]) => void
  updateAssignee: (values: string[]) => void
  updateMine: (value: boolean) => void
  resetFilters: () => void
  isLoading: boolean
}

export function useSearchParamsSync(): UseSearchParamsSyncReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [params, setParams] = useState<SearchParamsState>({})

  // Parse initial params from URL
  useEffect(() => {
    const urlStatus = searchParams.getAll('status').filter(Boolean)
    const parsed: SearchParamsState = {
      search: searchParams.get('search') || '',
      tech: searchParams.getAll('tech').filter(Boolean),
      status: urlStatus.length > 0 ? urlStatus : [],
      assignee: searchParams.getAll('assignee').filter(Boolean),
      mine: searchParams.get('mine') === 'true',
    }
    
    // Use requestAnimationFrame to avoid synchronous setState
    requestAnimationFrame(() => {
      setParams(parsed)
      setIsLoading(false)
    })
  }, [searchParams])

  // Update URL with new params
  const updateURL = useCallback((newParams: SearchParamsState) => {
    const urlParams = new URLSearchParams()
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (key === 'mine') {
        if (value === true) urlParams.set('mine', 'true')
      } else if (Array.isArray(value)) {
        value.forEach(v => v && urlParams.append(key, v))
      } else if (value && value !== '') {
        urlParams.set(key, value)
      }
    })

    const queryString = urlParams.toString()
    const newUrl = queryString ? `/dashboard?${queryString}` : '/dashboard'
    router.replace(newUrl, { scroll: false })
  }, [router])

  const updateSearch = useCallback((value: string) => {
    const newParams = { ...params, search: value }
    setParams(newParams)
    updateURL(newParams)
  }, [params, updateURL])

  const updateTech = useCallback((values: string[]) => {
    const newParams = { ...params, tech: values }
    setParams(newParams)
    updateURL(newParams)
  }, [params, updateURL])

  const updateStatus = useCallback((values: string[]) => {
    const newParams = { ...params, status: values }
    setParams(newParams)
    updateURL(newParams)
  }, [params, updateURL])

  const updateAssignee = useCallback((values: string[]) => {
    const newParams = { ...params, assignee: values }
    setParams(newParams)
    updateURL(newParams)
  }, [params, updateURL])

  const updateMine = useCallback((value: boolean) => {
    const newParams = { ...params, mine: value || undefined }
    setParams(newParams)
    updateURL(newParams)
  }, [params, updateURL])

  const resetFilters = useCallback(() => {
    router.push('/dashboard', { scroll: false })
  }, [router])

  return {
    params,
    updateSearch,
    updateTech,
    updateStatus,
    updateAssignee,
    updateMine,
    resetFilters,
    isLoading
  }
}