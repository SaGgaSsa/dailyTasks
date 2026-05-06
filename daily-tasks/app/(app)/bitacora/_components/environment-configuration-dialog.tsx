'use client'

import { useState, useTransition } from 'react'
import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createEnvironmentConfigurationLog } from '@/app/actions/environment-log'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Observation } from '@/components/tracklists/observation'

interface EnvironmentConfigurationDialogProps {
  environmentId: number
  environmentName: string
  canCreateConfiguration: boolean
}

export function EnvironmentConfigurationDialog({
  environmentId,
  environmentName,
  canCreateConfiguration,
}: EnvironmentConfigurationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setSubject('')
    setBody('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createEnvironmentConfigurationLog({
        environmentId,
        subject,
        body,
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar la configuración')
        return
      }

      toast.success('Configuración registrada')
      setOpen(false)
      resetForm()
      router.refresh()
    })
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setOpen(true)}
            disabled={!canCreateConfiguration}
            aria-label="Registrar configuración"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Registrar configuración</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registrar configuración en {environmentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="environment-configuration-subject">Objeto</Label>
              <Input
                id="environment-configuration-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={500}
                placeholder="Objeto configurado"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Detalle</Label>
              <Observation
                value={body}
                onChange={setBody}
                placeholder="Detalle de la configuración"
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !subject.trim() || !body.trim()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
