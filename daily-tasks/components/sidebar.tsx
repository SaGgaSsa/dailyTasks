'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Layers,
  BookOpen,
  Users,
  Settings,
  Terminal,
  BarChart3,
} from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { TracklistSidebarSection } from '@/components/sidebar-tracklist-section'

interface SidebarProps {
  userId?: string
}

const SIDEBAR_STORAGE_KEY = 'dailytasks-sidebar-collapsed'

export function Sidebar({ userId }: SidebarProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const pathname = usePathname()
  const { t } = useI18n()

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      setIsOpen(stored === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen))
    window.dispatchEvent(new Event('sidebar-toggle'))
  }, [isOpen])

  useEffect(() => {
    const handleSidebarToggle = () => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored !== null) {
        setIsOpen(stored === 'true')
      }
    }
    window.addEventListener('sidebar-toggle', handleSidebarToggle)
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle)
  }, [])

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-screen ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-2 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg">
            <Terminal className="h-5 w-5 text-primary-foreground" />
          </div>
          {isOpen && (
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">DailyTasks</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {isOpen && (
            <div className="px-3 py-2 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest">
              {t.navigation.dashboard}
            </div>
          )}
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard' ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
            >
              <Layers className="h-4 w-4" />
              {isOpen && <span>{t.incidences.title}</span>}
            </Button>
          </Link>

          <Link href="/analytics">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/analytics' ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
            >
              <BarChart3 className="h-4 w-4" />
              {isOpen && <span>Métricas</span>}
            </Button>
          </Link>

          <TracklistSidebarSection isOpen={isOpen} />

          {/* Wiki Técnica - temporalmente oculto
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${!isOpen ? 'justify-center px-0' : ''}`}
          >
            <BookOpen className="h-4 w-4" />
            {isOpen && <span>Wiki Técnica</span>}
          </Button>
          */}
        </div>
      </nav>

      {/* Admin Section */}
      {isAdmin && (
        <div className="py-4 border-t border-sidebar-border px-2 flex-shrink-0">
          <div className="space-y-1">
            {isOpen && (
              <div className="px-3 py-2 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest">
                Administration
              </div>
            )}
            <Link href="/dashboard/users">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard/users' ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
              >
                <Users className="h-4 w-4" />
                {isOpen && <span>{t.users.title}</span>}
              </Button>
            </Link>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${!isOpen ? 'justify-center px-0' : ''}`}
            >
              <Settings className="h-4 w-4" />
              {isOpen && <span>Settings</span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
