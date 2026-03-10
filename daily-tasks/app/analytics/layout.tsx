'use client'

import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect } from "react"
export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  if (status === "loading") {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userId={undefined} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
