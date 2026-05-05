'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { EnvironmentLogConfigurationView } from '@/app/actions/environment-log'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfigurationLogContentProps {
  entry: EnvironmentLogConfigurationView
}

function getUserLabel(entry: EnvironmentLogConfigurationView) {
  return entry.createdBy.name || entry.createdBy.username
}

function getValidatedByLabel(entry: EnvironmentLogConfigurationView) {
  return entry.validatedBy?.name || entry.validatedBy?.username || null
}

export function ConfigurationLogContent({ entry }: ConfigurationLogContentProps) {
  const [expanded, setExpanded] = useState(false)
  const validatedByLabel = getValidatedByLabel(entry)

  return (
    <div className="min-w-0 rounded-md border bg-card px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 h-6 w-6 shrink-0"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? 'Colapsar configuración' : 'Expandir configuración'}
          title={expanded ? 'Colapsar configuración' : 'Expandir configuración'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Configuración</Badge>
            <Badge variant={entry.validatedAt ? 'secondary' : 'outline'}>
              {entry.validatedAt ? 'Validada' : 'Pendiente de validación'}
            </Badge>
            <p className="min-w-0 text-sm">
              <span className="font-medium">{getUserLabel(entry)}</span>{' '}
              <span className="text-muted-foreground">registró configuración:</span>{' '}
              <span className="font-medium text-card-foreground">{entry.subject}</span>
            </p>
          </div>

          {expanded ? (
            <div
              className={cn(
                'prose prose-sm prose-invert max-w-none pt-1 text-card-foreground',
                '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-950 [&_pre]:p-3',
                '[&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:px-1 [&_code]:py-0.5',
                '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5'
              )}
              dangerouslySetInnerHTML={{ __html: entry.body }}
            />
          ) : null}

          {entry.validatedAt && validatedByLabel ? (
            <p className="text-xs text-muted-foreground">
              Validada por <span className="text-foreground">{validatedByLabel}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
