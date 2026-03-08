'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface TracklistTitleContextType {
  tracklistTitle: string | null
  setTracklistTitle: (title: string | null) => void
}

const TracklistTitleContext = createContext<TracklistTitleContextType | undefined>(undefined)

export function TracklistTitleProvider({ children }: { children: ReactNode }) {
  const [tracklistTitle, setTracklistTitle] = useState<string | null>(null)
  return (
    <TracklistTitleContext.Provider value={{ tracklistTitle, setTracklistTitle }}>
      {children}
    </TracklistTitleContext.Provider>
  )
}

export function useTracklistTitle() {
  const context = useContext(TracklistTitleContext)
  return context ?? { tracklistTitle: null, setTracklistTitle: () => {} }
}
