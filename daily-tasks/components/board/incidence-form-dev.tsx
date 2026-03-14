'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { IncidenceWithDetails, Task } from '@/types'
import { TaskType } from '@/types/enums'
import { FormSheet } from '@/components/ui/form-sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Trash2, Edit2, Loader2 } from 'lucide-react'
import { toggleTask, deleteTask, createTask, getIncidenceWithUsers, updateTaskTitle, updateIncidenceComment } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'

interface IncidenceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: IncidenceWithDetails | null
    type?: TaskType
    externalId?: number
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
    onIncidenceCreated?: () => void
    isDev?: boolean
    isKanban?: boolean
}

interface DraftTask {
    tempId: string
    title: string
    assignmentId: number
    isCompleted: boolean
}

export function IncidenceFormDev({ open, onOpenChange, initialData, type, externalId, onTaskUpdate, isKanban = false }: IncidenceFormProps) {
    const { data: session } = useSession()
    const currentUserId = session?.user?.id ? Number(session.user.id) : 0

    const [tasks, setTasks] = useState<Task[]>([])
    const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
    const [tasksToUpdate, setTasksToUpdate] = useState<Set<number>>(new Set())
    const [tasksToDelete, setTasksToDelete] = useState<Set<number>>(new Set())
    const [taskEdits, setTaskEdits] = useState<Record<number, string>>({})

    const [fullIncidenceData, setFullIncidenceData] = useState<IncidenceWithDetails | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [showCompleted, setShowCompleted] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editingDraftTaskId, setEditingDraftTaskId] = useState<string | null>(null)
    const [draftTaskEdits, setDraftTaskEdits] = useState<Record<string, string>>({})
    const [description, setDescription] = useState('')
    const [originalDescription, setOriginalDescription] = useState('')

    const tramiteNumber = initialData?.externalWorkItem
        ? `${initialData.externalWorkItem.type} ${initialData.externalWorkItem.externalId}`
        : 'Trámite'

    const title = isKanban && initialData
        ? `${initialData.status} - ${tramiteNumber}`
        : (initialData ? 'Editar Incidencia' : 'Nueva Incidencia')

    useEffect(() => {
        const loadUserTasks = async () => {
            if (open && initialData?.id && type && externalId) {
                setIsLoading(true)
                setDraftTasks([])
                setTasksToUpdate(new Set())
                setTasksToDelete(new Set())
                setTaskEdits({})
                try {
                    const { incidence } = await getIncidenceWithUsers(type, externalId)
                    if (incidence) {
                        setFullIncidenceData(incidence)
                        setDescription(incidence.comment || '')
                        setOriginalDescription(incidence.comment || '')
                        const userAssignment = incidence.assignments.find(
                            (a: { isAssigned: boolean; userId: number }) => a.isAssigned && a.userId === currentUserId
                        )
                        if (userAssignment) {
                            setTasks(userAssignment.tasks)
                        }
                    }
                } catch {
                    toast.error('Error cargando tareas')
                } finally {
                    setIsLoading(false)
                }
            } else if (open && !initialData) {
                setTasks([])
                setDraftTasks([])
                setTasksToUpdate(new Set())
                setTasksToDelete(new Set())
                setTaskEdits({})
                setDescription('')
                setOriginalDescription('')
                setIsLoading(false)
            }
        }
        loadUserTasks()
    }, [open, initialData, type, externalId, currentUserId])

    const assignmentId = useMemo(() => {
        return fullIncidenceData?.assignments.find(
            a => a.isAssigned && a.userId === currentUserId
        )?.id
    }, [fullIncidenceData, currentUserId])

    const handleToggleDraft = (tempId: string) => {
        setDraftTasks(prev => prev.map(t => 
            t.tempId === tempId ? { ...t, isCompleted: !t.isCompleted } : t
        ))
    }

    const removeDraftTask = (tempId: string) => {
        setDraftTasks(prev => prev.filter(t => t.tempId !== tempId))
    }

    const pendingTasks = tasks.filter(t => !t.isCompleted && !tasksToDelete.has(t.id))
    const completedTasks = tasks.filter(t => t.isCompleted && !tasksToDelete.has(t.id))
    const draftPending = draftTasks.filter(t => !t.isCompleted)
    const draftCompleted = draftTasks.filter(t => t.isCompleted)

    const hasChanges = useMemo(() => {
        return draftTasks.length > 0 ||
            tasksToUpdate.size > 0 ||
            tasksToDelete.size > 0 ||
            Object.keys(taskEdits).length > 0 ||
            description !== originalDescription
    }, [draftTasks, tasksToUpdate, tasksToDelete, taskEdits, description, originalDescription])

    const handleToggle = (taskId: number) => {
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        ))
        setTasksToUpdate(prev => {
            const next = new Set(prev)
            if (next.has(taskId)) {
                next.delete(taskId)
            } else {
                next.add(taskId)
            }
            return next
        })
    }

    const handleDelete = (taskId: number) => {
        setTasksToDelete(prev => new Set(prev).add(taskId))
    }

    const handleCreate = () => {
        if (!newTaskTitle.trim() || newTaskTitle.trim().length < 3) return
        if (!assignmentId) {
            toast.error('No tienes asignaciones en esta incidencia')
            return
        }

        const tempId = `draft-${Date.now()}`
        setDraftTasks(prev => [...prev, {
            tempId,
            title: newTaskTitle.trim(),
            assignmentId,
            isCompleted: false
        }])
        setNewTaskTitle('')
    }

    const startEdit = (task: Task) => {
        setEditingTaskId(task.id)
        setEditTitle(task.title)
    }

    const saveEdit = (taskId: number) => {
        if (!editTitle.trim() || editTitle.trim().length < 3) return
        setTaskEdits(prev => ({ ...prev, [taskId]: editTitle.trim() }))
        setEditingTaskId(null)
        setEditTitle('')
    }

    const cancelEdit = () => {
        setEditingTaskId(null)
        setEditTitle('')
    }

    const handleStartEditDraftTask = (tempId: string, currentTitle: string) => {
        setEditingDraftTaskId(tempId)
        setDraftTaskEdits(prev => ({ ...prev, [tempId]: currentTitle }))
    }

    const handleSaveEditDraftTask = (tempId: string) => {
        const newTitle = draftTaskEdits[tempId]
        if (!newTitle?.trim() || newTitle.trim().length < 3) {
            setEditingDraftTaskId(null)
            setDraftTaskEdits(prev => {
                const next = { ...prev }
                delete next[tempId]
                return next
            })
            return
        }
        setDraftTasks(prev => prev.map(t => 
            t.tempId === tempId ? { ...t, title: newTitle.trim() } : t
        ))
        setDraftTaskEdits(prev => ({ ...prev, [tempId]: newTitle.trim() }))
        setEditingDraftTaskId(null)
    }

    const handleCancelEditDraftTask = (tempId: string) => {
        setEditingDraftTaskId(null)
        setDraftTaskEdits(prev => {
            const next = { ...prev }
            delete next[tempId]
            return next
        })
    }

    const handleSave = async () => {
        if (!assignmentId && draftTasks.length === 0) {
            return true
        }

        setIsSaving(true)
        let hasErrors = false

        try {
            for (const draft of draftTasks) {
                const result = await createTask(draft.assignmentId, draft.title)
                if (!result.success) {
                    toast.error(result.error)
                    hasErrors = true
                }
            }
            setDraftTasks([])

            for (const taskId of tasksToUpdate) {
                const result = await toggleTask(taskId)
                if (!result.success) {
                    toast.error(result.error)
                    hasErrors = true
                } else if (result.autoTransitionedToReview) {
                    toast.success('🎉 ' + result.message)
                } else if (result.autoTransitionedToInProgress) {
                    toast.success('🚀 ' + result.message)
                }
            }
            setTasksToUpdate(new Set())

            for (const taskId of tasksToDelete) {
                const result = await deleteTask(taskId)
                if (!result.success) {
                    toast.error(result.error)
                    hasErrors = true
                }
            }
            setTasksToDelete(new Set())

            for (const [taskId, newTitle] of Object.entries(taskEdits)) {
                const result = await updateTaskTitle(Number(taskId), newTitle)
                if (!result.success) {
                    toast.error(result.error)
                    hasErrors = true
                }
            }
            setTaskEdits({})

            if (description !== originalDescription && initialData?.id) {
                const commentResult = await updateIncidenceComment(initialData.id, description)
                if (!commentResult.success) {
                    toast.error(commentResult.error)
                    hasErrors = true
                }
            }

            if (!hasErrors) {
                if (initialData && onTaskUpdate && type && externalId) {
                    const { incidence: updatedData } = await getIncidenceWithUsers(type, externalId)
                    if (updatedData) {
                        onTaskUpdate(updatedData)
                    } else {
                        onTaskUpdate(initialData)
                    }
                }
            }

            return !hasErrors
        } catch {
            toast.error('Error inesperado')
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        if (hasChanges) {
            toast.info('Cambios sin guardar descartados')
        }
        onOpenChange(false)
    }

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            isEditMode={!!initialData?.id}
            isSaving={isSaving}
            onSave={handleSave}
            onClose={handleClose}
            hasUnsavedChanges={hasChanges}
            onDiscard={handleClose}
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-32">
                    <Loader2 className="h-12 w-12 animate-spin text-yellow-400" />
                    <span className="mt-4 text-muted-foreground">Cargando tareas...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {initialData && (
                        <h2 className="text-lg font-semibold text-card-foreground">
                            {initialData.description}
                        </h2>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-card-foreground/80">
                                Pendientes ({pendingTasks.length + draftPending.length}/{tasks.filter(t => !tasksToDelete.has(t.id)).length + draftTasks.length})
                            </Label>
                            {completedTasks.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={showCompleted}
                                        onCheckedChange={setShowCompleted}
                                        className="data-[state=checked]:bg-zinc-700"
                                    />
                                    <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setShowCompleted(!showCompleted)}>
                                        Mostrar completadas
                                    </Label>
                                </div>
                            )}
                        </div>

                        {pendingTasks.map(task => {
                            const isQaReported = (task as typeof task & { isQaReported?: boolean }).isQaReported === true
                            return (
                            <div key={task.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded group">
                                <Checkbox
                                    checked={task.isCompleted}
                                    onCheckedChange={() => handleToggle(task.id)}
                                    className="border-input"
                                />
                                {editingTaskId === task.id ? (
                                    <Input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveEdit(task.id)
                                            if (e.key === 'Escape') cancelEdit()
                                        }}
                                        onBlur={() => saveEdit(task.id)}
                                        className="flex-1 bg-input border-border text-card-foreground h-7"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className={`text-sm truncate ${task.isCompleted ? 'line-through text-muted-foreground/70' : 'text-card-foreground/80'}`}>
                                            {taskEdits[task.id] || task.title}
                                        </span>
                                    </div>
                                )}
                                {!task.isCompleted && !isQaReported && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => startEdit(task)}
                                            className="h-6 w-6 text-muted-foreground/70 hover:text-card-foreground/80"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(task.id)}
                                            className="h-6 w-6 text-muted-foreground/70 hover:text-red-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )})}

                        {draftPending.map(draft => (
                            <div key={draft.tempId} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded group">
                                <Checkbox
                                    checked={draft.isCompleted}
                                    onCheckedChange={() => handleToggleDraft(draft.tempId)}
                                    className="border-input"
                                />
                                {editingDraftTaskId === draft.tempId ? (
                                    <Input
                                        value={draftTaskEdits[draft.tempId] || ''}
                                        onChange={(e) => setDraftTaskEdits(prev => ({ ...prev, [draft.tempId]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEditDraftTask(draft.tempId)
                                            if (e.key === 'Escape') handleCancelEditDraftTask(draft.tempId)
                                        }}
                                        onBlur={() => handleSaveEditDraftTask(draft.tempId)}
                                        className="flex-1 bg-input border-border text-foreground h-6 text-sm"
                                        autoFocus
                                    />
                                ) : (
                                    <span className={`text-sm flex-1 ${draft.isCompleted ? 'line-through text-muted-foreground/70' : 'text-card-foreground/80'}`}>{draftTaskEdits[draft.tempId] || draft.title}</span>
                                )}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleStartEditDraftTask(draft.tempId, draft.title)}
                                        className="h-6 w-6 text-muted-foreground/70 hover:text-card-foreground/80"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeDraftTask(draft.tempId)}
                                        className="h-6 w-6 text-muted-foreground/70 hover:text-red-400"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Input
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreate()
                            }}
                            placeholder="+ Nueva tarea..."
                            disabled={isSaving}
                            className="bg-input border-border text-card-foreground"
                        />
                    </div>

                    {showCompleted && (completedTasks.length > 0 || draftCompleted.length > 0) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                            <Label className="text-muted-foreground text-xs">Completadas ({completedTasks.length + draftCompleted.length})</Label>
                            {draftCompleted.map(draft => (
                                <div key={draft.tempId} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded opacity-60 group">
                                    <Checkbox
                                        checked={true}
                                        onCheckedChange={() => handleToggleDraft(draft.tempId)}
                                        className="border-input"
                                    />
                                    {editingDraftTaskId === draft.tempId ? (
                                        <Input
                                            value={draftTaskEdits[draft.tempId] || ''}
                                            onChange={(e) => setDraftTaskEdits(prev => ({ ...prev, [draft.tempId]: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEditDraftTask(draft.tempId)
                                                if (e.key === 'Escape') handleCancelEditDraftTask(draft.tempId)
                                            }}
                                            onBlur={() => handleSaveEditDraftTask(draft.tempId)}
                                            className="flex-1 bg-input border-border text-foreground h-6 text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-sm text-muted-foreground line-through flex-1">{draftTaskEdits[draft.tempId] || draft.title}</span>
                                    )}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleStartEditDraftTask(draft.tempId, draft.title)}
                                            className="h-6 w-6 text-muted-foreground/70 hover:text-card-foreground/80"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeDraftTask(draft.tempId)}
                                            className="h-6 w-6 text-muted-foreground/70 hover:text-red-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {completedTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded opacity-60">
                                    <Checkbox
                                        checked={true}
                                        onCheckedChange={() => handleToggle(task.id)}
                                        className="border-input"
                                    />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-sm text-muted-foreground line-through truncate">
                                            {taskEdits[task.id] || task.title}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 pt-4 border-t border-border">
                        <Label className="text-card-foreground/80">Comentarios</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="min-h-[100px] bg-input border-border text-card-foreground resize-none"
                            placeholder="Añade comentarios o notas técnicas..."
                        />
                    </div>
                </div>
            )}
        </FormSheet>
    )
}
