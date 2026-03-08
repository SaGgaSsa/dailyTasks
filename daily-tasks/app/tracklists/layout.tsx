import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { auth } from "@/auth"

export default async function TracklistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const userId = session?.user?.id

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userId={userId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-2 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
