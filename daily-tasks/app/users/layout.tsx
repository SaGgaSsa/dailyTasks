import { AppShell } from '@/components/app-shell'

export default async function UsersLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AppShell>{children}</AppShell>
}
