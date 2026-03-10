'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { IncidenceWithDetails, SubTask } from '@/types'
import { TaskType, TaskStatus, Priority } from '@/types/enums'
import { PRIORITY_OPTIONS } from '@/lib/ticket-sort'
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from '@prisma/client'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'

import { createIncidence, updateIncidence, updateIncidenceComment, getIncidence, getIncidenceWithUsers, createSubTask, toggleSubTask, deleteSubTask, updateSubTaskTitle } from '@/app/actions/incidence-actions'
import { getCachedTechsWithModules } from '@/app/actions/tech'
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
    subTasks: { title: string; isCompleted: boolean }[]
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
        subTasks: [],
    })

    const [users, setUsers] = useState<User[]>([])
    const [techOptions, setTechOptions] = useState<{ value: string; label: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newSubTask, setNewSubTask] = useState('')
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
    const taskInputRef = useRef<HTMLInputElement>(null)

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
                    subTasks: [],
                })
                setFullIncidenceData(null)
                setOriginalFormData(null)
                setNewSubTask('')
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
                            subTasks: allAssignments.flatMap(assignment => 
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
                setFormData({
                    type: TaskType.I_MODAPL,
                    externalId: '',
                    description: '',
                    comment: '',
                    priority: Priority.MEDIUM,
                    technology: 'SISA',
                    estimatedTime: '',
                    assignees: [],
                    subTasks: [],
                })
                setOriginalFormData(null)
                setNewSubTask('')
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

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }))
    }

    const handleAddSubTask = () => {
        if (!newSubTask.trim()) return
        updateFormData({
            subTasks: [...formData.subTasks, { title: newSubTask, isCompleted: false }]
        })
        setNewSubTask('')
    }

    const handleToggleSubTask = (index: number) => {
        const updated = formData.subTasks.map((st, i) =>
            i === index ? { ...st, isCompleted: !st.isCompleted } : st
        )
        updateFormData({ subTasks: updated })
    }

    const handleRemoveSubTask = (index: number) => {
        const updated = formData.subTasks.filter((_, i) => i !== index)
        updateFormData({ subTasks: updated })
    }

    const handleCreateTask = async (assignmentId: number, title: string) => {
        if (!title.trim() || title.trim().length < 3) {
            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
            return
        }
        
        const tempId = `${assignmentId}-${Date.now()}`
        setDraftTasks(prev => [...prev, { tempId, title, assignmentId, isCompleted: false }])
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
        if (isDev) {
            if (!initialData?.id) {
                return false
            }
            
            const hasChanges =
                (originalFormData && formData.comment !== originalFormData.comment) ||
                draftTasks.length > 0 ||
                tasksToToggle.size > 0 ||
                tasksToDelete.size > 0
            
            if (!hasChanges) {
                return true
            }
            
            setIsSaving(true)
            try {
                if (originalFormData && formData.comment !== originalFormData.comment) {
                    const commentResult = await updateIncidenceComment(initialData.id, formData.comment)
                    if (!commentResult.success) {
                        toast.error(commentResult.error || 'Error al guardar comentario')
                        return false
                    }
                }

                for (const draft of draftTasks) {
                    await createSubTask(draft.assignmentId, draft.title)
                }
                setDraftTasks([])

                let autoTransitionedToReview = false
                let reviewMessage = ''

                for (const taskId of tasksToToggle) {
                    const result = await toggleSubTask(taskId)
                    if (result.success && result.autoTransitionedToReview) {
                        autoTransitionedToReview = true
                        reviewMessage = result.message || ''
                    }
                }
                setTasksToToggle(new Set())

                for (const taskId of tasksToDelete) {
                    const result = await deleteSubTask(taskId)
                }
                setTasksToDelete(new Set())

                const updatedData = await getIncidence(initialData.id)
                if (updatedData) {
                    setFullIncidenceData(updatedData)
                    if (onTaskUpdate) {
                        onTaskUpdate(updatedData)
                    }
                }

                if (autoTransitionedToReview) {
                    toast.success('🎉 ' + reviewMessage)
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
                const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData) || draftTasks.length > 0 || tasksToToggle.size > 0 || tasksToDelete.size > 0 || Object.keys(taskEdits).length > 0
                if (!hasChanges) {
                    return true
                }

                const result = await updateIncidence(initialData.id, {
                    description: formData.description,
                    comment: formData.comment,
                    priority: formData.priority,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assignees: assigneeData,
                    subTasks: formData.subTasks.length > 0 ? formData.subTasks : undefined,
                })

                if (result.success) {
                    toast.success(`${initialData.externalWorkItem?.type ?? ''} ${initialData.externalWorkItem?.externalId ?? ''} actualizada`)

                    let autoTransitionedToReview = false
                    let reviewMessage = ''

                    if (draftTasks.length > 0 && result.data) {
                        for (const draft of draftTasks) {
                            const assignment = result.data.assignments.find(
                                a => a.id === draft.assignmentId || a.userId === draft.assignmentId
                            )
                            if (assignment) {
                                const createResult = await createSubTask(assignment.id, draft.title, draft.isCompleted)
                                if (createResult.success && createResult.autoTransitionedToReview) {
                                    autoTransitionedToReview = true
                                    reviewMessage = createResult.message || ''
                                }
                            }
                        }
                    }
                    setDraftTasks([])

                    for (const taskId of tasksToToggle) {
                        const toggleResult = await toggleSubTask(taskId)
                        if (toggleResult.success && toggleResult.autoTransitionedToReview) {
                            autoTransitionedToReview = true
                            reviewMessage = toggleResult.message || ''
                        }
                    }
                    setTasksToToggle(new Set())

                    for (const taskId of tasksToDelete) {
                        await deleteSubTask(taskId)
                    }
                    setTasksToDelete(new Set())

                    for (const [taskId, newTitle] of Object.entries(taskEdits)) {
                        await updateSubTaskTitle(Number(taskId), newTitle)
                    }
                    setTaskEdits({})

                    const updatedData = await getIncidence(initialData.id)
                    if (updatedData) {
                        setFullIncidenceData(updatedData)
                        if (onTaskUpdate) {
                            onTaskUpdate(updatedData)
                        }
                    }

                    if (autoTransitionedToReview) {
                        toast.success('🎉 ' + reviewMessage)
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
        setNewSubTask('')
        setNewTaskInputs({})
        setTaskInputErrors({})
        setRemovedAssigneesHours({})
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
        setNewSubTask('')
        setNewTaskInputs({})
        setTaskInputErrors({})
        setRemovedAssigneesHours({})
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
                   tasksToDelete.size > 0
        }
        return formData.externalId !== '' ||
               formData.description !== '' ||
               formData.comment !== '' ||
               formData.estimatedTime !== '' ||
               formData.subTasks.length > 0 ||
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
                onChange={(e) => updateFormData({ description: e.target.value })}
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
                            const pendingTasks = userTasks.filter((t: SubTask) => !t.isCompleted && !tasksToDelete.has(t.id))
                            const completedTasks = userTasks.filter((t: SubTask) => t.isCompleted && !tasksToDelete.has(t.id))
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
                                            {/* Tareas pendientes de la base de datos */}
                                            {pendingTasks.map((task: SubTask) => (
                                                <div key={task.id} className="flex items-center gap-2 px-2 py-1 bg-accent/30 rounded group">
                                                    <Checkbox
                                                        checked={tasksToToggle.has(task.id)}
                                                        onCheckedChange={() => handleToggleTask(task.id)}
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
                                                            className="flex-1 bg-input border-border text-foreground h-6 text-sm"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-card-foreground/80 flex-1">{taskEdits[task.id] || task.title}</span>
                                                    )}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleStartEditTask(task.id, task.title)}
                                                            className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                                            </svg>
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
                                                </div>
                                            ))}

                                            {/* Tareas nuevas en la sesión */}
                                            {draftTasks.filter(t => t.assignmentId === userAssignment?.id || t.assignmentId === user.id).map(draft => (
                                                <div key={draft.tempId} className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded group">
                                                    <Checkbox
                                                        checked={draft.isCompleted}
                                                        onCheckedChange={() => {
                                                            setDraftTasks(prev => prev.map(t =>
                                                                t.tempId === draft.tempId ? { ...t, isCompleted: !t.isCompleted } : t
                                                            ))
                                                        }}
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
                                                        <span className={`text-sm text-card-foreground/80 flex-1 ${draft.isCompleted ? 'line-through text-muted-foreground/70' : ''}`}>{draftTaskEdits[draft.tempId] || draft.title}</span>
                                                    )}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleStartEditDraftTask(draft.tempId, draft.title)}
                                                            className="h-5 w-5 text-muted-foreground/70 hover:text-card-foreground/80"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                                            </svg>
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

                                            {/* Input para nueva tarea */}
                                            <Input
                                                data-assignment-id={userAssignment?.id || user.id}
                                                value={newTaskInputs[user.id] || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    setNewTaskInputs(prev => ({ ...prev, [user.id]: value }))
                                                    if (value.length >= 3) {
                                                        setTaskInputErrors(prev => ({ ...prev, [user.id]: false }))
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const assignmentId = userAssignment?.id || user.id
                                                        const value = newTaskInputs[user.id] || ''
                                                        if (value.length >= 3) {
                                                            handleCreateTask(assignmentId, value)
                                                            setNewTaskInputs(prev => ({ ...prev, [user.id]: '' }))
                                                            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: false }))
                                                        } else {
                                                            setTaskInputErrors(prev => ({ ...prev, [assignmentId]: true }))
                                                        }
                                                    }
                                                }}
                                                className={`bg-background text-foreground text-sm w-full ${taskInputErrors[userAssignment?.id || user.id] ? 'border-red-500' : 'border-border'}`}
                                                placeholder={`Nueva tarea para ${user.name}...`}
                                            />

                                            {/* Tareas completadas - Toggle para mostrar */}
                                            {completedTasks.length > 0 && (
                                                <div className="pt-2 border-t border-border">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleShowCompletedForUser(user.id)}
                                                        className="text-xs text-muted-foreground/70 hover:text-card-foreground/80 flex items-center gap-1"
                                                    >
                                                        {showCompletedTasksByUser[user.id] ? (
                                                            <>▼ Ocultar completadas ({completedTasks.length})</>
                                                        ) : (
                                                            <>▶ Mostrar completadas ({completedTasks.length})</>
                                                        )}
                                                    </button>
                                                    
                                                    {showCompletedTasksByUser[user.id] && (
                                                        <div className="mt-2 space-y-1">
                                                            {completedTasks.map((task: SubTask) => (
                                                                <div key={task.id} className="flex items-center gap-2 px-2 py-1 rounded opacity-60">
                                                                    <Checkbox
                                                                        checked={!tasksToToggle.has(task.id)}
                                                                        onCheckedChange={() => handleToggleTask(task.id)}
                                                                        className="border-input"
                                                                    />
                                                                    <span className="text-sm line-through text-muted-foreground/70 flex-1">
                                                                        {taskEdits[task.id] || task.title}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                        Al asignar colaboradores, especifica las horas que cada uno aportará a la tarea.
                    </p>
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
                const currentUserId = currentUserAssignment?.id || 0
                const userTasks = currentUserAssignment?.tasks || []
                
                const visibleTasks = userTasks.filter((t: SubTask) => !tasksToDelete.has(t.id))
                const pendingTasks = visibleTasks.filter((t: SubTask) => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? t.isCompleted : !t.isCompleted
                })
                const completedTasks = visibleTasks.filter((t: SubTask) => {
                    const isToggled = tasksToToggle.has(t.id)
                    return isToggled ? !t.isCompleted : t.isCompleted
                })

                const userDraftTasks = draftTasks.filter(t => t.assignmentId === currentUserId)
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
                        
                        {pendingTasks.length > 0 && (
                            <div className="space-y-1">
                                {pendingTasks.map((task) => {
                                    const isToggled = tasksToToggle.has(task.id)
                                    const isMarkedForDelete = tasksToDelete.has(task.id)
                                    const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted
                                    
                                    return (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded group ${isMarkedForDelete ? 'opacity-50' : ''}`}
                                        >
                                            <Checkbox
                                                checked={displayCompleted}
                                                onCheckedChange={() => handleToggleTask(task.id)}
                                                className="border-input"
                                            />
                                            <span className="text-sm text-card-foreground/80 flex-1">{task.title}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="h-6 w-6 text-muted-foreground/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {(() => {
                            const userDraftTasks = draftTasks.filter(t => t.assignmentId === currentUserId)
                            const pendingDrafts = userDraftTasks.filter(t => !t.isCompleted)
                            const completedDrafts = userDraftTasks.filter(t => t.isCompleted)

                            return (
                                <>
                                    {pendingDrafts.map(draft => (
                                        <div key={draft.tempId} className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded group">
                                            <Checkbox
                                                checked={draft.isCompleted}
                                                onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
                                                className="border-input"
                                            />
                                            <span className="text-sm text-card-foreground/80 flex-1">{draft.title}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveDraftTask(draft.tempId)}
                                                className="h-6 w-6 text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}

                                    <Input
                                        data-assignment-id={currentUserId}
                                        value={newTaskInputs[currentUserId] || ''}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setNewTaskInputs(prev => ({ ...prev, [currentUserId]: value }))
                                            if (value.length >= 3) {
                                                setTaskInputErrors(prev => ({ ...prev, [currentUserId]: false }))
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && currentUserId > 0) {
                                                const value = newTaskInputs[currentUserId] || ''
                                                if (value.length >= 3) {
                                                    handleCreateTask(currentUserId, value)
                                                    setNewTaskInputs(prev => ({ ...prev, [currentUserId]: '' }))
                                                    setTaskInputErrors(prev => ({ ...prev, [currentUserId]: false }))
                                                } else {
                                                    setTaskInputErrors(prev => ({ ...prev, [currentUserId]: true }))
                                                }
                                            }
                                        }}
                                        className={`bg-input text-foreground text-sm w-full ${taskInputErrors[currentUserId] ? 'border-red-500' : 'border-border'}`}
                                        placeholder="+ Agregar tarea..."
                                    />

                                    {showCompletedTasks && completedDrafts.length > 0 && (
                                        <div className="space-y-1 pt-2 border-t border-border">
                                            {completedDrafts.map(draft => (
                                                <div key={draft.tempId} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded group opacity-60">
                                                    <Checkbox
                                                        checked={draft.isCompleted}
                                                        onCheckedChange={() => handleToggleDraftTask(draft.tempId)}
                                                        className="border-input"
                                                    />
                                                    <span className="text-sm text-muted-foreground/70 line-through flex-1">{draft.title}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveDraftTask(draft.tempId)}
                                                        className="h-6 w-6 text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )
                        })()}



                        {showCompletedTasks && completedTasks.length > 0 && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 pt-2 border-t border-border">
                                {completedTasks.map((task) => {
                                    const isToggled = tasksToToggle.has(task.id)
                                    const displayCompleted = isToggled ? !task.isCompleted : task.isCompleted
                                    
                                    return (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded group opacity-60"
                                        >
                                            <Checkbox
                                                checked={displayCompleted}
                                                onCheckedChange={() => handleToggleTask(task.id)}
                                                className="border-input"
                                            />
                                            <span className="text-sm text-muted-foreground/70 line-through flex-1">{task.title}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
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
