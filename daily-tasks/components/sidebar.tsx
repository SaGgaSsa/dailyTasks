'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  ShieldCheck,
  Terminal
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  userId?: string
}

export function Sidebar({ userId }: SidebarProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className={`bg-[#0A0A0A] border-r border-zinc-800 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-4 flex items-center gap-3">
        <div className="bg-zinc-100 p-1.5 rounded-lg">
          <Terminal className="h-5 w-5 text-zinc-900" />
        </div>
        {isOpen && (
          <span className="font-bold text-lg tracking-tight text-white">Engineering</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-6 px-3">
          {/* Main Section */}
          <div className="space-y-1">
            {isOpen && (
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Gestión
              </div>
            )}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {isOpen && <span>{isAdmin ? 'Planning Backlog' : 'Kanban Board'}</span>}
              </Button>
            </Link>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 ${!isOpen ? 'justify-center px-0' : ''}`}
            >
              <BookOpen className="h-4 w-4" />
              {isOpen && <span>Wiki Técnica</span>}
            </Button>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <div className="space-y-1">
              {isOpen && (
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Administración
                </div>
              )}
              <Link href="/dashboard/users">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 transition-colors ${!isOpen ? 'justify-center px-0' : ''} ${pathname === '/dashboard/users' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                >
                  <Users className="h-4 w-4" />
                  {isOpen && <span>Equipo</span>}
                </Button>
              </Link>

              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-900 ${!isOpen ? 'justify-center px-0' : ''}`}
              >
                <Settings className="h-4 w-4" />
                {isOpen && <span>Configuración</span>}
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className={`flex items-center gap-3 ${!isOpen ? 'justify-center' : ''}`}>
          <Avatar className="h-8 w-8 border border-zinc-700">
            <AvatarImage src={session?.user?.image || ''} alt="User" />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
              {session?.user?.username?.substring(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-zinc-200 truncate">{session?.user?.name || session?.user?.username}</span>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                {isAdmin ? <ShieldCheck className="h-3 w-3 text-yellow-500/50" /> : <Terminal className="h-3 w-3 text-blue-500/50" />}
                {isAdmin ? 'Architect' : 'Developer'}
              </span>
            </div>
          )}
        </div>
        {isOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4 text-[10px] text-zinc-600 hover:text-zinc-400 px-0 h-6"
            onClick={() => setIsOpen(false)}
          >
            Colapsar Menú
          </Button>
        )}
        {!isOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4 text-zinc-600 hover:text-zinc-400 px-0 h-6"
            onClick={() => setIsOpen(true)}
          >
            --{'>'}
          </Button>
        )}
      </div>
    </div>
  )
}
