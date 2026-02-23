'use client'

import { useState, useEffect, useCallback } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { IncidenceWithDetails } from '@/types'
import { createSubTask, toggleSubTask, deleteSubTask, updateIncidence, updateSubTaskTitle, getIncidence } from '@/app/actions/incidence-actions'
import { Trash2, Loader2, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
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
    const [taskInputErrors, setTaskInputErrors] = useState<Record<number, boolean>>({})
    const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
    const [tasksToToggle, setTasksToToggle] = useState<Set<number>>(new Set())
    const [tasksToDelete, setTasksToDelete] = useState<Set<number>>(new Set())
    const [taskEdits, setTaskEdits] = useState<Record<number, string>>({})
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingDraftTaskId, setEditingDraftTaskId] = useState<string | null>(null)
    const [draftTaskEdits, setDraftTaskEdits] = useState<Record<string, string>>({})
    const [assigningUser, setAssigningUser] = useState<number | null>(null)
    const [expandedAssignees, setExpandedAssignees] = useState<Set<number>>(new Set(incidence.assignments.map(a => a.userId)))
    const [assigneeHours, setAssigneeHours] = useState<Record<number, string>>(
        Object.fromEntries(incidence.assignments.map(a => [a.userId, a.assignedHours?.toString() || '']))
    )

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

    const toggleAssigneeExpanded = (userId: number) => {
        setExpandedAssignees(prev => {
            const next = new Set(prev)
            if (next.has(userId)) {
                next.delete(userId)
            } else {
                next.add(userId)
            }
            return next
        })
    }

    const handleAddTask = (assignmentId: number, title: string, userId: number) => {
        if (!title.trim() || title.trim().length < 3) {
            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
            return
        }

        const tempId = `${assignmentId}-${Date.now()}`
        setDraftTasks(prev => [...prev, { tempId, title: title.trim(), assignmentId, isCompleted: false }])
        setNewTaskInputs(prev => ({ ...prev, [userId]: '' }))
        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))

        setTimeout(() => {
            const input = document.querySelector(`[data-assignment-id="${userId}"]`) as HTMLInputElement
            if (input) input.focus()
        }, 0)
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

    const handleStartEditTask = (taskId: number, currentTitle: string) => {
        setEditingTaskId(taskId)
        setTaskEdits(prev => ({ ...prev, [taskId]: currentTitle }))
    }

    const handleSaveEditTask = (taskId: number) => {
        const newTitle = taskEdits[taskId]
        if (!newTitle?.trim() || newTitle.trim().length < 3) {
            setEditingTaskId(null)
            setTaskEdits(prev => {
                const next = { ...prev }
                delete next[taskId]
                return next
            })
            return
        }
        setTaskEdits(prev => ({ ...prev, [taskId]: newTitle.trim() }))
        setEditingTaskId(null)
    }

    const handleCancelEditTask = (taskId: number) => {
        setEditingTaskId(null)
        setTaskEdits(prev => {
            const next = { ...prev }
            delete next[taskId]
            return next
        })
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

    const handleUpdateAssigneeHours = (userId: number, hours: string) => {
        setAssigneeHours(prev => ({ ...prev, [userId]: hours }))
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
                setExpandedAssignees(prev => new Set(prev).add(userId))
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
                setExpandedAssignees(prev => {
                    const next = new Set(prev)
                    next.delete(userId)
                    return next
                })
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

            for (const taskId of Object.keys(taskEdits)) {
                await updateSubTaskTitle(Number(taskId), taskEdits[Number(taskId)])
            }
            setTaskEdits({})

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

            if (isAdmin) {
                const hoursChanged = Object.entries(assigneeHours).some(([userId, hours]) => {
                    const assignment = incidence.assignments.find(a => a.userId === Number(userId))
                    const originalHours = assignment?.assignedHours?.toString() || ''
                    return hours !== originalHours
                })

                if (hoursChanged) {
                    const assigneeData = incidence.assignments.map(a => ({
                        userId: a.userId,
                        assignedHours: assigneeHours[a.userId] === '' ? null : parseInt(assigneeHours[a.userId] || '0') || a.assignedHours
                    }))

                    const result = await updateIncidence(incidence.id, { assignees: assigneeData })
                    if (result.success && result.data) {
                        onIncidenceUpdate(result.data)
                    }
                }
            }

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
    }, [draftTasks, tasksToToggle, tasksToDelete, taskEdits, assigneeHours, incidence, isAdmin, onIncidenceUpdate])

    const hasChanges = draftTasks.length > 0 || tasksToToggle.size > 0 || tasksToDelete.size > 0 || Object.keys(taskEdits).length > 0

    useEffect(() => {
        onHasChangesChange?.(hasChanges)
    }, [hasChanges, onHasChangesChange])

    useEffect(() => {
        onSaveRef?.(handleSaveChanges)
    }, [onSaveRef, handleSaveChanges])

    return (
        <div className="space-y-0">
            {sortedAssignedUsers.map((assignment) => {
                const allUserTasks = assignment.tasks.filter(t => !tasksToDelete.has(t.id))
                const pendingTasks = allUserTasks.filter(t => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? t.isCompleted : !t.isCompleted
                })
                const completedTasks = allUserTasks.filter(t => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? !t.isCompleted : t.isCompleted
                })
                const userDraftTasks = draftTasks.filter(d => d.assignmentId === assignment.id)
                const pendingDrafts = userDraftTasks.filter(d => !d.isCompleted)
                const completedDrafts = userDraftTasks.filter(d => d.isCompleted)

                const canEditTasks = isAdmin || assignment.userId === currentUserId
                const totalPending = pendingTasks.length + pendingDrafts.length
                const totalCompleted = completedTasks.length + completedDrafts.length
                const total = totalPending + totalCompleted
                const isExpanded = expandedAssignees.has(assignment.userId)
                const hasAnyTasks = allUserTasks.length > 0 || userDraftTasks.length > 0

                return (
                    <div key={assignment.id} className="border-b border-border last:border-b-0">
                        <div
                            className={`flex items-center gap-3 px-3 py-2 ${isExpanded ? 'cursor-pointer hover:bg-accent/30' : 'cursor-pointer hover:bg-accent/30'}`}
                            onClick={() => toggleAssigneeExpanded(assignment.userId)}
                        >
                            <Checkbox
                                checked={true}
                                onCheckedChange={() => {
                                    if (!hasAnyTasks) {
                                        handleRemoveAssignee(assignment.userId)
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={hasAnyTasks || assigningUser === assignment.userId}
                                className="border-input"
                            />
                            <span className="text-card-foreground/80 text-sm">
                                {assignment.user.name || assignment.user.username}
                            </span>
                            {(hasAnyTasks) && (
                                <span className="text-muted-foreground/70 text-xs">
                                    {totalPending}/{total} pendientes
                                </span>
                            )}
                            <div className="flex-1" />
                            <div className={`flex items-center gap-2 ${!isAdmin ? 'opacity-60' : ''}`}>
                                <span className="text-muted-foreground/70 text-xs">Horas Asignadas:</span>
                                <Input
                                    type="number"
                                    min="0"
                                    max="9999"
                                    step="1"
                                    value={assigneeHours[assignment.userId] || ''}
                                    disabled={!isAdmin}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0)) {
                                            handleUpdateAssigneeHours(assignment.userId, value)
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-background border-border text-zinc-100 w-20 h-6 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="0"
                                />
                            </div>
                            {isExpanded ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleAssigneeExpanded(assignment.userId)
                                    }}
                                    className="h-6 w-6 text-muted-foreground/70"
                                >
                                    <ChevronUp className="h-3 w-3" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleAssigneeExpanded(assignment.userId)
                                    }}
                                    className="h-6 w-6 text-muted-foreground/70"
                                >
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        {isExpanded && (
                            <div className="px-8 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                {pendingTasks.map(task => {
                                    const isToggled = tasksToToggle.has(task.id)
                                    const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                    return (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-2 px-2 py-1 bg-accent/30 rounded group"
                                        >
                                            <Checkbox
                                                checked={displayCompleted}
                                                onCheckedChange={() => handleToggleTask(task.id)}
                                                disabled={!canEditTasks}
                                                className="border-input"
                                            />
                                            {editingTaskId === task.id ? (
                                                <Input
                                                    value={taskEdits[task.id] || ''}
                                                    onChange={(e) => setTaskEdits(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEditTask(task.id)
                                                        if (e.key === 'Escape') handleCancelEditTask(task.id)
                                                    }}
                                                    onBlur={() => handleSaveEditTask(task.id)}
                                                    className="flex-1 bg-input border-border text-zinc-100 h-6 text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-sm text-card-foreground/80 flex-1">
                                                    {taskEdits[task.id] || task.title}
                                                </span>
                                            )}
                                            {canEditTasks && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleStartEditTask(task.id, task.title)}
                                                        className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="h-5 w-5 text-muted-foreground/70 hover:text-red-400"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {pendingDrafts.map(draft => (
                                    <div
                                        key={draft.tempId}
                                        className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group"
                                    >
                                        <Checkbox
                                            checked={draft.isCompleted}
                                            onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
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
                                                className="flex-1 bg-input border-border text-zinc-100 h-6 text-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={`text-sm text-card-foreground/80 flex-1 ${draft.isCompleted ? 'line-through text-muted-foreground/70' : ''}`}>
                                                {draftTaskEdits[draft.tempId] || draft.title}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleStartEditDraftTask(draft.tempId, draft.title)}
                                                className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveDraftTask(draft.tempId)}
                                                className="h-5 w-5 text-muted-foreground/70 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {canEditTasks && (
                                    <Input
                                        data-assignment-id={assignment.userId}
                                        value={newTaskInputs[assignment.userId] || ''}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setNewTaskInputs(prev => ({ ...prev, [assignment.userId]: value }))
                                            if (value.length >= 3) {
                                                setTaskInputErrors(prev => ({ ...prev, [assignment.id]: false }))
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const value = newTaskInputs[assignment.userId] || ''
                                                if (value.length >= 3) {
                                                    handleAddTask(assignment.id, value, assignment.userId)
                                                } else {
                                                    setTaskInputErrors(prev => ({ ...prev, [assignment.id]: true }))
                                                }
                                            }
                                        }}
                                        className={`bg-background text-zinc-100 text-sm w-full ${taskInputErrors[assignment.id] ? 'border-red-500' : 'border-border'}`}
                                        placeholder={`Nueva tarea para ${assignment.user.name || assignment.user.username}...`}
                                    />
                                )}

                                {completedTasks.length > 0 && (
                                    <div className="pt-2 space-y-1">
                                        {completedTasks.map(task => {
                                            const isToggled = tasksToToggle.has(task.id)
                                            const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-2 px-2 py-1 rounded group opacity-60"
                                                >
                                                    <Checkbox
                                                        checked={displayCompleted}
                                                        onCheckedChange={() => handleToggleTask(task.id)}
                                                        disabled={!canEditTasks}
                                                        className="border-input"
                                                    />
                                                    <span className="text-sm line-through text-muted-foreground/70 flex-1">
                                                        {taskEdits[task.id] || task.title}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {completedDrafts.length > 0 && (
                                    <div className="space-y-1">
                                        {completedDrafts.map(draft => (
                                            <div
                                                key={draft.tempId}
                                                className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group opacity-60"
                                            >
                                                <Checkbox
                                                    checked={draft.isCompleted}
                                                    onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
                                                    className="border-input"
                                                />
                                                <span className="text-sm line-through text-muted-foreground/70 flex-1">
                                                    {draftTaskEdits[draft.tempId] || draft.title}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveDraftTask(draft.tempId)}
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
                    </div>
                )
            })}

            {isAdmin && unassignedUsers.length > 0 && (
                <>
                    {sortedAssignedUsers.length > 0 && (
                        <div className="h-px bg-border" />
                    )}
                    <div className="space-y-0">
                        <div className="px-3 py-2">
                            <Label className="text-muted-foreground/70 text-xs">Colaboradores Disponibles</Label>
                        </div>
                        {unassignedUsers.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-accent/20 cursor-pointer"
                                onClick={() => handleAssignUser(user.id)}
                            >
                                <Checkbox
                                    checked={false}
                                    onCheckedChange={() => handleAssignUser(user.id)}
                                    disabled={assigningUser === user.id}
                                    className="border-input"
                                />
                                <span className="text-card-foreground/60 text-sm">{user.name || user.username}</span>
                                <div className="flex-1" />
                                {assigningUser === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className="text-xs text-muted-foreground/50">Click para asignar</span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
