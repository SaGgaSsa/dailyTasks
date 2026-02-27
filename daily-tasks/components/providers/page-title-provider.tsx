'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface PageTitleContextType {
    pageTitle: string | null
    setPageTitle: (title: string | null) => void
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined)

export function PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitle] = useState<string | null>(null)

    return (
        <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
            {children}
        </PageTitleContext.Provider>
    )
}

export function usePageTitle() {
    const context = useContext(PageTitleContext)
    if (context === undefined) {
        throw new Error('usePageTitle must be used within a PageTitleProvider')
    }
    return context
}
