'use client'

import { KeyboardEvent } from 'react'
import { FileText, Pencil, Pin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { OpenScriptsButton } from '@/components/incidences/open-scripts-button'
import { LongTextSheet } from '@/components/ui/long-text-sheet'

interface TaskItemLike {
  id: number
  title: string
  description?: string | null
  isQaReported?: boolean
}

interface TaskItemRowProps {
  task: TaskItemLike
  incidenceId?: number | null
  onNavigateWithUnsavedChanges?: (url: string) => void
  checked: boolean
  isEditing: boolean
  editValue: string
  onToggle: () => void
  onEditChange: (value: string) => void
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onEditBlur: () => void
  onStartEdit?: () => void
  onDelete?: () => void
  onTogglePin?: () => void
  isPinned?: boolean
  canToggle?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canPin?: boolean
  className?: string
}

export function TaskItemRow({
  task,
  incidenceId,
  onNavigateWithUnsavedChanges,
  checked,
  isEditing,
  editValue,
  onToggle,
  onEditChange,
  onEditKeyDown,
  onEditBlur,
  onStartEdit,
  onDelete,
  onTogglePin,
  isPinned = false,
  canToggle = true,
  canEdit = true,
  canDelete = true,
  canPin = false,
  className = 'flex items-center gap-2 px-2 py-1 bg-accent/30 rounded group',
}: TaskItemRowProps) {
  const isQaReported = task.isQaReported === true
  const allowEdit = canEdit && !isQaReported
  const allowDelete = canDelete && !isQaReported
  const hasDescription = Boolean(task.description?.trim())

  return (
    <div className={className}>
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={!canToggle}
        className="border-input"
      />
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(event) => onEditChange(event.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onEditBlur}
          className="flex-1 bg-input border-border text-foreground h-6 text-sm"
          autoFocus
        />
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-card-foreground/80 truncate flex-1 min-w-0">{editValue || task.title}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        {canPin && onTogglePin && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className={`h-5 w-5 ${isPinned ? 'text-amber-400' : 'text-muted-foreground/70 hover:text-card-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity'}`}
            title={isPinned ? 'Desfijar tarea' : 'Fijar tarea'}
          >
            <Pin className="h-3 w-3" />
          </Button>
        )}
        {hasDescription && (
          <LongTextSheet
            title="Descripción de la tarea"
            content={task.description?.trim() || ''}
            description={task.title}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => event.stopPropagation()}
                className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                title="Ver descripción"
              >
                <FileText className="h-3 w-3" />
              </Button>
            }
          />
        )}
        {isQaReported && incidenceId && (
          <OpenScriptsButton
            incidenceId={incidenceId}
            onNavigate={onNavigateWithUnsavedChanges}
            className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
          />
        )}
        {(allowEdit || allowDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {allowEdit && onStartEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStartEdit}
              className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {allowDelete && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-5 w-5 text-muted-foreground/70 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          </div>
        )}
      </div>
    </div>
  )
}
