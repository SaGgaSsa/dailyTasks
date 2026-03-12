'use client'

import { KeyboardEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface TaskItemLike {
  id: number
  title: string
  isQaReported?: boolean
}

interface TaskItemRowProps {
  task: TaskItemLike
  checked: boolean
  isEditing: boolean
  editValue: string
  onToggle: () => void
  onEditChange: (value: string) => void
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onEditBlur: () => void
  onStartEdit?: () => void
  onDelete?: () => void
  canToggle?: boolean
  canEdit?: boolean
  canDelete?: boolean
  className?: string
}

export function TaskItemRow({
  task,
  checked,
  isEditing,
  editValue,
  onToggle,
  onEditChange,
  onEditKeyDown,
  onEditBlur,
  onStartEdit,
  onDelete,
  canToggle = true,
  canEdit = true,
  canDelete = true,
  className = 'flex items-center gap-2 px-2 py-1 bg-accent/30 rounded group',
}: TaskItemRowProps) {
  const isQaReported = task.isQaReported === true
  const allowEdit = canEdit && !isQaReported
  const allowDelete = canDelete && !isQaReported

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
          <span className="text-sm text-card-foreground/80 truncate">{editValue || task.title}</span>
        </div>
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
  )
}
