import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { auth } from "@/auth"
import { getSidebarData } from "@/lib/queries/sidebar"

export default async function TracklistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const userId = session?.user?.id
  const { tracklists: initialTracklists, blockerIncidences: initialIncidences } = await getSidebarData(userId)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userId={userId} initialTracklists={initialTracklists} initialIncidences={initialIncidences} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
