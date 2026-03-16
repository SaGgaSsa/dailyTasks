'use client'

import { KeyboardEvent } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Pin, Trash2 } from 'lucide-react'
import { Task } from '@/types'
import { TaskItemRow } from '@/components/board/task-item-row'

interface DraftTask {
    tempId: string
    title: string
    assignmentId: number
    userId: number
    isCompleted: boolean
}

export interface TaskListSectionProps {
    pendingTasks: Task[]
    completedTasks: Task[]
    pendingDrafts: DraftTask[]
    completedDrafts: DraftTask[]
    pinnedTaskIds: Set<number>
    pinnedDraftIds: Set<string>
    tasksToToggle: Set<number>
    taskEdits: Record<number, string>
    editingTaskId: number | null
    editingDraftTaskId: string | null
    draftTaskEdits: Record<string, string>
    incidenceId?: number
    scriptPageId?: number | null
    canEditTasks: boolean
    newTaskValue: string
    taskInputError: boolean
    assignmentId: number
    userId: number
    onToggleTask: (taskId: number) => void
    onDeleteTask: (taskId: number) => void
    onStartEditTask: (taskId: number, title: string) => void
    onSaveEditTask: (taskId: number) => void
    onCancelEditTask: (taskId: number) => void
    onEditChange: (taskId: number, value: string) => void
    onTogglePin: (taskId: number) => void
    onToggleDraftPin: (tempId: string) => void
    onToggleDraftTask: (tempId: string) => void
    onRemoveDraftTask: (tempId: string) => void
    onStartEditDraftTask: (tempId: string, title: string) => void
    onSaveEditDraftTask: (tempId: string) => void
    onCancelEditDraftTask: (tempId: string) => void
    onDraftEditChange: (tempId: string, value: string) => void
    onNewTaskChange: (value: string) => void
    onNewTaskSubmit: () => void
    onNavigateWithUnsavedChanges?: (url: string) => void
    showCompletedTasks?: boolean
    onToggleShowCompleted?: () => void
}

function sortByPinned<T>(items: T[], isPinned: (item: T) => boolean): T[] {
    return [...items].sort((a, b) => {
        const aPinned = isPinned(a)
        const bPinned = isPinned(b)
        if (aPinned && !bPinned) return -1
        if (!aPinned && bPinned) return 1
        return 0
    })
}

