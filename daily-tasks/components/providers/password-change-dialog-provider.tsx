'use client'

import { createContext, ReactNode, useContext, useState } from 'react'
import { useSession } from 'next-auth/react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'

import { changeOwnPassword } from '@/app/actions/user-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordChangeDialogContextValue {
  openPasswordChangeDialog: () => void
}

const PasswordChangeDialogContext = createContext<PasswordChangeDialogContextValue | null>(null)

export function PasswordChangeDialogProvider({ children }: { children: ReactNode }) {
  const { update } = useSession()
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setNewPassword('')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await changeOwnPassword({ newPassword })
      if (!result.success) {
        toast.error(result.error || 'Error al cambiar password')
        return
      }

      await update({ mustChangePassword: false })
      toast.success('Password actualizado')
      handleOpenChange(false)
    } catch {
      toast.error('Error inesperado al cambiar password')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PasswordChangeDialogContext.Provider value={{ openPasswordChangeDialog: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <DialogTitle>Cambiar password</DialogTitle>
            </div>
            <DialogDescription>
              Ingresá una nueva contraseña de al menos 4 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nuevo password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PasswordChangeDialogContext.Provider>
  )
}

export function usePasswordChangeDialog() {
  const context = useContext(PasswordChangeDialogContext)
  if (!context) {
    throw new Error('usePasswordChangeDialog must be used inside PasswordChangeDialogProvider')
  }

  return context
}
