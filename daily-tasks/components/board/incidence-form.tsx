'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
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
import { IncidenceWithDetails } from '@/types'
import { TaskType, Priority, TechStack, TaskStatus } from '@/types/enums'
import { createIncidence, updateIncidence, getIncidence } from '@/app/actions/incidence-actions'
import { getUsers } from '@/app/actions/user-actions'
import { User } from '@prisma/client'
import { toast } from 'sonner'

interface IncidenceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: IncidenceWithDetails | null
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
    onIncidenceCreated?: () => void
}

const typeOptions = [
    { value: TaskType.I_MODAPL, label: 'I_MODAPL' },
    { value: TaskType.I_CASO, label: 'I_CASO' },
    { value: TaskType.I_CONS, label: 'I_CONS' },
]

const priorityOptions = [
    { value: Priority.LOW, label: 'Baja' },
    { value: Priority.MEDIUM, label: 'Media' },
    { value: Priority.HIGH, label: 'Alta' },
]

const techOptions = [
    { value: TechStack.SISA, label: 'SISA' },
    { value: TechStack.WEB, label: 'WEB' },
    { value: TechStack.ANDROID, label: 'ANDROID' },
    { value: TechStack.ANGULAR, label: 'ANGULAR' },
    { value: TechStack.SPRING, label: 'SPRING' },
]

interface AssigneeFormData {
    userId: number
    estimatedHours: string
}

interface FormData {
    type: TaskType
    externalId: string
    title: string
    description: string
    priority: Priority
    technology: TechStack
    estimatedTime: string
    assignees: AssigneeFormData[]
    subTasks: { title: string; isCompleted: boolean }[]
}

