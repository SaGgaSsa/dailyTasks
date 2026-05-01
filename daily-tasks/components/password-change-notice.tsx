'use client'

import { KeyRound } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { usePasswordChangeDialog } from '@/components/providers/password-change-dialog-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function PasswordChangeNotice() {
  const { data: session } = useSession()
  const { openPasswordChangeDialog } = usePasswordChangeDialog()

  if (!session?.user?.mustChangePassword) {
    return null
  }

  return (
    <Alert className="mb-4 flex items-center justify-between gap-4 border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100">
      <KeyRound className="h-4 w-4" />
      <div className="min-w-0 flex-1">
        <AlertTitle>Password temporal activo</AlertTitle>
        <AlertDescription>
          Cambiá tu password cuando puedas para quitar este aviso.
        </AlertDescription>
      </div>
      <Button size="sm" onClick={openPasswordChangeDialog}>
        Cambiar
      </Button>
    </Alert>
  )
}
