import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { auth } from "@/auth"
import { getTracklists } from "@/app/actions/tracklists"

export default async function TracklistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [session, tracklistsResult] = await Promise.all([auth(), getTracklists()])
  const userId = session?.user?.id
  const initialTracklists =
    tracklistsResult.success && tracklistsResult.data
      ? tracklistsResult.data.map((tl) => ({ id: tl.id, title: tl.title }))
      : []

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userId={userId} initialTracklists={initialTracklists} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
