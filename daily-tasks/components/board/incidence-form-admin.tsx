'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSheet, FormInput, FormSelect, FormRow, FormRow3 } from '@/components/ui/form-sheet'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { IncidenceWithDetails, Task, ExternalWorkItemSummary } from '@/types'
import { TaskType, TaskStatus, Priority } from '@/types/enums'
import { PRIORITY_OPTIONS } from '@/lib/ticket-sort'
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from '@prisma/client'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { TaskListSection } from '@/components/board/task-list-section'

import { createIncidence, getIncidenceWithUsers, saveIncidenceTaskChanges } from '@/app/actions/incidence-actions'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { getCachedExternalWorkItems } from '@/app/actions/external-work-items'
import { User } from '@prisma/client'
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

const typeOptions = [
    { value: TaskType.I_MODAPL, label: 'I_MODAPL' },
    { value: TaskType.I_CASO, label: 'I_CASO' },
    { value: TaskType.I_CONS, label: 'I_CONS' },
]


interface AssigneeFormData {
    userId: number
    assignedHours: string
}

interface DraftTask {
    tempId: string
    title: string
    assignmentId: number
    userId: number
    isCompleted: boolean
}

interface FormData {
    type: TaskType
    externalId: string
    description: string
    comment: string
    priority: Priority
    technology: string
    estimatedTime: string
    assignees: AssigneeFormData[]
    tasks: { title: string; isCompleted: boolean }[]
}

