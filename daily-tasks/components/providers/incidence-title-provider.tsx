'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface IncidenceTitleContextType {
    incidenceTitle: string | null
    setIncidenceTitle: (title: string | null) => void
}

const IncidenceTitleContext = createContext<IncidenceTitleContextType | undefined>(undefined)

export function IncidenceTitleProvider({ children }: { children: ReactNode }) {
    const [incidenceTitle, setIncidenceTitle] = useState<string | null>(null)

    return (
        <IncidenceTitleContext.Provider value={{ incidenceTitle, setIncidenceTitle }}>
            {children}
        </IncidenceTitleContext.Provider>
    )
}

export function useIncidenceTitle() {
    const context = useContext(IncidenceTitleContext)
    if (context === undefined) {
        throw new Error('useIncidenceTitle must be used within an IncidenceTitleProvider')
    }
    return context
}
