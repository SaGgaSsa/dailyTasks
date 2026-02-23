'use client'

import { useState, useEffect, useCallback } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IncidenceWithDetails } from '@/types'
import { createSubTask, toggleSubTask, deleteSubTask, getIncidence, updateIncidence } from '@/app/actions/incidence-actions'
import { Trash2, Loader2, Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface TasksTabProps {
    incidence: IncidenceWithDetails
    allUsers: { id: number; name: string | null; username: string; role: string }[]
    currentUserId: number
    isAdmin: boolean
    onIncidenceUpdate: (incidence: IncidenceWithDetails) => void
    onHasChangesChange?: (hasChanges: boolean) => void
    onSaveRef?: (saveFn: () => Promise<void>) => void
}

interface DraftTask {
    tempId: string
    title: string
    assignmentId: number
    isCompleted: boolean
}

export function TasksTab({ incidence, allUsers, currentUserId, isAdmin, onIncidenceUpdate, onHasChangesChange, onSaveRef }: TasksTabProps) {
    const [newTaskInputs, setNewTaskInputs] = useState<Record<number, string>>({})
    const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
    const [tasksToToggle, setTasksToToggle] = useState<Set<number>>(new Set())
    const [tasksToDelete, setTasksToDelete] = useState<Set<number>>(new Set())
    const [assigningUser, setAssigningUser] = useState<number | null>(null)

    const assignedUserIds = new Set(incidence.assignments.map(a => a.userId))

    const sortedAssignedUsers = [...incidence.assignments]
        .sort((a, b) => {
            if (a.user.role === 'DEV' && b.user.role !== 'DEV') return -1
            if (a.user.role !== 'DEV' && b.user.role === 'DEV') return 1
            return (a.user.name || a.user.username).localeCompare(b.user.name || b.user.username)
        })

    const unassignedUsers = allUsers
        .filter(u => !assignedUserIds.has(u.id))
        .sort((a, b) => {
            if (a.role === 'DEV' && b.role !== 'DEV') return -1
            if (a.role !== 'DEV' && b.role === 'DEV') return 1
            return (a.name || a.username).localeCompare(b.name || b.username)
        })

    const handleAddTask = async (assignmentId: number, title: string) => {
        if (!title.trim() || title.trim().length < 3) {
            toast.error('La tarea debe tener al menos 3 caracteres')
            return
        }

        const tempId = `${assignmentId}-${Date.now()}`
        setDraftTasks(prev => [...prev, { tempId, title: title.trim(), assignmentId, isCompleted: false }])
        setNewTaskInputs(prev => ({ ...prev, [assignmentId]: '' }))
    }

    const handleRemoveDraftTask = (tempId: string) => {
        setDraftTasks(prev => prev.filter(t => t.tempId !== tempId))
    }

    const handleToggleDraftTask = (tempId: string) => {
        setDraftTasks(prev => prev.map(t =>
            t.tempId === tempId ? { ...t, isCompleted: !t.isCompleted } : t
        ))
    }

    const handleToggleTask = (taskId: number) => {
        setTasksToToggle(prev => {
            const next = new Set(prev)
            if (next.has(taskId)) {
                next.delete(taskId)
            } else {
                next.add(taskId)
            }
            return next
        })
    }

    const handleDeleteTask = (taskId: number) => {
        setTasksToDelete(prev => {
            const next = new Set(prev)
            if (next.has(taskId)) {
                next.delete(taskId)
            } else {
                next.add(taskId)
            }
            return next
        })
    }

    const handleAssignUser = async (userId: number) => {
        if (!isAdmin) return

        setAssigningUser(userId)
        try {
            const currentAssignees = incidence.assignments.map(a => ({
                userId: a.userId,
                assignedHours: a.assignedHours
            }))

            const result = await updateIncidence(incidence.id, {
                assignees: [...currentAssignees, { userId, assignedHours: null }]
            })

            if (result.success && result.data) {
                onIncidenceUpdate(result.data)
                toast.success('Colaborador asignado correctamente')
            } else {
                toast.error(result.error || 'Error al asignar colaborador')
            }
        } catch {
            toast.error('Error inesperado')
        } finally {
            setAssigningUser(null)
        }
    }

    const handleRemoveAssignee = async (userId: number) => {
        if (!isAdmin) return

        setAssigningUser(userId)
        try {
            const currentAssignees = incidence.assignments
                .filter(a => a.userId !== userId)
                .map(a => ({
                    userId: a.userId,
                    assignedHours: a.assignedHours
                }))

            const result = await updateIncidence(incidence.id, {
                assignees: currentAssignees
            })

            if (result.success && result.data) {
                onIncidenceUpdate(result.data)
                toast.success('Colaborador removido')
            } else {
                toast.error(result.error || 'Error al remover colaborador')
            }
        } catch {
            toast.error('Error inesperado')
        } finally {
            setAssigningUser(null)
        }
    }

    const handleSaveChanges = useCallback(async () => {
        try {
            let autoTransitionedToReview = false

            for (const draft of draftTasks) {
                const result = await createSubTask(draft.assignmentId, draft.title, draft.isCompleted)
                if (result.success && result.autoTransitionedToReview) {
                    autoTransitionedToReview = true
                }
            }
            setDraftTasks([])

            for (const taskId of tasksToToggle) {
                const result = await toggleSubTask(taskId)
                if (result.success && result.autoTransitionedToReview) {
                    autoTransitionedToReview = true
                }
            }
            setTasksToToggle(new Set())

            for (const taskId of tasksToDelete) {
                await deleteSubTask(taskId)
            }
            setTasksToDelete(new Set())

            const updatedData = await getIncidence(incidence.id)
            if (updatedData) {
                onIncidenceUpdate(updatedData)
            }

            if (autoTransitionedToReview) {
                toast.success('Todas las tareas completadas. Incidencia en revisión.')
            } else {
                toast.success('Cambios guardados')
            }
        } catch {
            toast.error('Error al guardar cambios')
        }
    }, [draftTasks, tasksToToggle, tasksToDelete, incidence.id, onIncidenceUpdate])

    const hasChanges = draftTasks.length > 0 || tasksToToggle.size > 0 || tasksToDelete.size > 0

    useEffect(() => {
        onHasChangesChange?.(hasChanges)
    }, [hasChanges, onHasChangesChange])

    useEffect(() => {
        onSaveRef?.(handleSaveChanges)
    }, [onSaveRef, handleSaveChanges])

    return (
        <div className="space-y-6">
            {sortedAssignedUsers.map((assignment) => {
                const pendingTasks = assignment.tasks.filter(t => !t.isCompleted && !tasksToDelete.has(t.id))
                const completedTasks = assignment.tasks.filter(t => t.isCompleted && !tasksToDelete.has(t.id))
                const draftTasksForUser = draftTasks.filter(d => d.assignmentId === assignment.id)
                const pendingDrafts = draftTasksForUser.filter(d => !d.isCompleted)
                const completedDrafts = draftTasksForUser.filter(d => d.isCompleted)

                const canEditTasks = isAdmin || assignment.userId === currentUserId
                const totalPending = pendingTasks.length + pendingDrafts.length
                const totalCompleted = completedTasks.length + completedDrafts.length
                const total = totalPending + totalCompleted

                return (
                    <div key={assignment.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{assignment.user.name || assignment.user.username}</span>
                                <span className="text-sm text-muted-foreground">
                                    ({totalPending}/{total} pendientes)
                                </span>
                                {assignment.assignedHours && (
                                    <span className="text-sm text-muted-foreground">
                                        - {assignment.assignedHours}h
                                    </span>
                                )}
                            </div>
                            {isAdmin && assignment.tasks.length === 0 && draftTasksForUser.length === 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleRemoveAssignee(assignment.userId)}
                                    disabled={assigningUser === assignment.userId}
                                >
                                    {assigningUser === assignment.userId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="h-4 w-4" />
                                    )}
                                </Button>
                            )}
                        </div>

                        <div className="space-y-1 pl-4">
                            {pendingTasks.map(task => {
                                const isToggled = tasksToToggle.has(task.id)
                                const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 group"
                                    >
                                        <Checkbox
                                            checked={displayCompleted}
                                            onCheckedChange={() => handleToggleTask(task.id)}
                                            disabled={!canEditTasks}
                                        />
                                        <span className="text-sm flex-1">{task.title}</span>
                                        {canEditTasks && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={() => handleDeleteTask(task.id)}
                                            >
                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}

                            {pendingDrafts.map(draft => (
                                <div
                                    key={draft.tempId}
                                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-accent/50 group"
                                >
                                    <Checkbox
                                        checked={draft.isCompleted}
                                        onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
                                    />
                                    <span className="text-sm flex-1">{draft.title}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemoveDraftTask(draft.tempId)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                                    </Button>
                                </div>
                            ))}

                            {completedTasks.map(task => {
                                const isToggled = tasksToToggle.has(task.id)
                                const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 group opacity-60"
                                    >
                                        <Checkbox
                                            checked={displayCompleted}
                                            onCheckedChange={() => handleToggleTask(task.id)}
                                            disabled={!canEditTasks}
                                        />
                                        <span className="text-sm flex-1 line-through">{task.title}</span>
                                    </div>
                                )
                            })}

                            {completedDrafts.map(draft => (
                                <div
                                    key={draft.tempId}
                                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-accent/50 group opacity-60"
                                >
                                    <Checkbox
                                        checked={draft.isCompleted}
                                        onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
                                    />
                                    <span className="text-sm flex-1 line-through">{draft.title}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemoveDraftTask(draft.tempId)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                                    </Button>
                                </div>
                            ))}

                            {canEditTasks && (
                                <div className="pt-2">
                                    <Input
                                        value={newTaskInputs[assignment.id] || ''}
                                        onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [assignment.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddTask(assignment.id, newTaskInputs[assignment.id] || '')
                                            }
                                        }}
                                        placeholder="Agregar nueva tarea..."
                                        className="bg-input/50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}

            {isAdmin && unassignedUsers.length > 0 && (
                <>
                    <Separator className="my-6" />
                    <div className="space-y-3">
                        <h3 className="font-medium text-muted-foreground">Colaboradores Disponibles</h3>
                        <div className="space-y-2">
                            {unassignedUsers.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between py-2 px-3 rounded bg-accent/20"
                                >
                                    <span>{user.name || user.username}</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAssignUser(user.id)}
                                        disabled={assigningUser === user.id}
                                    >
                                        {assigningUser === user.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Asignar
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
