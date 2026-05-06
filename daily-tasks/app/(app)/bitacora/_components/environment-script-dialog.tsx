'use client'

import { useState, useTransition } from 'react'
import { Database, FileCode, ScrollText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ScriptType } from '@prisma/client'

import { createEnvironmentScriptLog } from '@/app/actions/environment-log'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EnvironmentScriptDialogProps {
  environmentId: number
  environmentName: string
  canCreateScript: boolean
}

const DEFAULT_TITLES: Record<ScriptType, string> = {
  SQL: 'Base de Datos',
  CODE: 'Script',
}

export function EnvironmentScriptDialog({
  environmentId,
  environmentName,
  canCreateScript,
}: EnvironmentScriptDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scriptType, setScriptType] = useState<ScriptType>('SQL')
  const [subject, setSubject] = useState(DEFAULT_TITLES.SQL)
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setScriptType('SQL')
    setSubject(DEFAULT_TITLES.SQL)
    setBody('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleScriptTypeChange(nextType: ScriptType) {
    setScriptType((currentType) => {
      const previousDefault = DEFAULT_TITLES[currentType]
      setSubject((currentSubject) => {
        if (!currentSubject.trim() || currentSubject === previousDefault) {
          return DEFAULT_TITLES[nextType]
        }
        return currentSubject
      })
      return nextType
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createEnvironmentScriptLog({
        environmentId,
        subject,
        body,
        scriptType,
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar el script')
        return
      }

      toast.success('Script registrado')
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
            disabled={!canCreateScript}
            aria-label="Registrar script"
          >
            <ScrollText className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Registrar script</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registrar script en {environmentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={scriptType === 'SQL' ? 'default' : 'outline'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleScriptTypeChange('SQL')}
                        disabled={isPending}
                        aria-label="SQL"
                      >
                        <Database className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>SQL</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={scriptType === 'CODE' ? 'default' : 'outline'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleScriptTypeChange('CODE')}
                        disabled={isPending}
                        aria-label="CODE"
                      >
                        <FileCode className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>CODE</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="environment-script-subject">Título</Label>
                <Input
                  id="environment-script-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={500}
                  placeholder="Título del script"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment-script-body">Script</Label>
              <Textarea
                id="environment-script-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={scriptType === 'SQL' ? 'select * from tabla;' : 'console.log("deploy")'}
                className="min-h-[220px] font-mono text-sm"
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