export function IncidenceForm({ open, onOpenChange, initialData, onTaskUpdate, onIncidenceCreated }: IncidenceFormProps) {
    const router = useRouter()
    const isEditMode = !!initialData?.id
    const isBacklog = !initialData || initialData.status === TaskStatus.BACKLOG

    const [formData, setFormData] = useState<FormData>({
        type: TaskType.I_MODAPL,
        externalId: '',
        title: '',
        description: '',
        priority: Priority.MEDIUM,
        technology: TechStack.SISA,
        estimatedTime: '',
        assignees: [],
        subTasks: [],
    })

    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newSubTask, setNewSubTask] = useState('')
    const [originalFormData, setOriginalFormData] = useState<FormData | null>(null)
    const [fullIncidenceData, setFullIncidenceData] = useState<IncidenceWithDetails | null>(null)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const [removedAssigneesHours, setRemovedAssigneesHours] = useState<Record<number, string>>({})

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
        const loadUsers = async () => {
            const userList = await getUsers()
            const assignedUserIds = new Set<number>()
            
            if (initialData?.id) {
                const fullData = await getIncidence(initialData.id)
                if (fullData) {
                    fullData.assignments.filter(a => a.isAssigned).forEach(a => assignedUserIds.add(a.userId))
                }
            }
            
            const sortedUsers = sortUsers(userList, assignedUserIds)
            setUsers(sortedUsers)
        }
        loadUsers()
    }, [initialData?.id])

    useEffect(() => {
        const fetchFullData = async () => {
            if (open && initialData?.id) {
                setIsLoading(true)
                setFormData({
                    type: TaskType.I_MODAPL,
                    externalId: '',
                    title: '',
                    description: '',
                    priority: Priority.MEDIUM,
                    technology: TechStack.SISA,
                    estimatedTime: '',
                    assignees: [],
                    subTasks: [],
                })
                setFullIncidenceData(null)
                setOriginalFormData(null)
                
                try {
                    const fullData = await getIncidence(initialData.id)
                    if (fullData) {
                        setFullIncidenceData(fullData)
                        const allAssignments = fullData.assignments
                        const activeAssignments = allAssignments.filter(a => a.isAssigned)
                        const data = {
                            type: fullData.type,
                            externalId: fullData.externalId?.toString() || '',
                            title: fullData.title || '',
                            description: fullData.description || '',
                            priority: fullData.priority,
                            technology: fullData.technology,
                            estimatedTime: fullData.estimatedTime?.toString() || '',
                            assignees: activeAssignments.map(a => ({
                                userId: a.userId,
                                estimatedHours: a.estimatedHours?.toString() || ''
                            })),
                            subTasks: allAssignments.flatMap(assignment => 
                                assignment.tasks.map(st => ({ title: st.title, isCompleted: st.isCompleted }))
                            ),
                        }
                        setFormData(data)
                        setOriginalFormData(data)
                    }
                } catch (error) {
                    console.error('Error loading incidence:', error)
                } finally {
                    setIsLoading(false)
                }
            } else if (open && !initialData) {
                setFormData({
                    type: TaskType.I_MODAPL,
                    externalId: '',
                    title: '',
                    description: '',
                    priority: Priority.MEDIUM,
                    technology: TechStack.SISA,
                    estimatedTime: '',
                    assignees: [],
                    subTasks: [],
                })
                setOriginalFormData(null)
                setIsLoading(false)
            }
        }
        fetchFullData()
    }, [open, initialData])

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

    const handleToggleAssignee = (userId: number) => {
        const exists = formData.assignees.find(a => a.userId === userId)
        if (exists) {
            const hoursToSave = exists.estimatedHours
            setRemovedAssigneesHours(prev => ({ ...prev, [userId]: hoursToSave }))
            updateFormData({
                assignees: formData.assignees.filter(a => a.userId !== userId)
            })
        } else {
            const restoredHours = removedAssigneesHours[userId] ?? ''
            const previousAssignment = fullIncidenceData?.assignments?.find(a => a.userId === userId)
            const previousHours = previousAssignment?.estimatedHours?.toString() ?? ''
            updateFormData({
                assignees: [...formData.assignees, { userId, estimatedHours: restoredHours || previousHours }]
            })
        }
    }

    const handleUpdateAssigneeHours = (userId: number, hours: string) => {
        updateFormData({
            assignees: formData.assignees.map(a => 
                a.userId === userId ? { ...a, estimatedHours: hours } : a
            )
        })
    }

    const handleSave = async () => {
        if (!formData.type || !formData.externalId || !formData.title) {
            toast.error('Tipo, Numero y Descripcion son requeridos')
            return false
        }

        setIsSaving(true)
        try {
            const hoursValue = formData.estimatedTime ? parseInt(formData.estimatedTime) : 0
            
            const assigneeData = formData.assignees.map(a => ({
                userId: a.userId,
                estimatedHours: a.estimatedHours === '' ? null : parseInt(a.estimatedHours)
            }))

            if (isEditMode && initialData?.id) {
                const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData)
                if (!hasChanges) {
                    return true
                }

                const result = await updateIncidence(initialData.id, {
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assignees: assigneeData,
                    subTasks: formData.subTasks.length > 0 ? formData.subTasks : undefined,
                })

                if (result.success) {
                    toast.success(`${initialData.type} ${initialData.externalId} actualizada`)
                    if (result.data) {
                        setFullIncidenceData(result.data)
                        if (onTaskUpdate) {
                            onTaskUpdate(result.data)
                        }
                    }
                    router.refresh()
                    return true
                } else {
                    toast.error(result.error || 'Error al actualizar')
                    return false
                }
            } else {
                const result = await createIncidence({
                    type: formData.type,
                    externalId: parseInt(formData.externalId),
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    tech: formData.technology,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assignees: assigneeData,
                })

                if (result.success) {
                    toast.success(`${formData.type} ${formData.externalId} creada`)
                    router.refresh()
                    return true
                } else {
                    toast.error(result.error || 'Error al crear')
                    return false
                }
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Error inesperado')
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
    }

    const handleDiscard = () => {
        setShowDiscardConfirm(true)
    }

    const confirmDiscard = () => {
        setShowDiscardConfirm(false)
        onOpenChange(false)
    }

    function hasFormChanges(): boolean {
        if (isEditMode && originalFormData) {
            return JSON.stringify(formData) !== JSON.stringify(originalFormData)
        }
        return formData.externalId !== '' || 
               formData.title !== '' || 
               formData.description !== '' ||
               formData.estimatedTime !== '' ||
               formData.subTasks.length > 0 ||
               formData.assignees.length > 0
    }

    const title = isEditMode ? 'Editar Incidencia' : 'Nueva Incidencia'

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
                <DialogContent className="bg-[#191919] border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-100">¿Salir sin guardar?</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Tiene cambios sin guardar. ¿Está seguro de que desea salir y perder los cambios?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDiscardConfirm(false)}
                            className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700"
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
                    <Loader2 className="h-12 w-12 animate-spin text-yellow-400" />
                    <span className="mt-4 text-zinc-400">Cargando datos...</span>
                </div>
            ) : (
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
                id="title"
                label="Descripción"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Descripción breve de la incidencia"
            />

            <FormRow3>
                <FormSelect
                    id="priority"
                    label="Prioridad"
                    value={formData.priority}
                    onValueChange={(value) => updateFormData({ priority: value as Priority })}
                    options={priorityOptions}
                />

                <FormSelect
                    id="technology"
                    label="Tecnología"
                    value={formData.technology}
                    onValueChange={(value) => updateFormData({ technology: value as TechStack })}
                    options={techOptions}
                />

                <div className="space-y-2">
                    <Label htmlFor="estimatedTime" className="text-zinc-300">Horas</Label>
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
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 w-24"
                        placeholder="0"
                    />
                </div>
            </FormRow3>

            {isBacklog ? (
                <div className="space-y-2">
                    <Label className="text-zinc-300">Asignar colaborador</Label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
                        <div className="space-y-2">
                            {users.map(user => {
                                const assigneeData = formData.assignees.find(a => a.userId === user.id)
                                const isSelected = !!assigneeData
                                
                                const userAssignment = fullIncidenceData?.assignments?.find(a => a.userId === user.id)
                                const userTasks = userAssignment?.tasks || []
                                const hasTasks = userTasks.length > 0
                                const completedTasks = userTasks.filter((t: {isCompleted: boolean}) => t.isCompleted).length
                                const totalTasks = userTasks.length
                                const isAllCompleted = hasTasks && completedTasks === totalTasks
                                
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded"
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggleAssignee(user.id)}
                                            className="border-zinc-600"
                                        />
                                        <span className="text-zinc-300 text-sm">{user.name}</span>
                                        
                                        {hasTasks && (
                                            <div className="flex items-center gap-1 text-[11px]">
                                                {isAllCompleted ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                                                        <span className="text-green-400">completado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-zinc-400">
                                                            {completedTasks}/{totalTasks}
                                                        </span>
                                                        <span className="text-zinc-500">pendientes</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex-1"></div>
                                        
                                        <div className="flex items-center gap-2">
                                                <span className="text-zinc-500 text-xs">Horas asignadas:</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="9999"
                                                    step="1"
                                                    value={assigneeData?.estimatedHours || ''}
                                                    disabled={!isSelected}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0)) {
                                                            handleUpdateAssigneeHours(user.id, value);
                                                        }
                                                    }}
                                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 w-20 h-7 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="0"
                                                />
                                            </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Al asignar colaboradores, especifica las horas que cada uno aportará a la tarea.
                    </p>
                </div>
            ) : initialData && initialData.assignments.length > 0 ? (
                <div className="space-y-2">
                    <Label className="text-zinc-300">Colaborador asignado</Label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
                        {initialData.assignments.map(assignment => (
                            <div key={assignment.userId} className="flex items-center justify-between p-2">
                                <span className="text-zinc-300 text-sm">{assignment.user.name}</span>
                                <span className="text-zinc-500 text-xs">
                                    {assignment.estimatedHours !== null ? `${assignment.estimatedHours}h asignadas` : 'Sin horas asignadas'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                <Label className="text-zinc-300">Pendientes</Label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2">
                    <div className="flex gap-2">
                        <Input
                            value={newSubTask}
                            onChange={(e) => setNewSubTask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm"
                            placeholder="Nuevo ítem..."
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={handleAddSubTask}
                            className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="space-y-1">
                        {formData.subTasks.map((subTask, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded group"
                            >
                                <Checkbox
                                    checked={subTask.isCompleted}
                                    onCheckedChange={() => handleToggleSubTask(index)}
                                    className="border-zinc-600"
                                />
                                <span className={`text-sm flex-1 ${subTask.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                                    {subTask.title}
                                </span>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRemoveSubTask(index)}
                                    className="h-6 w-6 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {formData.subTasks.length === 0 && (
                            <p className="text-zinc-500 text-sm text-center py-2">
                                No hay ítems en el checklist
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">Comentario</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[120px] resize-none"
                    placeholder="Añade comentarios o notas técnicas..."
                />
            </div>
            </>)
        }
        </FormSheet>
    )
}
