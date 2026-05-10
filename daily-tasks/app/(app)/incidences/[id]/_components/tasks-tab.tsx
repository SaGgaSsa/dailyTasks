'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IncidenceWithDetails } from '@/types'
import { saveIncidenceTaskChanges } from '@/app/actions/incidence-actions'
import { ChevronUp, ChevronDown, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { TaskListSection } from '@/components/board/task-list-section'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
    const [tasksToPinToggle, setTasksToPinToggle] = useState<Set<number>>(new Set())
    const [pinnedDraftIds, setPinnedDraftIds] = useState<Set<string>>(new Set())
    const [taskReassignments, setTaskReassignments] = useState<Record<number, number>>({})
    const [reassignPopoverUserId, setReassignPopoverUserId] = useState<number | null>(null)

    const assignableUsers = useMemo(
        () => allUsers.filter((user) => user.role === 'ADMIN' || user.role === 'DEV'),
        [allUsers]
    )
    const isTaskAssignableRole = (role: string) => role === 'ADMIN' || role === 'DEV'
    const assignedUserIds = useMemo(() => new Set(incidence.assignments.map(a => a.userId)), [incidence.assignments])
    const activePersistedUserIds = useMemo(
        () => new Set(incidence.assignments.filter(a => !draftRemovedAssignees.has(a.userId)).map(a => a.userId)),
        [incidence.assignments, draftRemovedAssignees]
    )
    const taskOriginUserIds = useMemo(() => Object.fromEntries(
        incidence.assignments.flatMap((assignment) =>
            assignment.tasks.map((task) => [task.id, assignment.userId])
        )
    ), [incidence.assignments])
    const allExistingTasks = useMemo(() => incidence.assignments.flatMap((assignment) =>
        assignment.tasks.map((task) => ({
            ...task,
            effectiveUserId: taskReassignments[task.id] ?? assignment.userId,
        }))
    ), [incidence.assignments, taskReassignments])

    const sortedAssignedUsers = [...incidence.assignments]
        .filter(a => !draftRemovedAssignees.has(a.userId) && isTaskAssignableRole(a.user.role))
        .sort((a, b) => {
            if (a.user.role === 'DEV' && b.user.role !== 'DEV') return -1
            if (a.user.role !== 'DEV' && b.user.role === 'DEV') return 1
            return (a.user.name || a.user.username).localeCompare(b.user.name || b.user.username)
        })

    const newAssignees = assignableUsers.filter(u => draftAssignees.has(u.id) && !activePersistedUserIds.has(u.id))

    const unassignedUsers = assignableUsers
        .filter(u =>
            !activePersistedUserIds.has(u.id) &&
            !newAssignees.some(assignee => assignee.id === u.id)
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
        setPinnedDraftIds(prev => {
            const next = new Set(prev)
            next.delete(tempId)
            return next
        })
    }

    const handleToggleDraftTask = (tempId: string) => {
        setDraftTasks(prev => prev.map(t =>
            t.tempId === tempId ? { ...t, isCompleted: !t.isCompleted } : t
        ))
        // Auto-unpin when completing a draft
        const draft = draftTasks.find(t => t.tempId === tempId)
        if (draft && !draft.isCompleted) {
            setPinnedDraftIds(prev => {
                const next = new Set(prev)
                next.delete(tempId)
                return next
            })
        }
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
        // Auto-unpin when completing a task
        const task = incidence.assignments.flatMap(a => a.tasks).find(t => t.id === taskId)
        if (task) {
            const willBeCompleted = !tasksToToggle.has(taskId) ? !task.isCompleted : task.isCompleted
            if (willBeCompleted) {
                setTasksToPinToggle(prev => {
                    const next = new Set(prev)
                    // Ensure pinned state is off for completed tasks
                    if (task.isPinned && !next.has(taskId)) {
                        next.add(taskId) // toggle off
                    } else if (!task.isPinned && next.has(taskId)) {
                        next.delete(taskId) // was toggled on, remove
                    }
                    return next
                })
            }
        }
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

    const handleTogglePin = (taskId: number) => {
        setTasksToPinToggle(prev => {
            const next = new Set(prev)
            if (next.has(taskId)) {
                next.delete(taskId)
            } else {
                next.add(taskId)
            }
            return next
        })
    }

    const handleToggleDraftPin = (tempId: string) => {
        setPinnedDraftIds(prev => {
            const next = new Set(prev)
            if (next.has(tempId)) {
                next.delete(tempId)
            } else {
                next.add(tempId)
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

    const handleToggleVisibleAssignee = (userId: number, isNewAssignee: boolean, hasAnyTasks: boolean) => {
        if (hasAnyTasks) return

        if (isNewAssignee) {
            handleToggleDraftAssignee(userId)
            return
        }

        handleToggleRemoveAssignee(userId)
    }

    const getEffectiveCompleted = (task: { id: number; isCompleted: boolean }) => {
        return tasksToToggle.has(task.id) ? !task.isCompleted : task.isCompleted
    }

    const getVisibleTasksForUser = (userId: number) => {
        return allExistingTasks.filter((task) => task.effectiveUserId === userId && !tasksToDelete.has(task.id))
    }

    const hasVisibleTasksForUser = (userId: number, nextReassignments: Record<number, number>, nextDraftTasks: DraftTask[]) => {
        const existingTasks = incidence.assignments
            .flatMap((assignment) => assignment.tasks.map((task) => ({
                ...task,
                effectiveUserId: nextReassignments[task.id] ?? assignment.userId,
            })))
            .some((task) => task.effectiveUserId === userId && !tasksToDelete.has(task.id))

        return existingTasks || nextDraftTasks.some((draft) => draft.userId === userId)
    }

    const handleReassignPendingTasks = (sourceUserId: number, targetUserId: number) => {
        if (sourceUserId === targetUserId) return

        const visiblePendingTaskIds = allExistingTasks
            .filter((task) => task.effectiveUserId === sourceUserId && !tasksToDelete.has(task.id) && !getEffectiveCompleted(task))
            .map((task) => task.id)

        const nextReassignments = { ...taskReassignments }
        for (const taskId of visiblePendingTaskIds) {
            const originUserId = taskOriginUserIds[taskId]
            if (originUserId === targetUserId) {
                delete nextReassignments[taskId]
            } else {
                nextReassignments[taskId] = targetUserId
            }
        }

        const nextDraftTasks = draftTasks.map((draft) =>
            draft.userId === sourceUserId && !draft.isCompleted
                ? { ...draft, userId: targetUserId, assignmentId: assignedUserIds.has(targetUserId) ? draft.assignmentId : -targetUserId }
                : draft
        )

        setTaskReassignments(nextReassignments)
        setDraftTasks(nextDraftTasks)
        setReassignPopoverUserId(null)
        setExpandedAssignees(prev => new Set(prev).add(targetUserId))
        const sourceHasVisibleTasks = hasVisibleTasksForUser(sourceUserId, nextReassignments, nextDraftTasks)
        setDraftRemovedAssignees(prev => {
            const next = new Set(prev)
            next.delete(targetUserId)
            if (!sourceHasVisibleTasks && assignedUserIds.has(sourceUserId)) {
                next.add(sourceUserId)
            }
            return next
        })
        setDraftAssignees(prev => {
            const next = new Set(prev)
            if (!assignedUserIds.has(targetUserId)) {
                next.add(targetUserId)
            } else {
                next.delete(targetUserId)
            }

            if (!sourceHasVisibleTasks && !assignedUserIds.has(sourceUserId)) {
                next.delete(sourceUserId)
            }

            return next
        })
    }

    const getEffectivePinned = (task: { id: number; isPinned: boolean }) => {
        const toggled = tasksToPinToggle.has(task.id)
        return toggled ? !task.isPinned : task.isPinned
    }

    const getEffectivePinnedIds = (tasks: { id: number; isPinned: boolean }[]): Set<number> => {
        const ids = new Set<number>()
        for (const task of tasks) {
            if (getEffectivePinned(task)) {
                ids.add(task.id)
            }
        }
        return ids
    }

    const handleSaveChanges = useCallback(async () => {
        try {
            const updatedTasks = incidence.assignments
                .flatMap((assignment) => assignment.tasks)
                .filter((task) => !tasksToDelete.has(task.id))
                .map((task) => {
                    const nextTitle = taskEdits[task.id] ?? task.title
                    const nextIsCompleted = tasksToToggle.has(task.id) ? !task.isCompleted : task.isCompleted
                    const pinToggled = tasksToPinToggle.has(task.id)
                    const nextIsPinned = pinToggled ? !task.isPinned : task.isPinned
                    const finalIsPinned = nextIsCompleted ? false : nextIsPinned

                    if (nextTitle === task.title && nextIsCompleted === task.isCompleted && finalIsPinned === task.isPinned) {
                        return null
                    }

                    return {
                        taskId: task.id,
                        title: nextTitle,
                        isCompleted: nextIsCompleted,
                        isPinned: finalIsPinned,
                    }
                })
                .filter((task): task is NonNullable<typeof task> => task !== null)

            const activePersistedAssignees = incidence.assignments
                .filter(a => !draftRemovedAssignees.has(a.userId))
                .map(a => ({
                    userId: a.userId,
                    assignedHours: assigneeHours[a.userId] === '' ? null : (parseInt(assigneeHours[a.userId]) || a.assignedHours)
                }))
            const activePersistedPayloadUserIds = new Set(activePersistedAssignees.map(assignee => assignee.userId))
            const assigneeData = [
                ...activePersistedAssignees,
                ...[...draftAssignees]
                    .filter(userId => !activePersistedPayloadUserIds.has(userId))
                    .map(userId => ({
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
            const reassignedTasks = Object.entries(taskReassignments)
                .map(([taskId, targetUserId]) => ({ taskId: Number(taskId), targetUserId }))
                .filter(({ taskId, targetUserId }) => !tasksToDelete.has(taskId) && taskOriginUserIds[taskId] !== targetUserId)

            const result = await saveIncidenceTaskChanges({
                incidenceId: incidence.id,
                assignees: hasAssigneeChanges ? assigneeData : undefined,
                createdTasks: draftTasks.map((draft) => ({
                    userId: draft.userId,
                    title: draft.title,
                    isCompleted: draft.isCompleted,
                    isPinned: draft.isCompleted ? false : pinnedDraftIds.has(draft.tempId),
                })),
                updatedTasks,
                deletedTaskIds: [...tasksToDelete],
                reassignedTasks: reassignedTasks.length > 0 ? reassignedTasks : undefined,
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
            setTasksToPinToggle(new Set())
            setPinnedDraftIds(new Set())
            setTaskReassignments({})
            setReassignPopoverUserId(null)

            if (result.autoTransitionedToReview) {
                toast.success('Todas las tareas completadas. Incidencia en revision.')
            } else {
                toast.success(`${incidence.externalWorkItem.type} ${incidence.externalWorkItem.externalId} actualizada`)
            }
        } catch (error) {
            console.error('Error saving changes:', error)
            toast.error('Error al guardar cambios')
            throw error
        }
    }, [draftTasks, tasksToToggle, tasksToDelete, taskEdits, tasksToPinToggle, pinnedDraftIds, assigneeHours, draftAssignees, draftRemovedAssignees, taskReassignments, taskOriginUserIds, incidence, onIncidenceUpdate])

    const hasChanges = draftTasks.length > 0
        || tasksToToggle.size > 0
        || tasksToDelete.size > 0
        || Object.keys(taskEdits).length > 0
        || tasksToPinToggle.size > 0
        || pinnedDraftIds.size > 0
        || Object.keys(taskReassignments).length > 0
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
                const isNewAssignee = assignment.id < 0
                const realUserId = assignment.userId
                const user = isNewAssignee ? (assignment as { user: typeof assignableUsers[0] }).user : assignment.user

                const allUserTasks = isNewAssignee
                    ? getVisibleTasksForUser(realUserId)
                    : getVisibleTasksForUser(realUserId)
                const pendingTasks = allUserTasks.filter(t => {
                    return !getEffectiveCompleted(t)
                })
                const completedTasks = allUserTasks.filter(t => {
                    return getEffectiveCompleted(t)
                })
                const userDraftTasks = draftTasks.filter(d => d.userId === realUserId)
                const pendingDrafts = userDraftTasks.filter(d => !d.isCompleted)
                const completedDrafts = userDraftTasks.filter(d => d.isCompleted)

                const canEditTasks = isAdmin || assignment.userId === currentUserId || isNewAssignee
                const totalPending = pendingTasks.length + pendingDrafts.length
                const totalCompleted = completedTasks.length + completedDrafts.length
                const total = totalPending + totalCompleted
                const isExpanded = expandedAssignees.has(realUserId)
                const hasAnyTasks = allUserTasks.length > 0 || userDraftTasks.length > 0
                const reassignTargets = assignableUsers
                    .filter((candidate) => candidate.id !== realUserId)
                    .sort((a, b) => {
                        if (a.role === 'DEV' && b.role !== 'DEV') return -1
                        if (a.role !== 'DEV' && b.role === 'DEV') return 1
                        return (a.name || a.username).localeCompare(b.name || b.username)
                    })

                return (
                    <div key={assignment.id} className="border-b border-border last:border-b-0">
                        <div
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/30"
                            onClick={() => toggleAssigneeExpanded(realUserId)}
                        >
                            <Checkbox
                                checked={isNewAssignee || !draftRemovedAssignees.has(realUserId)}
                                onCheckedChange={() => {
                                    handleToggleVisibleAssignee(realUserId, isNewAssignee, hasAnyTasks)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={hasAnyTasks}
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
                            {isAdmin && totalPending > 0 && (
                                <Popover
                                    open={reassignPopoverUserId === realUserId}
                                    onOpenChange={(open) => setReassignPopoverUserId(open ? realUserId : null)}
                                >
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="h-6 w-6 text-muted-foreground/70 hover:text-card-foreground/80"
                                                        aria-label="Reasignar pendientes"
                                                    >
                                                        <Shuffle className="h-3 w-3" />
                                                    </Button>
                                                </PopoverTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>Reasignar pendientes</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <PopoverContent align="end" className="w-56 p-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                            Reasignar a
                                        </div>
                                        <div className="space-y-1">
                                            {reassignTargets.map((target) => (
                                                <button
                                                    key={target.id}
                                                    type="button"
                                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                                                    onClick={() => handleReassignPendingTasks(realUserId, target.id)}
                                                >
                                                    <span className="truncate">{target.name || target.username}</span>
                                                    <span className="ml-2 text-xs text-muted-foreground">{target.role}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
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
                                <TaskListSection
                                    pendingTasks={pendingTasks}
                                    completedTasks={completedTasks}
                                    pendingDrafts={pendingDrafts}
                                    completedDrafts={completedDrafts}
                                    pinnedTaskIds={getEffectivePinnedIds(pendingTasks)}
                                    pinnedDraftIds={pinnedDraftIds}
                                    tasksToToggle={tasksToToggle}
                                    taskEdits={taskEdits}
                                    editingTaskId={editingTaskId}
                                    editingDraftTaskId={editingDraftTaskId}
                                    draftTaskEdits={draftTaskEdits}
                                    incidenceId={incidence.id}
                                    canEditTasks={canEditTasks}
                                    newTaskValue={newTaskInputs[realUserId] || ''}
                                    taskInputError={taskInputErrors[assignment.id] || false}
                                    assignmentId={assignment.id}
                                    userId={realUserId}
                                    onToggleTask={handleToggleTask}
                                    onDeleteTask={handleDeleteTask}
                                    onStartEditTask={handleStartEditTask}
                                    onSaveEditTask={handleSaveEditTask}
                                    onCancelEditTask={handleCancelEditTask}
                                    onEditChange={(taskId, value) => setTaskEdits(prev => ({ ...prev, [taskId]: value }))}
                                    onTogglePin={handleTogglePin}
                                    onToggleDraftPin={handleToggleDraftPin}
                                    onToggleDraftTask={handleToggleDraftTask}
                                    onRemoveDraftTask={handleRemoveDraftTask}
                                    onStartEditDraftTask={handleStartEditDraftTask}
                                    onSaveEditDraftTask={handleSaveEditDraftTask}
                                    onCancelEditDraftTask={handleCancelEditDraftTask}
                                    onDraftEditChange={(tempId, value) => setDraftTaskEdits(prev => ({ ...prev, [tempId]: value }))}
                                    onNewTaskChange={(value) => {
                                        setNewTaskInputs(prev => ({ ...prev, [realUserId]: value }))
                                        if (value.length >= 3) {
                                            setTaskInputErrors(prev => ({ ...prev, [assignment.id]: false }))
                                        }
                                    }}
                                    onNewTaskSubmit={() => {
                                        const value = newTaskInputs[realUserId] || ''
                                        if (value.length >= 3) {
                                            handleAddTask(assignment.id, realUserId, value)
                                        } else {
                                            setTaskInputErrors(prev => ({ ...prev, [assignment.id]: true }))
                                        }
                                    }}
                                    onNavigateWithUnsavedChanges={onNavigateWithUnsavedChanges}
                                />
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
