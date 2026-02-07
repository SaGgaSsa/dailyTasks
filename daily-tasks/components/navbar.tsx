'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/use-theme'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { mounted, toggleTheme, resolvedTheme, isDark } = useTheme()
  const { data: session } = useSession()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Search bar */}
        <div className="flex-1 max-w-md lg:max-w-lg ml-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar en Daily Tasks..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-40 lg:w-64"
            />
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center space-x-2 ml-auto">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                3
              </Badge>
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