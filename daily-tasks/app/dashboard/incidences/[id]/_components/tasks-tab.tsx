'use client'

import { useState, useEffect, useCallback } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IncidenceWithDetails } from '@/types'
import { saveIncidenceTaskChanges } from '@/app/actions/incidence-actions'
import { Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { TaskItemRow } from '@/components/board/task-item-row'
import { IncidencePageType } from '@prisma/client'

interface TasksTabProps {
    incidence: IncidenceWithDetails
    allUsers: { id: number; name: string | null; username: string; role: string }[]
    currentUserId: number
    isAdmin: boolean
    onIncidenceUpdate: (incidence: IncidenceWithDetails) => void
    onHasChangesChange?: (hasChanges: boolean) => void
    onSaveRef?: (saveFn: () => Promise<void>) => void
    onNavigateWithUnsavedChanges?: (url: string) => void
}

interface DraftTask {
    tempId: string
    title: string
    assignmentId: number
    userId: number
    isCompleted: boolean
}

export function TasksTab({ incidence, allUsers, currentUserId, isAdmin, onIncidenceUpdate, onHasChangesChange, onSaveRef, onNavigateWithUnsavedChanges }: TasksTabProps) {
    const [newTaskInputs, setNewTaskInputs] = useState<Record<number, string>>({})
    const [taskInputErrors, setTaskInputErrors] = useState<Record<number, boolean>>({})
    const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
    const [tasksToToggle, setTasksToToggle] = useState<Set<number>>(new Set())
    const [tasksToDelete, setTasksToDelete] = useState<Set<number>>(new Set())
    const [taskEdits, setTaskEdits] = useState<Record<number, string>>({})
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingDraftTaskId, setEditingDraftTaskId] = useState<string | null>(null)
    const [draftTaskEdits, setDraftTaskEdits] = useState<Record<string, string>>({})
    const [expandedAssignees, setExpandedAssignees] = useState<Set<number>>(new Set(incidence.assignments.map(a => a.userId)))
    const [assigneeHours, setAssigneeHours] = useState<Record<number, string>>(
        Object.fromEntries(incidence.assignments.map(a => [a.userId, a.assignedHours?.toString() || '']))
    )
    const [draftAssignees, setDraftAssignees] = useState<Set<number>>(new Set())
    const [draftRemovedAssignees, setDraftRemovedAssignees] = useState<Set<number>>(new Set())

    const assignedUserIds = new Set(incidence.assignments.map(a => a.userId))
    const scriptPage = incidence.pages.find((page) => page.pageType === IncidencePageType.SYSTEM_SCRIPTS) ?? null

    const sortedAssignedUsers = [...incidence.assignments]
        .filter(a => !draftRemovedAssignees.has(a.userId))
        .sort((a, b) => {
            if (a.user.role === 'DEV' && b.user.role !== 'DEV') return -1
            if (a.user.role !== 'DEV' && b.user.role === 'DEV') return 1
            return (a.user.name || a.user.username).localeCompare(b.user.name || b.user.username)
        })

    const newAssignees = allUsers.filter(u => draftAssignees.has(u.id))

    const unassignedUsers = allUsers
        .filter(u => 
            (!assignedUserIds.has(u.id) || draftRemovedAssignees.has(u.id)) && 
            !draftAssignees.has(u.id)
        )
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

    const handleAddTask = (assignmentId: number, userId: number, title: string) => {
        if (!title.trim() || title.trim().length < 3) {
            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
            return
        }

        const tempId = `${assignmentId}-${Date.now()}`
        setDraftTasks(prev => [...prev, { tempId, title: title.trim(), assignmentId, userId, isCompleted: false }])
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

    const handleToggleDraftAssignee = (userId: number) => {
        setDraftAssignees(prev => {
            const next = new Set(prev)
            if (next.has(userId)) {
                next.delete(userId)
                setAssigneeHours(h => {
                    const updated = { ...h }
                    delete updated[userId]
                    return updated
                })
            } else {
                next.add(userId)
            }
            return next
        })
        setExpandedAssignees(prev => new Set(prev).add(userId))
    }

    const handleToggleRemoveAssignee = (userId: number) => {
        setDraftRemovedAssignees(prev => {
            const next = new Set(prev)
            if (next.has(userId)) {
                next.delete(userId)
            } else {
                next.add(userId)
            }
            return next
        })
    }

    const handleSaveChanges = useCallback(async () => {
        try {
            const updatedTasks = incidence.assignments
                .flatMap((assignment) => assignment.tasks)
                .filter((task) => !tasksToDelete.has(task.id))
                .map((task) => {
                    const nextTitle = taskEdits[task.id] ?? task.title
                    const nextIsCompleted = tasksToToggle.has(task.id) ? !task.isCompleted : task.isCompleted

                    if (nextTitle === task.title && nextIsCompleted === task.isCompleted) {
                        return null
                    }

                    return {
                        taskId: task.id,
                        title: nextTitle,
                        isCompleted: nextIsCompleted,
                    }
                })
                .filter((task): task is NonNullable<typeof task> => task !== null)

            const assigneeData = [
                ...incidence.assignments
                    .filter(a => !draftRemovedAssignees.has(a.userId))
                    .map(a => ({
                        userId: a.userId,
                        assignedHours: assigneeHours[a.userId] === '' ? null : (parseInt(assigneeHours[a.userId]) || a.assignedHours)
                    })),
                ...[...draftAssignees].map(userId => ({
                    userId,
                    assignedHours: assigneeHours[userId] === '' ? null : parseInt(assigneeHours[userId]) || null
                }))
            ]

            const hasAssigneeChanges =
                draftAssignees.size > 0 ||
                draftRemovedAssignees.size > 0 ||
                Object.keys(assigneeHours).some(uid => {
                    const numUid = Number(uid)
                    const assignment = incidence.assignments.find(a => a.userId === numUid)
                    const originalHours = assignment?.assignedHours?.toString() || ''
                    return assigneeHours[numUid] !== originalHours
                })

            const result = await saveIncidenceTaskChanges({
                incidenceId: incidence.id,
                assignees: hasAssigneeChanges ? assigneeData : undefined,
                createdTasks: draftTasks.map((draft) => ({
                    userId: draft.userId,
                    title: draft.title,
                    isCompleted: draft.isCompleted,
                })),
                updatedTasks,
                deletedTaskIds: [...tasksToDelete],
            })

            if (!result.success) {
                throw new Error(result.error || 'Error al guardar cambios')
            }

            if (result.data) {
                onIncidenceUpdate(result.data)
            }

            setDraftAssignees(new Set())
            setDraftRemovedAssignees(new Set())
            setDraftTasks([])
            setTasksToToggle(new Set())
            setTasksToDelete(new Set())
            setTaskEdits({})

            if (result.autoTransitionedToReview) {
                toast.success('Todas las tareas completadas. Incidencia en revisión.')
            } else {
                toast.success(`${incidence.externalWorkItem.type} ${incidence.externalWorkItem.externalId} actualizada`)
            }
        } catch (error) {
            console.error('Error saving changes:', error)
            toast.error('Error al guardar cambios')
            throw error
        }
    }, [draftTasks, tasksToToggle, tasksToDelete, taskEdits, assigneeHours, draftAssignees, draftRemovedAssignees, incidence, onIncidenceUpdate])

    const hasChanges = draftTasks.length > 0 
        || tasksToToggle.size > 0 
        || tasksToDelete.size > 0 
        || Object.keys(taskEdits).length > 0
        || draftAssignees.size > 0
        || draftRemovedAssignees.size > 0
        || Object.keys(assigneeHours).some(uid => {
            const numUid = Number(uid)
            const assignment = incidence.assignments.find(a => a.userId === numUid)
            const originalHours = assignment?.assignedHours?.toString() || ''
            return assigneeHours[numUid] !== originalHours
        })

    useEffect(() => {
        onHasChangesChange?.(hasChanges)
    }, [hasChanges, onHasChangesChange])

    useEffect(() => {
        onSaveRef?.(handleSaveChanges)
    }, [onSaveRef, handleSaveChanges])

    return (
        <div className="space-y-0">
            {[...sortedAssignedUsers, ...newAssignees.map(user => {
                return {
                    id: -user.id,
                    userId: user.id,
                    user,
                    tasks: [],
                    assignedHours: assigneeHours[user.id] ? parseInt(assigneeHours[user.id]) : null
                }
            })].map((assignment) => {
                const isNewAssignee = assignment.userId < 0
                const realUserId = isNewAssignee ? -assignment.userId : assignment.userId
                const user = isNewAssignee ? (assignment as { user: typeof allUsers[0] }).user : assignment.user

                const allUserTasks = isNewAssignee 
                    ? [] 
                    : assignment.tasks.filter(t => !tasksToDelete.has(t.id))
                const pendingTasks = allUserTasks.filter(t => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? t.isCompleted : !t.isCompleted
                })
                const completedTasks = allUserTasks.filter(t => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? !t.isCompleted : t.isCompleted
                })
                const userDraftTasks = draftTasks.filter(d => d.userId === realUserId || d.assignmentId === assignment.id)
                const pendingDrafts = userDraftTasks.filter(d => !d.isCompleted)
                const completedDrafts = userDraftTasks.filter(d => d.isCompleted)

                const canEditTasks = isAdmin || assignment.userId === currentUserId || isNewAssignee
                const totalPending = pendingTasks.length + pendingDrafts.length
                const totalCompleted = completedTasks.length + completedDrafts.length
                const total = totalPending + totalCompleted
                const isExpanded = expandedAssignees.has(realUserId)
                const hasAnyTasks = allUserTasks.length > 0 || userDraftTasks.length > 0

                return (
                    <div key={assignment.id} className="border-b border-border last:border-b-0">
                        <div
                            className={`flex items-center gap-3 px-3 py-2 ${isExpanded ? 'cursor-pointer hover:bg-accent/30' : 'cursor-pointer hover:bg-accent/30'}`}
                            onClick={() => toggleAssigneeExpanded(realUserId)}
                        >
                            <Checkbox
                                checked={!draftRemovedAssignees.has(realUserId)}
                                onCheckedChange={() => {
                                    if (!hasAnyTasks && !isNewAssignee) {
                                        handleToggleRemoveAssignee(realUserId)
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={hasAnyTasks || isNewAssignee}
                                className="border-input"
                            />
                            <span className="text-card-foreground/80 text-sm">
                                {user.name || user.username}
                            </span>
                            {(hasAnyTasks || isNewAssignee) && (
                                <span className="text-muted-foreground/70 text-xs">
                                    {totalPending}/{total} pendientes
                                </span>
                            )}
                            <div className="flex-1" />
                            <div className={`flex items-center gap-2 ${!isAdmin ? 'opacity-60' : ''}`}>
                                <span className="text-muted-foreground/70 text-xs">Horas:</span>
                                <Input
                                    type="number"
                                    min="0"
                                    max="9999"
                                    step="1"
                                    value={assigneeHours[realUserId] || ''}
                                    disabled={!isAdmin}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0)) {
                                            handleUpdateAssigneeHours(realUserId, value)
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-background border-border text-foreground w-16 h-6 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        toggleAssigneeExpanded(realUserId)
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
                                        toggleAssigneeExpanded(realUserId)
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
                                        <TaskItemRow
                                            key={task.id}
                                            task={task}
                                            incidenceId={incidence.id}
                                            scriptPageId={scriptPage?.id ?? null}
                                            onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                                            checked={displayCompleted}
                                            isEditing={editingTaskId === task.id}
                                            editValue={taskEdits[task.id] || ''}
                                            onToggle={() => handleToggleTask(task.id)}
                                            onEditChange={(value) => setTaskEdits(prev => ({ ...prev, [task.id]: value }))}
                                            onEditKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEditTask(task.id)
                                                if (e.key === 'Escape') handleCancelEditTask(task.id)
                                            }}
                                            onEditBlur={() => handleSaveEditTask(task.id)}
                                            onStartEdit={() => handleStartEditTask(task.id, task.title)}
                                            onDelete={() => handleDeleteTask(task.id)}
                                            canToggle={canEditTasks}
                                            canEdit={canEditTasks}
                                            canDelete={canEditTasks}
                                        />
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
                                                className="flex-1 bg-input border-border text-foreground h-6 text-sm"
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
                                        data-assignment-id={realUserId}
                                        value={newTaskInputs[realUserId] || ''}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setNewTaskInputs(prev => ({ ...prev, [realUserId]: value }))
                                            if (value.length >= 3) {
                                                setTaskInputErrors(prev => ({ ...prev, [assignment.id]: false }))
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const value = newTaskInputs[realUserId] || ''
                                                if (value.length >= 3) {
                                                    handleAddTask(assignment.id, realUserId, value)
                                                } else {
                                                    setTaskInputErrors(prev => ({ ...prev, [assignment.id]: true }))
                                                }
                                            }
                                        }}
                                        className={`bg-background text-foreground text-sm w-full ${taskInputErrors[assignment.id] ? 'border-red-500' : 'border-border'}`}
                                        placeholder={`Nueva tarea para ${user.name || user.username}...`}
                                    />
                                )}

                                {completedTasks.length > 0 && (
                                    <div className="pt-2 space-y-1">
                                        {completedTasks.map(task => {
                                            const isToggled = tasksToToggle.has(task.id)
                                            const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted

                                            return (
                                                <TaskItemRow
                                                    key={task.id}
                                                    task={task}
                                                    incidenceId={incidence.id}
                                                    scriptPageId={scriptPage?.id ?? null}
                                                    onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                                                    checked={displayCompleted}
                                                    isEditing={false}
                                                    editValue={taskEdits[task.id] || task.title}
                                                    onToggle={() => handleToggleTask(task.id)}
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
                    {(sortedAssignedUsers.length > 0 || newAssignees.length > 0) && (
                        <div className="h-px bg-border" />
                    )}
                    <div className="space-y-0">
                        {unassignedUsers.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-accent/20 cursor-pointer"
                                onClick={() => handleToggleDraftAssignee(user.id)}
                            >
                                <Checkbox
                                    checked={draftAssignees.has(user.id)}
                                    onCheckedChange={() => handleToggleDraftAssignee(user.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="border-input"
                                />
                                <span className="text-card-foreground/60 text-sm">{user.name || user.username}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
