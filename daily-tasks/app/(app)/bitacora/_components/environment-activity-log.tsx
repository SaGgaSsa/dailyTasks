'use client'

import Link from 'next/link'
import { Filter } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EnvironmentLogBatchView,
  PendingEnvironmentDeployItem,
} from '@/app/actions/environment-log'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { EnvironmentConfigurationDialog } from './environment-configuration-dialog'
import { EnvironmentDeployDialog } from './environment-deploy-dialog'
import { DeployLogActions } from './environment-log-actions'
import { EnvironmentLogTypeContent } from './environment-log-type-content'

interface EnvironmentActivityLogProps {
  environmentId: number
  environmentName: string
  batches: EnvironmentLogBatchView[]
  pendingItems: PendingEnvironmentDeployItem[]
  canRegisterDeploy: boolean
  canCreateConfiguration: boolean
  canValidateConfiguration: boolean
}

const LOG_TYPE_LABELS = {
  DEPLOY: 'Deploy',
  CONFIGURATION: 'Configuración',
} as const

type LogType = EnvironmentLogBatchView['type']
const DEFAULT_LOG_TYPES = Object.keys(LOG_TYPE_LABELS) as LogType[]

function formatDay(date: Date) {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).toLocaleUpperCase('es-ES')
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EnvironmentActivityLog({
  environmentId,
  environmentName,
  batches,
  pendingItems,
  canRegisterDeploy,
  canCreateConfiguration,
  canValidateConfiguration,
}: EnvironmentActivityLogProps) {
  const [selectedTypes, setSelectedTypes] = useState<LogType[]>(DEFAULT_LOG_TYPES)

  const groups = useMemo(() => {
    const filtered = batches.filter((batch) => selectedTypes.includes(batch.type))
    const grouped = new Map<string, EnvironmentLogBatchView[]>()

    for (const batch of filtered) {
      const day = formatDay(batch.occurredAt)
      grouped.set(day, [...(grouped.get(day) ?? []), batch])
    }

    return [...grouped.entries()].map(([day, dayBatches]) => ({
      day,
      batches: dayBatches,
    }))
  }, [batches, selectedTypes])

  function handleTypeChange(type: LogType, checked: boolean) {
    setSelectedTypes((current) => {
      if (checked) return Array.from(new Set([...current, type]))
      return current.filter((item) => item !== type)
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
              <Link href="/bitacora">Bitácora</Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{environmentName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity log del ambiente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <EnvironmentConfigurationDialog
              environmentId={environmentId}
              environmentName={environmentName}
              canCreateConfiguration={canCreateConfiguration}
            />
            <EnvironmentDeployDialog
              environmentId={environmentId}
              environmentName={environmentName}
              initialPendingItems={pendingItems}
              canRegisterDeploy={canRegisterDeploy}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn('h-9 w-9', selectedTypes.length !== Object.keys(LOG_TYPE_LABELS).length && 'border-primary text-primary')}
                  aria-label="Filtrar por tipo"
                  title="Filtrar por tipo"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Tipo de log</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(LOG_TYPE_LABELS).map(([type, label]) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type as LogType)}
                    onCheckedChange={(checked) => handleTypeChange(type as LogType, Boolean(checked))}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-8">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No hay entradas para los filtros seleccionados.
            </div>
          ) : null}

          {groups.map((group) => (
            <section key={group.day} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.day}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1">
                {group.batches.map((batch, index) => (
                  <div
                    key={batch.id}
                    className="grid grid-cols-[4.25rem_1rem_minmax(0,1fr)_auto] gap-x-3 py-3"
                  >
                    <div className="pt-1 text-right text-xs text-muted-foreground">
                      {formatTime(batch.occurredAt)}
                    </div>
                    <div className="relative flex justify-center">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                      {index < group.batches.length - 1 ? (
                        <span className="absolute top-5 bottom-[-1.25rem] w-px bg-border" />
                      ) : null}
                    </div>
                    <EnvironmentLogTypeContent batch={batch} />
                    <DeployLogActions
                      environmentId={environmentId}
                      batch={batch}
                      canValidateConfiguration={canValidateConfiguration}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
