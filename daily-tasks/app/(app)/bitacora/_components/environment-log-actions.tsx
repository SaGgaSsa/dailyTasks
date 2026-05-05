'use client'

import { Check, ClipboardCopy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import {
  getEnvironmentDeployBatchSql,
  validateEnvironmentConfigurationLog,
} from '@/app/actions/environment-log'
import type { EnvironmentLogBatchView } from '@/app/actions/environment-log'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DeployLogActionsProps {
  environmentId: number
  batch: EnvironmentLogBatchView
  canValidateConfiguration: boolean
}

export function DeployLogActions({ environmentId, batch, canValidateConfiguration }: DeployLogActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCopySql() {
    if (batch.type !== 'DEPLOY') return

    startTransition(async () => {
      const result = await getEnvironmentDeployBatchSql({
        environmentId,
        batchId: batch.batchId,
        entryId: batch.legacyEntryId,
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo preparar el SQL')
        return
      }

      if (!result.data?.hasSql || !result.data.sql) {
        toast.info('El deploy no tiene scripts SQL para copiar')
        return
      }

      try {
        await navigator.clipboard.writeText(result.data.sql)
        toast.success('SQL copiado')
      } catch {
        toast.error('No se pudo copiar el SQL')
      }
    })
  }

  function handleValidateConfiguration() {
    if (batch.type !== 'CONFIGURATION') return

    startTransition(async () => {
      const result = await validateEnvironmentConfigurationLog({
        environmentId,
        entryId: batch.legacyEntryId,
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo validar la configuración')
        return
      }

      toast.success('Configuración validada')
      router.refresh()
    })
  }

  if (batch.type === 'CONFIGURATION') {
    if (batch.validatedAt || !canValidateConfiguration) return <div />

    return (
      <div className="flex items-start justify-end pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleValidateConfiguration}
              disabled={isPending}
              aria-label="Validar configuración"
            >
              <Check className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Validar configuración</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-end pt-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopySql}
            disabled={isPending}
            aria-label="Copiar SQL del deploy"
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar SQL</TooltipContent>
      </Tooltip>
    </div>
  )
}
