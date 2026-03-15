'use client'

import { useSession } from 'next-auth/react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'

export function AccountProfileSection() {
  const { data: session } = useSession()
  const user = session?.user

  const fields = [
    { label: 'Nombre', value: user?.name },
    { label: 'Usuario', value: user?.username },
    { label: 'Email', value: user?.email },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <UserAvatar username={user?.username} size="lg" />
        <div>
          <h2 className="text-lg font-semibold">{user?.name || 'Usuario'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="bg-zinc-900/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">{field.label}</div>
            <div className="text-sm">{field.value || '—'}</div>
          </div>
        ))}
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Rol</div>
          <Badge variant="secondary">{user?.role || '—'}</Badge>
        </div>
      </div>
    </div>
  )
}
