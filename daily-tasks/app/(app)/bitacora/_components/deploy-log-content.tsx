'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { EnvironmentLogBatchView } from '@/app/actions/environment-log'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DeployLogContentProps {
  batch: EnvironmentLogBatchView
}

function getUserLabel(batch: EnvironmentLogBatchView) {
  return batch.createdBy.name || batch.createdBy.username
}

export function DeployLogContent({ batch }: DeployLogContentProps) {
  const [expanded, setExpanded] = useState(false)
  const itemCount = batch.items.length

  return (
    <div className="min-w-0 rounded-md border bg-card px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 h-6 w-6 shrink-0"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? 'Colapsar deploy' : 'Expandir deploy'}
          title={expanded ? 'Colapsar deploy' : 'Expandir deploy'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </Button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Deploy</Badge>
            <p className="min-w-0 text-sm">
              <span className="font-medium">{getUserLabel(batch)}</span>{' '}
              <span className="text-muted-foreground">
                registró deploy de {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </p>
          </div>

          {expanded ? (
            <div className="space-y-2 pt-2">
              {batch.items.map((item) => (
                <div key={item.id} className="rounded-md bg-muted/40 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.incidence ? (
                      <Badge variant="outline">
                        {item.incidence.workItem.type} {item.incidence.workItem.externalId}
                      </Badge>
                    ) : null}
                    {item.ticket ? (
                      <Badge variant="secondary">Ticket #{item.ticket.ticketNumber}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-card-foreground">
                    {item.incidence?.description ?? item.ticket?.description ?? 'Sin descripción'}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