export function TaskListSection({
    pendingTasks,
    completedTasks,
    pendingDrafts,
    completedDrafts,
    pinnedTaskIds,
    pinnedDraftIds,
    tasksToToggle,
    taskEdits,
    editingTaskId,
    editingDraftTaskId,
    draftTaskEdits,
    incidenceId,
    scriptPageId,
    canEditTasks,
    newTaskValue,
    taskInputError,
    assignmentId,
    userId,
    onToggleTask,
    onDeleteTask,
    onStartEditTask,
    onSaveEditTask,
    onCancelEditTask,
    onEditChange,
    onTogglePin,
    onToggleDraftPin,
    onToggleDraftTask,
    onRemoveDraftTask,
    onStartEditDraftTask,
    onSaveEditDraftTask,
    onCancelEditDraftTask,
    onDraftEditChange,
    onNewTaskChange,
    onNewTaskSubmit,
    onNavigateWithUnsavedChanges,
    showCompletedTasks,
    onToggleShowCompleted,
}: TaskListSectionProps) {
    const sortedPendingTasks = sortByPinned(pendingTasks, (task) => pinnedTaskIds.has(task.id))
    const sortedPendingDrafts = sortByPinned(pendingDrafts, (draft) => pinnedDraftIds.has(draft.tempId))

    return (
        <>
            {sortedPendingTasks.map(task => {
                const isToggled = tasksToToggle.has(task.id)
                const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                return (
                    <TaskItemRow
                        key={task.id}
                        task={task}
                        incidenceId={incidenceId}
                        scriptPageId={scriptPageId ?? null}
                        onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                        checked={displayCompleted}
                        isEditing={editingTaskId === task.id}
                        editValue={taskEdits[task.id] || ''}
                        onToggle={() => onToggleTask(task.id)}
                        onEditChange={(value) => onEditChange(task.id, value)}
                        onEditKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEditTask(task.id)
                            if (e.key === 'Escape') onCancelEditTask(task.id)
                        }}
                        onEditBlur={() => onSaveEditTask(task.id)}
                        onStartEdit={() => onStartEditTask(task.id, task.title)}
                        onDelete={() => onDeleteTask(task.id)}
                        onTogglePin={() => onTogglePin(task.id)}
                        isPinned={pinnedTaskIds.has(task.id)}
                        canToggle={canEditTasks}
                        canEdit={canEditTasks}
                        canDelete={canEditTasks}
                        canPin={canEditTasks}
                    />
                )
            })}

            {sortedPendingDrafts.map(draft => (
                <div
                    key={draft.tempId}
                    className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group"
                >
                    <Checkbox
                        checked={draft.isCompleted}
                        onCheckedChange={() => onToggleDraftTask(draft.tempId)}
                        className="border-input"
                    />
                    {editingDraftTaskId === draft.tempId ? (
                        <Input
                            value={draftTaskEdits[draft.tempId] || ''}
                            onChange={(e) => onDraftEditChange(draft.tempId, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveEditDraftTask(draft.tempId)
                                if (e.key === 'Escape') onCancelEditDraftTask(draft.tempId)
                            }}
                            onBlur={() => onSaveEditDraftTask(draft.tempId)}
                            className="flex-1 bg-input border-border text-foreground h-6 text-sm"
                            autoFocus
                        />
                    ) : (
                        <span className={`text-sm text-card-foreground/80 flex-1 ${draft.isCompleted ? 'line-through text-muted-foreground/70' : ''}`}>
                            {draftTaskEdits[draft.tempId] || draft.title}
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleDraftPin(draft.tempId)}
                            className={`h-5 w-5 ${pinnedDraftIds.has(draft.tempId) ? 'text-amber-400' : 'text-muted-foreground/70 hover:text-card-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity'}`}
                            title={pinnedDraftIds.has(draft.tempId) ? 'Desfijar tarea' : 'Fijar tarea'}
                        >
                            <Pin className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onStartEditDraftTask(draft.tempId, draft.title)}
                                className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemoveDraftTask(draft.tempId)}
                                className="h-5 w-5 text-muted-foreground/70 hover:text-red-400"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}

            {canEditTasks && (
                <Input
                    data-assignment-id={userId}
                    value={newTaskValue}
                    onChange={(e) => onNewTaskChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onNewTaskSubmit()
                    }}
                    className={`bg-background text-foreground text-sm w-full ${taskInputError ? 'border-red-500' : 'border-border'}`}
                    placeholder="Nueva tarea..."
                />
            )}

            {completedTasks.length > 0 && onToggleShowCompleted && (
                <div className="pt-2 border-t border-border">
                    <button
                        type="button"
                        onClick={onToggleShowCompleted}
                        className="text-xs text-muted-foreground/70 hover:text-card-foreground/80 flex items-center gap-1"
                    >
                        {showCompletedTasks ? (
                            <>&#9660; Ocultar completadas ({completedTasks.length + completedDrafts.length})</>
                        ) : (
                            <>&#9654; Mostrar completadas ({completedTasks.length + completedDrafts.length})</>
                        )}
                    </button>

                    {showCompletedTasks && (
                        <div className="mt-2 space-y-1">
                            {completedTasks.map(task => {
                                const isToggled = tasksToToggle.has(task.id)
                                const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                return (
                                    <TaskItemRow
                                        key={task.id}
                                        task={task}
                                        incidenceId={incidenceId}
                                        scriptPageId={scriptPageId ?? null}
                                        onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                                        checked={displayCompleted}
                                        isEditing={false}
                                        editValue={taskEdits[task.id] || task.title}
                                        onToggle={() => onToggleTask(task.id)}
                                        onEditChange={() => {}}
                                        onEditKeyDown={() => {}}
                                        onEditBlur={() => {}}
                                        canToggle={canEditTasks}
                                        canEdit={false}
                                        canDelete={false}
                                        className="flex items-center gap-2 px-2 py-1 rounded group opacity-60"
                                    />
                                )
                            })}
                            {completedDrafts.map(draft => (
                                <div
                                    key={draft.tempId}
                                    className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group opacity-60"
                                >
                                    <Checkbox
                                        checked={draft.isCompleted}
                                        onCheckedChange={() => onToggleDraftTask(draft.tempId)}
                                        className="border-input"
                                    />
                                    <span className="text-sm line-through text-muted-foreground/70 flex-1">
                                        {draftTaskEdits[draft.tempId] || draft.title}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemoveDraftTask(draft.tempId)}
                                        className="h-5 w-5 text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {completedTasks.length > 0 && !onToggleShowCompleted && (
                <div className="pt-2 space-y-1">
                    {completedTasks.map(task => {
                        const isToggled = tasksToToggle.has(task.id)
                        const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                        return (
                            <TaskItemRow
                                key={task.id}
                                task={task}
                                incidenceId={incidenceId}
                                scriptPageId={scriptPageId ?? null}
                                onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                                checked={displayCompleted}
                                isEditing={false}
                                editValue={taskEdits[task.id] || task.title}
                                onToggle={() => onToggleTask(task.id)}
                                onEditChange={() => {}}
                                onEditKeyDown={() => {}}
                                onEditBlur={() => {}}
                                canToggle={canEditTasks}
                                canEdit={false}
                                canDelete={false}
                                className="flex items-center gap-2 px-2 py-1 rounded group opacity-60"
                            />
                        )
                    })}
                    {completedDrafts.map(draft => (
                        <div
                            key={draft.tempId}
                            className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group opacity-60"
                        >
                            <Checkbox
                                checked={draft.isCompleted}
                                onCheckedChange={() => onToggleDraftTask(draft.tempId)}
                                className="border-input"
                            />
                            <span className="text-sm line-through text-muted-foreground/70 flex-1">
                                {draftTaskEdits[draft.tempId] || draft.title}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemoveDraftTask(draft.tempId)}
                                className="h-5 w-5 text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
