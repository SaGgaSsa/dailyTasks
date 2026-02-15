'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  Terminal,
  BarChart3
} from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

interface SidebarProps {
  userId?: string
}

export function Sidebar({ userId }: SidebarProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()
  const { t } = useI18n()

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className={`bg-[#0A0A0A] border-r border-zinc-800 transition-all duration-300 flex flex-col h-screen ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-2 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-zinc-100 p-1.5 rounded-lg">
            <Terminal className="h-5 w-5 text-zinc-900" />
          </div>
          {isOpen && (
            <span className="font-bold text-lg tracking-tight text-white">DailyTasks</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {isOpen && (
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {t.navigation.dashboard}
            </div>
          )}
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              {isOpen && <span>{t.incidences.title}</span>}
            </Button>
          </Link>

          <Link href="/analytics">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/analytics' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <BarChart3 className="h-4 w-4" />
              {isOpen && <span>Métricas</span>}
            </Button>
          </Link>

          {/* Wiki Técnica - temporalmente oculto
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 ${!isOpen ? 'justify-center px-0' : ''}`}
          >
            <BookOpen className="h-4 w-4" />
            {isOpen && <span>Wiki Técnica</span>}
          </Button>
          */}
        </div>
      </nav>

      {/* Admin Section */}
      {isAdmin && (
        <div className="py-4 border-t border-zinc-800 px-2 flex-shrink-0">
          <div className="space-y-1">
            {isOpen && (
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Administration
              </div>
            )}
            <Link href="/dashboard/users">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard/users' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
              >
                <Users className="h-4 w-4" />
                {isOpen && <span>{t.users.title}</span>}
              </Button>
            </Link>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 ${!isOpen ? 'justify-center px-0' : ''}`}
            >
              <Settings className="h-4 w-4" />
              {isOpen && <span>Settings</span>}
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800 flex-shrink-0">
        {isOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-zinc-600 hover:text-zinc-400 px-0 h-6"
            onClick={() => setIsOpen(false)}
          >
            Collapse Menu
          </Button>
        )}
        {!isOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-zinc-600 hover:text-zinc-400 px-0 h-6"
            onClick={() => setIsOpen(true)}
          >
            --{'>'}
          </Button>
        )}
      </div>
    </div>
  )
}
