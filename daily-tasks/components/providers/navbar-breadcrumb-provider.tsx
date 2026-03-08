'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

export interface Breadcrumb {
  label: string
  href?: string
}

interface NavbarBreadcrumbContextType {
  breadcrumbs: Breadcrumb[]
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void
}

const NavbarBreadcrumbContext = createContext<NavbarBreadcrumbContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
})

export function NavbarBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  return (
    <NavbarBreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </NavbarBreadcrumbContext.Provider>
  )
}

export function useNavbarBreadcrumbs() {
  return useContext(NavbarBreadcrumbContext)
}
