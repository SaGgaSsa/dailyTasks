import { AppShell } from '@/components/app-shell'

export default async function TracklistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AppShell>{children}</AppShell>
}
