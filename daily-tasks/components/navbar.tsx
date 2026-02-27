'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  Bell,
  Menu,
  X,
  Globe,
  PanelLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/use-theme'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Locale } from '@/lib/i18n'
import { useIncidenceTitle } from '@/components/providers/incidence-title-provider'
import { usePageTitle } from '@/components/providers/page-title-provider'

const SIDEBAR_STORAGE_KEY = 'dailytasks-sidebar-collapsed'

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
  const pathname = usePathname()
  const { mounted, toggleTheme, isDark } = useTheme()
  const { data: session } = useSession()
  const { locale, setLocale, t } = useI18n()
  const { incidenceTitle } = useIncidenceTitle()
  const { pageTitle } = usePageTitle()

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      setIsSidebarOpen(stored === 'true')
    }
  }, [])

  useEffect(() => {
    const handleSidebarToggle = () => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored !== null) {
        setIsSidebarOpen(stored === 'true')
      }
    }
    window.addEventListener('sidebar-toggle', handleSidebarToggle)
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle)
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleSidebar = () => {
    const newValue = !isSidebarOpen
    setIsSidebarOpen(newValue)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue))
    window.dispatchEvent(new Event('sidebar-toggle'))
  }

  const getPageTitle = () => {
    if (pathname === '/dashboard') return t.incidences.title
    if (pathname === '/analytics') return 'Métricas'
    if (pathname === '/dashboard/users') return 'Usuarios'
    return ''
  }

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-14 items-center px-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        
        {/* Sidebar toggle (desktop) */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 hidden md:flex"
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Page Title / Breadcrumb */}
        {incidenceTitle ? (
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Incidencias
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {pageTitle ? (
              <Link href={`/dashboard/incidences/${pathname.split('/')[3]}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[300px]">
                {incidenceTitle}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[300px]">
                {incidenceTitle}
              </span>
            )}
            {pageTitle && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-medium truncate max-w-[300px]">
                  {pageTitle || 'Nueva Página'}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium text-foreground">
            {getPageTitle()}
          </span>
        )}
  
        {/* Right side items */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title={t.common.filter}>
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleLanguageChange('es')}
                className={locale === 'es' ? 'bg-accent' : ''}
              >
                Español
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLanguageChange('en')}
                className={locale === 'en' ? 'bg-accent' : ''}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <UserAvatar username={session?.user?.username} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <div className="text-sm font-medium">{session?.user?.name || 'Usuario Demo'}</div>
                  <div className="text-xs text-muted-foreground">{session?.user?.email || 'desarrollador@ejemplo.com'}</div>
                </div>
                <DropdownMenuItem onSelect={toggleTheme}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {!mounted ? (
                      <circle cx="12" cy="12" r="5" />
                    ) : isDark ? (
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                    ) : (
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    )}
                  </svg>
                  {!mounted ? 'Cambiar tema' : isDark ? 'Cambiar a Claro' : 'Cambiar a Oscuro'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M4 21v-2a4 4 0 0 1 3-3.87"></path>
                    <path d="M12 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
                  </svg>
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10"></path>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                    <path d="M12 2a10 10 0 0 0-10 10"></path>
                    <path d="M12 2a10 10 0 0 1-10 10"></path>
                  </svg>
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <path d="M16 17l5-5-5-5"></path>
                    <path d="M21 12H9"></path>
                  </svg>
                  Salir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
    </header>
  )
}