export function IncidenceFormAdmin({ open, onOpenChange, initialData, type, externalId, onTaskUpdate, onIncidenceCreated, isDev = false, isKanban = false }: IncidenceFormProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const isEditMode = !!initialData?.id
    const isBacklog = !initialData || initialData.status === TaskStatus.BACKLOG
    
    const isAdmin = session?.user?.role === 'ADMIN'

    const [formData, setFormData] = useState<FormData>({
        type: TaskType.I_MODAPL,
        externalId: '',
        description: '',
        comment: '',
        priority: Priority.MEDIUM,
        technology: 'SISA',
        estimatedTime: '',
        assignees: [],
        tasks: [],
    })

    const [users, setUsers] = useState<User[]>([])
    const [techOptions, setTechOptions] = useState<{ value: string; label: string }[]>([])
    const [externalWorkItems, setExternalWorkItems] = useState<ExternalWorkItemSummary[]>([])
    const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [originalFormData, setOriginalFormData] = useState<FormData | null>(null)
    const [fullIncidenceData, setFullIncidenceData] = useState<IncidenceWithDetails | null>(null)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const [removedAssigneesHours, setRemovedAssigneesHours] = useState<Record<number, string>>({})
    const [newTaskInputs, setNewTaskInputs] = useState<Record<number, string>>({})
    const [taskInputErrors, setTaskInputErrors] = useState<Record<number, boolean>>({})
    const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
    const [showCompletedTasks, setShowCompletedTasks] = useState(false)
    const [showCompletedTasksByUser, setShowCompletedTasksByUser] = useState<Record<number, boolean>>({})
    const [expandedAssignees, setExpandedAssignees] = useState<Set<number>>(new Set())
    const [tasksToToggle, setTasksToToggle] = useState<Set<number>>(new Set())
    const [tasksToDelete, setTasksToDelete] = useState<Set<number>>(new Set())
    const [taskEdits, setTaskEdits] = useState<Record<number, string>>({})
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingDraftTaskId, setEditingDraftTaskId] = useState<string | null>(null)
    const [draftTaskEdits, setDraftTaskEdits] = useState<Record<string, string>>({})
    const [tasksToPinToggle, setTasksToPinToggle] = useState<Set<number>>(new Set())
    const [pinnedDraftIds, setPinnedDraftIds] = useState<Set<string>>(new Set())

    const hasHours = (fullIncidenceData?.estimatedTime ?? 0) > 0
    const hasAssignees = (fullIncidenceData?.assignments?.filter(a => a.isAssigned).length ?? 0) > 0
    const hasRequirements = isEditMode && hasHours && hasAssignees
    const hasTicketRelation = isEditMode && (fullIncidenceData?.qaTickets?.length ?? 0) > 0

    const sortUsers = (userList: User[], assignedUserIds: Set<number>) => {
        const sortByRoleAndName = (a: User, b: User) => {
            if (a.role === 'DEV' && b.role !== 'DEV') return -1
            if (a.role !== 'DEV' && b.role === 'DEV') return 1
            return a.username.localeCompare(b.username)
        }

        if (assignedUserIds.size === 0) {
            return [...userList].sort(sortByRoleAndName)
        }

        const assigned = userList.filter(u => assignedUserIds.has(u.id)).sort(sortByRoleAndName)
        const unassigned = userList.filter(u => !assignedUserIds.has(u.id)).sort(sortByRoleAndName)
        return [...assigned, ...unassigned]
    }

    useEffect(() => {
        const fetchData = async () => {
            if (open && techOptions.length === 0) {
                const result = await getCachedTechsWithModules()
                setTechOptions(result.techs.map(t => ({ value: t.name, label: t.name })))
            }
            if (open && externalWorkItems.length === 0) {
                const items = await getCachedExternalWorkItems()
                setExternalWorkItems(items)
            }
            if (open && initialData?.id && type && externalId) {
                setIsLoading(true)
                setFormData({
                    type: TaskType.I_MODAPL,
                    externalId: '',
                    description: '',
                    comment: '',
                    priority: Priority.MEDIUM,
                    technology: 'SISA',
                    estimatedTime: '',
                    assignees: [],
                    tasks: [],
                })
                setFullIncidenceData(null)
                setOriginalFormData(null)
                setNewTaskInputs({})
                setTaskInputErrors({})
                setRemovedAssigneesHours({})
                setDraftTasks([])
                setExpandedAssignees(new Set())
                setTasksToToggle(new Set())
                setTasksToDelete(new Set())
                setTaskEdits({})
                setEditingTaskId(null)
                setEditingDraftTaskId(null)
                setDraftTaskEdits({})
                setTasksToPinToggle(new Set())
                setPinnedDraftIds(new Set())
                setShowCompletedTasks(false)
                setShowCompletedTasksByUser({})

                try {
                    const { incidence, users } = await getIncidenceWithUsers(type, externalId)
                    
                    if (incidence) {
                        setFullIncidenceData(incidence)
                        const allAssignments = incidence.assignments
                        const activeAssignments = allAssignments.filter(a => a.isAssigned)
                        const data = {
                            type: (incidence.externalWorkItem?.type as TaskType) || TaskType.I_MODAPL,
                            externalId: incidence.externalWorkItem?.externalId?.toString() || '',
                            description: incidence.description || '',
                            comment: incidence.comment || '',
                            priority: incidence.priority,
                            technology: incidence.technology?.name || '',
                            estimatedTime: incidence.estimatedTime?.toString() || '',
                            assignees: activeAssignments.map(a => ({
                                userId: a.userId,
                                assignedHours: a.assignedHours?.toString() || ''
                            })),
                            tasks: allAssignments.flatMap(assignment => 
                                assignment.tasks.map(st => ({ title: st.title, isCompleted: st.isCompleted }))
                            ),
                        }
                        setFormData(data)
                        setOriginalFormData(data)
                        
                        // Sort users with assigned users first
                        const assignedUserIds = new Set<number>()
                        activeAssignments.forEach(a => assignedUserIds.add(a.userId))
                        const sortedUsers = sortUsers(users as User[], assignedUserIds)
                        setUsers(sortedUsers)
                    }
                } catch (error) {
                    toast.error('Error cargando incidencia')
                } finally {
                    setIsLoading(false)
                }
            } else if (open && !initialData) {
                // Creating new incidence - just load users
                setIsDescriptionManuallyEdited(false)
                setFormData({
                    type: TaskType.I_MODAPL,
                    externalId: '',
                    description: '',
                    comment: '',
                    priority: Priority.MEDIUM,
                    technology: 'SISA',
                    estimatedTime: '',
                    assignees: [],
                    tasks: [],
                })
                setOriginalFormData(null)
                setNewTaskInputs({})
                setTaskInputErrors({})
                setRemovedAssigneesHours({})
                setDraftTasks([])
                setExpandedAssignees(new Set())
                setTasksToToggle(new Set())
                setTasksToDelete(new Set())
                setShowCompletedTasks(false)
                setIsLoading(false)
                
                // Load users for new incidence form
                try {
                    const userList = await getIncidenceWithUsers(TaskType.I_MODAPL, 0)
                    const sortedUsers = sortUsers(userList.users as User[], new Set())
                    setUsers(sortedUsers)
                } catch (error) {
                    console.error('Error loading users:', error)
                }
            }
        }
        fetchData()
    }, [open, initialData, type, externalId])

    useEffect(() => {
        if (isEditMode && !isLoading && open) {
            setTimeout(() => {
                const currentUserId = Number(session?.user?.id)
                if (currentUserId) {
                    const input = document.querySelector(`[data-assignment-id="${currentUserId}"]`) as HTMLInputElement
                    if (input) {
                        input.focus()
                    }
                }
            }, 100)
        }
    }, [isEditMode, isLoading, open, session?.user?.id])

    useEffect(() => {
        if (isEditMode || isDescriptionManuallyEdited) return
        const externalIdNum = parseInt(formData.externalId)
        if (isNaN(externalIdNum)) return
        const match = externalWorkItems.find(
            item => item.type === formData.type && item.externalId === externalIdNum
        )
        if (match?.title) {
            updateFormData({ description: match.title })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.type, formData.externalId])

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }))
    }

    const handleCreateTask = async (assignmentId: number, userId: number, title: string) => {
        if (!title.trim() || title.trim().length < 3) {
            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
            return
        }
        
        const tempId = `${assignmentId}-${Date.now()}`
        setDraftTasks(prev => [...prev, { tempId, title, assignmentId, userId, isCompleted: false }])
        setNewTaskInputs(prev => ({ ...prev, [assignmentId]: '' }))
        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))
        
        setTimeout(() => {
            const input = document.querySelector(`[data-assignment-id="${assignmentId}"]`) as HTMLInputElement
            if (input) {
                input.focus()
            }
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
        const task = (fullIncidenceData?.assignments ?? []).flatMap(a => a.tasks).find(t => t.id === taskId)
        if (task) {
            const willBeCompleted = !tasksToToggle.has(taskId) ? !task.isCompleted : task.isCompleted
            if (willBeCompleted) {
                setTasksToPinToggle(prev => {
                    const next = new Set(prev)
                    if (task.isPinned && !next.has(taskId)) {
                        next.add(taskId)
                    } else if (!task.isPinned && next.has(taskId)) {
                        next.delete(taskId)
                    }
                    return next
                })
            }
        }
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

    const toggleShowCompletedForUser = (userId: number) => {
        setShowCompletedTasksByUser(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }))
    }

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

    const isAssigneeExpanded = (userId: number) => {
        if (isAdmin) return true
        return expandedAssignees.has(userId)
    }

    const handleToggleAssignee = (userId: number) => {
        const exists = formData.assignees.find(a => a.userId === userId)
        if (exists) {
            const hoursToSave = exists.assignedHours
            setRemovedAssigneesHours(prev => ({ ...prev, [userId]: hoursToSave }))
            updateFormData({
                assignees: formData.assignees.filter(a => a.userId !== userId)
            })
            setExpandedAssignees(prev => {
                const next = new Set(prev)
                next.delete(userId)
                return next
            })
        } else {
            const restoredHours = removedAssigneesHours[userId] ?? ''
            const previousAssignment = fullIncidenceData?.assignments?.find(a => a.userId === userId)
            const previousHours = previousAssignment?.assignedHours?.toString() ?? ''
            updateFormData({
                assignees: [...formData.assignees, { userId, assignedHours: restoredHours || previousHours }]
            })
            setExpandedAssignees(prev => new Set(prev).add(userId))
        }
    }

    const handleUpdateAssigneeHours = (userId: number, hours: string) => {
        updateFormData({
            assignees: formData.assignees.map(a => 
                a.userId === userId ? { ...a, assignedHours: hours } : a
            )
        })
    }

    const handleSave = async () => {
        const updatedTasks = (fullIncidenceData?.assignments ?? [])
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

        if (isDev) {
            if (!initialData?.id) {
                return false
            }
            
            const hasChanges =
                (originalFormData && formData.comment !== originalFormData.comment) ||
                draftTasks.length > 0 ||
                tasksToToggle.size > 0 ||
                tasksToDelete.size > 0 ||
                tasksToPinToggle.size > 0 ||
                pinnedDraftIds.size > 0
            
            if (!hasChanges) {
                return true
            }
            
            setIsSaving(true)
            try {
                const result = await saveIncidenceTaskChanges({
                    incidenceId: initialData.id,
                    createdTasks: draftTasks.map((draft) => ({
                        userId: draft.userId,
                        title: draft.title,
                        isCompleted: draft.isCompleted,
                        isPinned: draft.isCompleted ? false : pinnedDraftIds.has(draft.tempId),
                    })),
                    updatedTasks,
                    deletedTaskIds: [...tasksToDelete],
                    incidencePatch: originalFormData && formData.comment !== originalFormData.comment
                        ? { comment: formData.comment }
                        : undefined,
                })

                if (!result.success) {
                    toast.error(result.error || 'Error al guardar')
                    return false
                }

                if (result.data) {
                    setFullIncidenceData(result.data)
                    if (onTaskUpdate) {
                        onTaskUpdate(result.data)
                    }
                }

                setDraftTasks([])
                setTasksToToggle(new Set())
                setTasksToDelete(new Set())
                setTaskEdits({})
                setTasksToPinToggle(new Set())
                setPinnedDraftIds(new Set())

                if (result.autoTransitionedToReview) {
                    toast.success('🎉 ' + result.message)
                } else {
                    toast.success('Guardado correctamente')
                }
                return true
            } catch (error) {
                toast.error('Error inesperado')
                return false
            } finally {
                setIsSaving(false)
            }
        }

        if (!formData.type || !formData.externalId || !formData.description) {
            toast.error('Tipo, Numero y Descripcion son requeridos')
            return false
        }

        setIsSaving(true)
        try {
            const hoursValue = formData.estimatedTime ? parseInt(formData.estimatedTime) : 0

            const assigneeData = formData.assignees.map(a => ({
                userId: a.userId,
                assignedHours: a.assignedHours === '' ? null : parseInt(a.assignedHours)
            }))

            if (isEditMode && initialData?.id) {
                const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData) || draftTasks.length > 0 || tasksToToggle.size > 0 || tasksToDelete.size > 0 || Object.keys(taskEdits).length > 0 || tasksToPinToggle.size > 0 || pinnedDraftIds.size > 0
                if (!hasChanges) {
                    return true
                }

                const result = await saveIncidenceTaskChanges({
                    incidenceId: initialData.id,
                    assignees: assigneeData,
                    createdTasks: draftTasks.map((draft) => ({
                        userId: draft.userId,
                        title: draft.title,
                        isCompleted: draft.isCompleted,
                        isPinned: draft.isCompleted ? false : pinnedDraftIds.has(draft.tempId),
                    })),
                    updatedTasks,
                    deletedTaskIds: [...tasksToDelete],
                    incidencePatch: {
                        description: formData.description,
                        comment: formData.comment,
                        priority: formData.priority,
                        estimatedTime: hoursValue > 0 ? hoursValue : null,
                        technology: formData.technology,
                    },
                })

                if (result.success) {
                    toast.success(`${initialData.externalWorkItem?.type ?? ''} ${initialData.externalWorkItem?.externalId ?? ''} actualizada`)

                    if (result.data) {
                        setFullIncidenceData(result.data)
                        if (onTaskUpdate) {
                            onTaskUpdate(result.data)
                        }
                    }

                    setDraftTasks([])
                    setTasksToToggle(new Set())
                    setTasksToDelete(new Set())
                    setTaskEdits({})
                    setTasksToPinToggle(new Set())
                    setPinnedDraftIds(new Set())

                    if (result.autoTransitionedToReview) {
                        toast.success('🎉 ' + result.message)
                    }

                    return true
                } else {
                    toast.error(result.error || 'Error al actualizar')
                    return false
                }
            } else {
                const result = await createIncidence({
                    type: formData.type,
                    externalId: parseInt(formData.externalId),
                    description: formData.description,
                    comment: formData.comment,
                    priority: formData.priority,
                    tech: formData.technology,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assignees: assigneeData,
                })

                if (result.success) {
                    toast.success(`${formData.type} ${formData.externalId} creada`)
                    if (onIncidenceCreated) {
                        onIncidenceCreated()
                    }
                    return true
                } else {
                    toast.error(result.error || 'Error al crear')
                    return false
                }
            }
        } catch (error) {
            toast.error('Error inesperado')
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        setDraftTasks([])
        setExpandedAssignees(new Set())
        setTasksToToggle(new Set())
        setTasksToDelete(new Set())
        setNewTaskInputs({})
        setTaskInputErrors({})
        setRemovedAssigneesHours({})
        setTasksToPinToggle(new Set())
        setPinnedDraftIds(new Set())
        setShowCompletedTasks(false)
        onOpenChange(false)
    }

    const handleDiscard = () => {
        setShowDiscardConfirm(true)
    }

    const confirmDiscard = () => {
        setDraftTasks([])
        setExpandedAssignees(new Set())
        setTasksToToggle(new Set())
        setTasksToDelete(new Set())
        setTaskEdits({})
        setEditingTaskId(null)
        setNewTaskInputs({})
        setTaskInputErrors({})
        setRemovedAssigneesHours({})
        setTasksToPinToggle(new Set())
        setPinnedDraftIds(new Set())
        setShowCompletedTasks(false)
        setShowCompletedTasksByUser({})
        setShowDiscardConfirm(false)
        onOpenChange(false)
    }

    function hasFormChanges(): boolean {
        if (isEditMode && originalFormData) {
            return JSON.stringify(formData) !== JSON.stringify(originalFormData) ||
                   draftTasks.length > 0 ||
                   tasksToToggle.size > 0 ||
                   tasksToDelete.size > 0 ||
                   tasksToPinToggle.size > 0 ||
                   pinnedDraftIds.size > 0
        }
        return formData.externalId !== '' ||
               formData.description !== '' ||
               formData.comment !== '' ||
               formData.estimatedTime !== '' ||
               formData.tasks.length > 0 ||
               formData.assignees.length > 0
    }

    const title = isKanban && initialData
        ? `${initialData.status} - ${initialData.externalWorkItem?.type ?? ''} ${initialData.externalWorkItem?.externalId ?? ''}`
        : (isEditMode ? 'Editar Incidencia' : 'Nueva Incidencia')

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            isEditMode={isEditMode}
            isSaving={isSaving}
            onSave={handleSave}
            onClose={handleClose}
            hasUnsavedChanges={hasFormChanges()}
            onDiscard={handleDiscard}
        >
            <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-card-foreground">¿Salir sin guardar?</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Tiene cambios sin guardar. ¿Está seguro de que desea salir y perder los cambios?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDiscardConfirm(false)}
                            className="bg-accent text-foreground hover:bg-accent/80 border-border"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmDiscard}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Salir sin guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-32">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <span className="mt-4 text-muted-foreground">Cargando datos...</span>
                </div>
            ) : (
                <>
            {!isDev && (
                <>
            <FormRow>
                <FormSelect
                    id="type"
                    label="Tipo"
                    value={formData.type}
                    onValueChange={(value) => updateFormData({ type: value as TaskType })}
                    options={typeOptions}
                    disabled={isEditMode}
                />

                <FormInput
                    id="externalId"
                    label="Número"
                    type="number"
                    value={formData.externalId}
                    onChange={(e) => updateFormData({ externalId: e.target.value })}
                    disabled={isEditMode}
                    placeholder="#"
                />
            </FormRow>

            <FormInput
                id="description"
                label="Descripción"
                value={formData.description}
                onChange={(e) => {
                    if (e.target.value === '') {
                        setIsDescriptionManuallyEdited(false)
                    } else {
                        setIsDescriptionManuallyEdited(true)
                    }
                    updateFormData({ description: e.target.value })
                }}
                disabled={hasRequirements}
                placeholder="Descripción breve de la incidencia"
            />

            <FormRow3>
                <FormSelect
                    id="priority"
                    label="Prioridad"
                    value={formData.priority}
                    onValueChange={(value) => updateFormData({ priority: value as Priority })}
                    options={PRIORITY_OPTIONS}
                    disabled={hasTicketRelation}
                />

                <FormSelect
                    id="technology"
                    label="Tecnología"
                    value={formData.technology}
                    onValueChange={(value) => updateFormData({ technology: value })}
                    options={techOptions}
                    disabled={hasTicketRelation}
                />

                <div className="space-y-2">
                    <Label htmlFor="estimatedTime" className="text-card-foreground/80">Horas Estimadas</Label>
                    <Input
                        id="estimatedTime"
                        type="number"
                        min="0"
                        max="9999"
                        step="1"
                        value={formData.estimatedTime}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 9999)) {
                                updateFormData({ estimatedTime: value });
                            }
                        }}
                        className="bg-input border-input text-foreground w-24"
                        placeholder="0"
                    />
                </div>
            </FormRow3>
                </>
            )}

            {isDev && initialData && (
                <>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <IncidenceBadge
                                type={initialData.externalWorkItem?.type ?? ''}
                                color={initialData.externalWorkItem?.color}
                                externalId={initialData.externalWorkItem?.externalId ?? ''}
                                className="text-[9px] font-semibold px-1.5 py-0 uppercase tracking-tight"
                            />
                            <span className="text-sm text-foreground font-medium">{initialData.description}</span>
                        </div>
                    </div>
                    
                    <FormRow3>
                        <div className="space-y-2">
                            <Label className="text-card-foreground/80">Prioridad</Label>
                            <PriorityBadge priority={initialData.priority} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-card-foreground/80">Tecnología</Label>
                            <div className="text-sm text-muted-foreground">{initialData.technology?.name}</div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-card-foreground/80">Horas Estimadas</Label>
                            <div className="text-sm text-muted-foreground">{initialData.estimatedTime || 0}h</div>
                        </div>
                    </FormRow3>
                </>
            )}

            {!isDev ? ((isBacklog || (hasRequirements && isAdmin)) ? (
                <div className="space-y-2">
                    <Label className="text-card-foreground/80">Asignar colaborador</Label>
                    <div className="bg-input border border-border rounded-md">
                        {users.map(user => {
                            const assigneeData = formData.assignees.find(a => a.userId === user.id)
                            const isSelected = !!assigneeData
                            const userAssignment = fullIncidenceData?.assignments?.find(a => a.userId === user.id)
                            const userTasks = userAssignment?.tasks || []
                            const userDraftTasks = draftTasks.filter(t => t.assignmentId === userAssignment?.id || t.assignmentId === user.id)
                            const pendingUserDraftTasks = userDraftTasks.filter(t => !t.isCompleted)
                            const pendingTasks = userTasks.filter((t: Task) => !t.isCompleted && !tasksToDelete.has(t.id))
                            const completedTasks = userTasks.filter((t: Task) => t.isCompleted && !tasksToDelete.has(t.id))
                            const isExpanded = expandedAssignees.has(user.id)

                            return (
                                <div key={user.id} className="border-b border-border last:border-b-0">
                                    <div 
                                        className={`flex items-center gap-3 px-3 py-2 ${isSelected ? 'cursor-pointer hover:bg-transparent' : 'cursor-not-allowed'}`}
                                        onClick={() => isSelected && toggleAssigneeExpanded(user.id)}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggleAssignee(user.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={isSelected && (userTasks.length > 0 || userDraftTasks.length > 0)}
                                            className="border-input"
                                        />
                                        <span className={`text-card-foreground/80 text-sm ${!isSelected ? 'opacity-60' : ''}`}>{user.name}</span>
                                        {(userTasks.length > 0 || userDraftTasks.length > 0) && (
                                            <span className={`text-muted-foreground/70 text-xs ${!isSelected ? 'opacity-60' : ''}`}>
                                                {pendingTasks.length + pendingUserDraftTasks.length}/{userTasks.length + userDraftTasks.length} pendientes
                                            </span>
                                        )}
                                        <div className="flex-1" />
                                        <div className={`flex items-center gap-2 ${!isSelected ? 'opacity-60' : ''}`}>
                                            <span className="text-muted-foreground/70 text-xs">Horas Asignadas:</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="9999"
                                                step="1"
                                                value={assigneeData?.assignedHours || ''}
                                                disabled={!isSelected}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0)) {
                                                        handleUpdateAssigneeHours(user.id, value);
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-background border-border text-foreground w-20 h-6 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="0"
                                            />
                                        </div>
                                        {isExpanded ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={!isSelected}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleAssigneeExpanded(user.id)
                                                }}
                                                className="h-6 w-6 text-muted-foreground/70 disabled:opacity-30"
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={!isSelected}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleAssigneeExpanded(user.id)
                                                }}
                                                className="h-6 w-6 text-muted-foreground/70 disabled:opacity-30"
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {isExpanded && isSelected && (
                                        <div className="px-8 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            <TaskListSection
                                                pendingTasks={pendingTasks}
                                                completedTasks={completedTasks}
                                                pendingDrafts={userDraftTasks.filter(t => !t.isCompleted)}
                                                completedDrafts={userDraftTasks.filter(t => t.isCompleted)}
                                                pinnedTaskIds={getEffectivePinnedIds(pendingTasks)}
                                                pinnedDraftIds={pinnedDraftIds}
                                                tasksToToggle={tasksToToggle}
                                                taskEdits={taskEdits}
                                                editingTaskId={editingTaskId}
                                                editingDraftTaskId={editingDraftTaskId}
                                                draftTaskEdits={draftTaskEdits}
                                                canEditTasks={true}
                                                newTaskValue={newTaskInputs[user.id] || ''}
                                                taskInputError={taskInputErrors[userAssignment?.id || user.id] || false}
                                                assignmentId={userAssignment?.id || user.id}
                                                userId={user.id}
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
                                                    setNewTaskInputs(prev => ({ ...prev, [user.id]: value }))
                                                    if (value.length >= 3) {
                                                        setTaskInputErrors(prev => ({ ...prev, [user.id]: false }))
                                                    }
                                                }}
                                                onNewTaskSubmit={() => {
                                                    const assignmentId = userAssignment?.id || user.id
                                                    const value = newTaskInputs[user.id] || ''
                                                    if (value.length >= 3) {
                                                        handleCreateTask(assignmentId, user.id, value)
                                                        setNewTaskInputs(prev => ({ ...prev, [user.id]: '' }))
                                                        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))
                                                    } else {
                                                        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
                                                    }
                                                }}
                                                showCompletedTasks={showCompletedTasksByUser[user.id] || false}
                                                onToggleShowCompleted={() => toggleShowCompletedForUser(user.id)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : initialData && initialData.assignments.length > 0 ? (
                <div className="space-y-2">
                    <Label className="text-card-foreground/80">Colaborador asignado</Label>
                    <div className="bg-input border border-border rounded-md">
                        {initialData.assignments.filter(a => a.isAssigned).map(assignment => (
                            <div key={assignment.userId} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
                                <span className="text-card-foreground/80 text-sm">{assignment.user.name}</span>
                                <span className="text-muted-foreground/70 text-xs">
                                    {assignment.assignedHours !== null ? `${assignment.assignedHours}h asignadas` : 'Sin horas asignadas'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null) : null}

            {isEditMode && isDev && fullIncidenceData?.assignments && (() => {
                const currentUserAssignment = fullIncidenceData.assignments.find(
                    a => a.isAssigned && a.userId === Number(session?.user?.id)
                )
                const assignmentId = currentUserAssignment?.id || 0
                const devUserId = Number(session?.user?.id)
                const userTasks = currentUserAssignment?.tasks || []

                const visibleTasks = userTasks.filter((t: Task) => !tasksToDelete.has(t.id))
                const pendingTasks = visibleTasks.filter((t: Task) => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? t.isCompleted : !t.isCompleted
                })
                const completedTasks = visibleTasks.filter((t: Task) => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? !t.isCompleted : t.isCompleted
                })

                const userDraftTasks = draftTasks.filter(t => t.assignmentId === assignmentId)
                const pendingDrafts = userDraftTasks.filter(t => !t.isCompleted)
                const completedDrafts = userDraftTasks.filter(t => t.isCompleted)

                const totalCompleted = completedTasks.length + completedDrafts.length
                const totalPending = pendingTasks.length + pendingDrafts.length
                const totalTasks = totalCompleted + totalPending

                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-zinc-100 font-medium">Tareas pendientes</h3>
                            {totalTasks > 0 && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-muted-foreground">
                                        {totalPending}/{totalTasks} pendientes
                                    </span>
                                    <Checkbox
                                        checked={showCompletedTasks}
                                        onCheckedChange={(checked) => setShowCompletedTasks(checked === true)}
                                        className="border-input"
                                    />
                                </label>
                            )}
                        </div>

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
                            canEditTasks={true}
                            newTaskValue={newTaskInputs[assignmentId] || ''}
                            taskInputError={taskInputErrors[assignmentId] || false}
                            assignmentId={assignmentId}
                            userId={assignmentId}
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
                                setNewTaskInputs(prev => ({ ...prev, [assignmentId]: value }))
                                if (value.length >= 3) {
                                    setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))
                                }
                            }}
                            onNewTaskSubmit={() => {
                                if (assignmentId > 0) {
                                    const value = newTaskInputs[assignmentId] || ''
                                    if (value.length >= 3) {
                                        handleCreateTask(assignmentId, devUserId, value)
                                        setNewTaskInputs(prev => ({ ...prev, [assignmentId]: '' }))
                                        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))
                                    } else {
                                        setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
                                    }
                                }
                            }}
                            showCompletedTasks={showCompletedTasks}
                            onToggleShowCompleted={() => setShowCompletedTasks(prev => !prev)}
                        />
                    </div>
                )
            })()}

            <div className="space-y-2">
                <Label htmlFor="comment" className="text-card-foreground/80">Comentario</Label>
                <Textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => updateFormData({ comment: e.target.value })}
                    className="bg-input border-border text-foreground min-h-[120px] resize-none"
                    placeholder="Añade comentarios o notas técnicas..."
                />
            </div>
            </>)
        }
        </FormSheet>
    )
}
