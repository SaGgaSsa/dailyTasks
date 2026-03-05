'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { searchActiveIncidences } from '@/app/actions/incidence-actions'

interface IncidenceQueryResult {
    id: number
    type: string
    externalId: number
    title: string
}

interface IncidenceQueryProps {
    selectedIncidences: IncidenceQueryResult[]
    onChange: (incidences: IncidenceQueryResult[]) => void
}

export function IncidenceQuery({ selectedIncidences, onChange }: IncidenceQueryProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<IncidenceQueryResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const selectedIdsRef = useRef<number[]>([])

    // Keep selectedIdsRef in sync with selectedIncidences
    useEffect(() => {
        selectedIdsRef.current = selectedIncidences.map(i => i.id)
    }, [selectedIncidences])

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([])
            return
        }

        const searchResults = await searchActiveIncidences(searchQuery, selectedIdsRef.current)
        setResults(searchResults as IncidenceQueryResult[])
    }, [])

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        if (query.length >= 3) {
            debounceTimeoutRef.current = setTimeout(() => {
                performSearch(query)
            }, 300)
        } else {
            debounceTimeoutRef.current = setTimeout(() => {
                setResults([])
                setIsOpen(false)
            }, 300)
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [query, performSearch])

    useEffect(() => {
        if (query.length >= 3 && results.length > 0) {
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }, [results, query])

    const handleSelect = (incidence: IncidenceQueryResult) => {
        onChange([...selectedIncidences, incidence])
        setQuery('')
        setResults([])
        setIsOpen(false)
        inputRef.current?.focus()
    }

    const handleRemove = (id: number) => {
        onChange(selectedIncidences.filter(i => i.id !== id))
    }

    return (
        <div className="space-y-3">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                    className="w-[400px] p-0"
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
                                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm cursor-pointer"
                                        >
                                            <span className="font-medium">{incidence.type} {incidence.externalId}</span>
                                            <span className="text-muted-foreground"> - {incidence.title}</span>
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
                            <span>
                                <span className="font-medium">{incidence.type} {incidence.externalId}</span>
                                <span className="text-muted-foreground"> - {incidence.title}</span>
                            </span>
                            <button
                                onClick={() => handleRemove(incidence.id)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer ml-2"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
