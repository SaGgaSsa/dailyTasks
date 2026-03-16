'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { searchActiveIncidences } from '@/app/actions/incidence-actions'
import type { ExternalWorkItemSummary } from '@/types'

type IncidenceQueryResult = Pick<ExternalWorkItemSummary, 'id' | 'type' | 'externalId' | 'title' | 'color'>

interface IncidenceQueryProps {
    selectedIncidences: IncidenceQueryResult[]
    onChange: (incidences: IncidenceQueryResult[]) => void
    lockedIds?: number[]
}

export function IncidenceQuery({ selectedIncidences, onChange, lockedIds }: IncidenceQueryProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<IncidenceQueryResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isDebounced, setIsDebounced] = useState(false)
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const selectedIdsRef = useRef<number[]>([])
    const popoverOpen = isOpen && query.length >= 3 && !isSearching && isDebounced

    // Keep selectedIdsRef in sync with selectedIncidences
    useEffect(() => {
        selectedIdsRef.current = selectedIncidences.map(i => i.id)
    }, [selectedIncidences])

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([])
            setIsSearching(false)
            return
        }

        setIsSearching(true)
        const result = await searchActiveIncidences(searchQuery, selectedIdsRef.current)
        setResults(result.success ? (result.data ?? []) : [])
        setIsOpen(true)
        setIsSearching(false)
    }, [])

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        if (query.length >= 3) {
            debounceTimeoutRef.current = setTimeout(() => {
                performSearch(query)
                setIsDebounced(true)
            }, 300)
        } else {
            debounceTimeoutRef.current = setTimeout(() => {
                setResults([])
                setIsOpen(false)
                setIsSearching(false)
                setIsDebounced(false)
            }, 300)
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [query, performSearch])

    const handleSelect = (incidence: IncidenceQueryResult) => {
        const newSelected = [...selectedIncidences, incidence]
        onChange(newSelected)
        
        // Update ref manually since it won't trigger re-render
        selectedIdsRef.current = newSelected.map(i => i.id)
        
        // Re-search with updated exclusions
        if (query.length >= 3) {
            performSearch(query)
        }
        
        inputRef.current?.focus()
    }

    const handleRemove = (id: number) => {
        onChange(selectedIncidences.filter(i => i.id !== id))
    }

    return (
        <div className="space-y-3">
            <Popover open={popoverOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar por Nro o Título de Trámite..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent 
                    align="start" 
                    className="w-auto min-w-[400px] max-w-[600px] p-0 shadow-lg border"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {query.length >= 3 && (
                        <div className="max-h-[300px] overflow-y-auto">
                            {results.length > 0 ? (
                                <div className="py-1">
                                    {results.map((incidence) => (
                                        <button
                                            key={incidence.id}
                                            onClick={() => handleSelect(incidence)}
                                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm cursor-pointer whitespace-nowrap flex items-center gap-2"
                                        >
                                            <IncidenceBadge type={incidence.type} color={incidence.color} externalId={incidence.externalId} className="text-xs shrink-0" />
                                            <span className="text-muted-foreground truncate">{incidence.title}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {selectedIncidences.length > 0 && (
                <div className="space-y-2">
                    {selectedIncidences.map((incidence) => (
                        <div
                            key={incidence.id}
                            className="flex items-center justify-between bg-secondary rounded-md px-3 py-2 text-sm"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <IncidenceBadge type={incidence.type} color={incidence.color} externalId={incidence.externalId} className="text-xs shrink-0" />
                                <span className="text-muted-foreground truncate">{incidence.title}</span>
                            </span>
                            {!lockedIds?.includes(incidence.id) && (
                                <button
                                    onClick={() => handleRemove(incidence.id)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer ml-2"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
