import type { ReactNode } from 'react'

import { auth } from '@/auth'
import { getSidebarData } from '@/lib/queries/sidebar'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'

interface AppShellProps {
  children: ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const session = await auth()
  const userId = session?.user?.id
  const { tracklists: initialTracklists, blockerIncidences: initialIncidences } = await getSidebarData(userId)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userId={userId} initialTracklists={initialTracklists} initialIncidences={initialIncidences} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
