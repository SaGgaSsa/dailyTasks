'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { IncidenceWithDetails } from '@/types'
import { TaskType, Priority, TechStack } from '@/types/enums'
import { createIncidence, updateIncidence } from '@/app/actions/incidence-actions'
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

interface FormData {
    type: TaskType
    externalId: string
    title: string
    description: string
    priority: Priority
    technology: TechStack
    estimatedTime: string
    assigneeIds: number[]
    subTasks: { title: string; isCompleted: boolean }[]
}

export function IncidenceForm({ open, onOpenChange, initialData, onTaskUpdate, onIncidenceCreated }: IncidenceFormProps) {
    const router = useRouter()
    const isEditMode = !!initialData?.id

    const [formData, setFormData] = useState<FormData>({
        type: TaskType.I_MODAPL,
        externalId: '',
        title: '',
        description: '',
        priority: Priority.MEDIUM,
        technology: TechStack.SISA,
        estimatedTime: '',
        assigneeIds: [],
        subTasks: [],
    })

    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newSubTask, setNewSubTask] = useState('')

    useEffect(() => {
        const loadUsers = async () => {
            const userList = await getUsers()
            setUsers(userList)
        }
        loadUsers()
    }, [])

    useEffect(() => {
        if (open && initialData) {
            setFormData({
                type: initialData.type,
                externalId: initialData.externalId?.toString() || '',
                title: initialData.title || '',
                description: initialData.description || '',
                priority: initialData.priority,
                technology: initialData.technology,
                estimatedTime: initialData.estimatedTime?.toString() || '',
                assigneeIds: initialData.assignees.map(a => a.id),
                subTasks: initialData.subTasks.map(st => ({ title: st.title, isCompleted: st.isCompleted })),
            })
        } else if (open && !initialData) {
            setFormData({
                type: TaskType.I_MODAPL,
                externalId: '',
                title: '',
                description: '',
                priority: Priority.MEDIUM,
                technology: TechStack.SISA,
                estimatedTime: '',
                assigneeIds: [],
                subTasks: [],
            })
        }
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
        const newAssignees = formData.assigneeIds.includes(userId)
            ? formData.assigneeIds.filter(id => id !== userId)
            : [...formData.assigneeIds, userId]
        updateFormData({ assigneeIds: newAssignees })
    }

    const handleSave = async () => {
        if (!formData.type || !formData.externalId || !formData.title) {
            toast.error('Tipo, Número y Descripción son requeridos')
            return false
        }

        setIsSaving(true)
        try {
            const hoursValue = formData.estimatedTime ? parseInt(formData.estimatedTime) : 0
            if (isEditMode && initialData?.id) {
                const result = await updateIncidence(initialData.id, {
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assigneeIds: formData.assigneeIds,
                    subTasks: formData.subTasks.length > 0 ? formData.subTasks : undefined,
                })

                if (result.success) {
                    toast.success(`${initialData.type} ${initialData.externalId} actualizada`)
                    if (onTaskUpdate && result.data) {
                        onTaskUpdate(result.data)
                    }
                    router.refresh()
                    return true
                } else {
                    toast.error(result.error || 'Error al actualizar')
                    return false
                }
            } else {
                const hoursValue = formData.estimatedTime ? parseInt(formData.estimatedTime) : 0
                const result = await createIncidence({
                    type: formData.type,
                    externalId: parseInt(formData.externalId),
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    tech: formData.technology,
                    estimatedTime: hoursValue > 0 ? hoursValue : null,
                    assigneeIds: formData.assigneeIds,
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

    const handleClose = async () => {
        onOpenChange(false)
    }

    const handleSaveAndClose = async () => {
        const success = await handleSave()
        if (success) {
            onOpenChange(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={(open) => {
            if (!open) {
                handleClose()
            }
        }}>
            <SheetContent
                onInteractOutside={(e) => {
                    e.preventDefault()
                    if (isEditMode) {
                        handleSaveAndClose()
                    } else {
                        handleClose()
                    }
                }}
                className="w-full sm:min-w-[45vw] sm:max-w-[50vw] bg-[#191919] border-zinc-800 overflow-y-auto"
            >
                <SheetHeader className="space-y-2 pb-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-zinc-100 pt-1">
                            {isEditMode ? 'Editar Incidencia' : 'Nueva Incidencia'}
                        </SheetTitle>
                        <div className="flex items-center gap-2 pt-1">
                            {isSaving && (
                                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                title="Descartar cambios"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSaveAndClose}
                                disabled={isSaving}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                title="Guardar"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex flex-col space-y-4 py-6 pl-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-zinc-300">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => updateFormData({ type: value as TaskType })}
                                disabled={isEditMode}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {typeOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="externalId" className="text-zinc-300">Número</Label>
                            <Input
                                id="externalId"
                                type="number"
                                value={formData.externalId}
                                onChange={(e) => updateFormData({ externalId: e.target.value })}
                                disabled={isEditMode}
                                className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                placeholder="#"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-300">Descripción</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => updateFormData({ title: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-zinc-100"
                            placeholder="Descripción breve de la incidencia"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-zinc-300">Prioridad</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => updateFormData({ priority: value as Priority })}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {priorityOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="technology" className="text-zinc-300">Tecnología</Label>
                            <Select
                                value={formData.technology}
                                onValueChange={(value) => updateFormData({ technology: value as TechStack })}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {techOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

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
                    </div>

                    <div className="space-y-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {users.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-zinc-800 rounded cursor-pointer"
                                        onClick={() => handleToggleAssignee(user.id)}
                                    >
                                        <Checkbox
                                            checked={formData.assigneeIds.includes(user.id)}
                                            onCheckedChange={() => {}}
                                            className="border-zinc-600"
                                        />
                                        <span className="text-zinc-300 text-sm">{user.name}</span>
                                        <span className="text-zinc-500 text-xs">({user.username})</span>
                                        <Badge variant="outline" className="ml-auto text-[10px] border-zinc-700 text-zinc-500">
                                            {user.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

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
                </div>
            </SheetContent>
        </Sheet>
    )
}
