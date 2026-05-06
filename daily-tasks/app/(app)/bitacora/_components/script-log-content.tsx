'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { EnvironmentLogScriptView } from '@/app/actions/environment-log'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'

interface ScriptLogContentProps {
  entry: EnvironmentLogScriptView
}

function getUserLabel(entry: EnvironmentLogScriptView) {
  return entry.createdBy.name || entry.createdBy.username
}

export function ScriptLogContent({ entry }: ScriptLogContentProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="min-w-0 rounded-md border bg-card px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 h-6 w-6 shrink-0"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? 'Colapsar script' : 'Expandir script'}
          title={expanded ? 'Colapsar script' : 'Expandir script'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Script</Badge>
            <Badge variant="secondary">{entry.scriptType}</Badge>
            <p className="min-w-0 text-sm">
              <span className="font-medium">{getUserLabel(entry)}</span>{' '}
              <span className="text-muted-foreground">registró script {entry.scriptType}:</span>{' '}
              <span className="font-medium text-card-foreground">{entry.subject}</span>
            </p>
          </div>

          {expanded ? (
            <CodeBlock
              code={entry.body}
              variant={entry.scriptType === 'SQL' ? 'sql' : 'code'}
              collapsible={false}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
