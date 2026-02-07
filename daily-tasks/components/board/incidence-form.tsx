'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Check, Plus, Trash2, Loader2 } from 'lucide-react'
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

export function IncidenceForm({ open, onOpenChange, initialData, onTaskUpdate }: IncidenceFormProps) {
    const isEditMode = !!initialData?.id
    
    // Form state
    const [type, setType] = useState<TaskType>(TaskType.I_MODAPL)
    const [externalId, setExternalId] = useState('')
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM)
    const [technology, setTechnology] = useState<TechStack>(TechStack.SISA)
    const [estimatedTime, setEstimatedTime] = useState('')
    const [assigneeIds, setAssigneeIds] = useState<number[]>([])
    const [subTasks, setSubTasks] = useState<{ title: string; isCompleted: boolean }[]>([])
    const [newSubTask, setNewSubTask] = useState('')
    const [description, setDescription] = useState('')
    
    // UI state
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            const userList = await getUsers()
            setUsers(userList)
        }
        loadUsers()
    }, [])

    // Reset form when opening/closing or changing initialData
    useEffect(() => {
        if (open && initialData) {
            setType(initialData.type)
            setExternalId(initialData.externalId?.toString() || '')
            setTitle(initialData.title || '')
            setPriority(initialData.priority)
            setTechnology(initialData.technology)
            setEstimatedTime(initialData.estimatedTime?.toString() || '')
            setAssigneeIds(initialData.assignees.map(a => a.id))
            setSubTasks(initialData.subTasks.map(st => ({ title: st.title, isCompleted: st.isCompleted })))
            setDescription(initialData.description || '')
        } else if (open && !initialData) {
            // Reset for new incidence
            setType(TaskType.I_MODAPL)
            setExternalId('')
            setTitle('')
            setPriority(Priority.MEDIUM)
            setTechnology(TechStack.SISA)
            setEstimatedTime('')
            setAssigneeIds([])
            setSubTasks([])
            setNewSubTask('')
            setDescription('')
        }
    }, [open, initialData])

    // Auto-save function for edit mode
    const handleAutoSave = useCallback(async (fieldData: Partial<Parameters<typeof updateIncidence>[1]>) => {
        if (!isEditMode || !initialData?.id) return
        
        setSaveStatus('saving')
        try {
            const result = await updateIncidence(initialData.id, fieldData)
            if (result.success) {
                setSaveStatus('saved')
                // Update parent component with new data
                if (onTaskUpdate && result.data) {
                    onTaskUpdate(result.data)
                }
                setTimeout(() => setSaveStatus('idle'), 1500)
            } else {
                toast.error(result.error || 'Error al guardar')
                setSaveStatus('idle')
            }
        } catch (error) {
            console.error('Auto-save error:', error)
            setSaveStatus('idle')
        }
    }, [isEditMode, initialData?.id, onTaskUpdate])

    // Handle text input blur for auto-save
    const handleTextBlur = (field: string, value: string | number | undefined) => {
        if (!isEditMode) return
        handleAutoSave({ [field]: value })
    }

    // Handle select change for auto-save
    const handleSelectChange = (field: string, value: string) => {
        if (isEditMode) {
            handleAutoSave({ [field]: value })
        }
    }

    // Handle assignees change for auto-save
    const handleAssigneesChange = (newAssignees: number[]) => {
        setAssigneeIds(newAssignees)
        if (isEditMode) {
            handleAutoSave({ assigneeIds: newAssignees })
        }
    }

    // Handle create/save
    const handleSave = async () => {
        if (!type || !externalId || !title) {
            toast.error('Tipo, Número y Descripción son requeridos')
            return
        }

        setIsLoading(true)
        try {
            if (isEditMode && initialData?.id) {
                // Update mode - force save all fields
                const result = await updateIncidence(initialData.id, {
                    title,
                    description,
                    priority,
                    estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined,
                    assigneeIds,
                    subTasks: subTasks.length > 0 ? subTasks : undefined,
                })
                
                if (result.success) {
                    toast.success('Incidencia actualizada')
                    // Update parent component with new data
                    if (onTaskUpdate && result.data) {
                        onTaskUpdate(result.data)
                    }
                    onOpenChange(false)
                } else {
                    toast.error(result.error || 'Error al actualizar')
                }
            } else {
                // Create mode
                const result = await createIncidence({
                    type,
                    externalId: parseInt(externalId),
                    title,
                    description,
                    priority,
                    tech: technology,
                    estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined,
                    assigneeIds,
                })
                
                if (result.success) {
                    toast.success('Incidencia creada')
                    onOpenChange(false)
                } else {
                    toast.error(result.error || 'Error al crear')
                }
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    // Subtask handlers
    const addSubTask = () => {
        if (!newSubTask.trim()) return
        const updatedSubTasks = [...subTasks, { title: newSubTask, isCompleted: false }]
        setSubTasks(updatedSubTasks)
        setNewSubTask('')
        if (isEditMode) {
            handleAutoSave({ subTasks: updatedSubTasks })
        }
    }

    const toggleSubTask = (index: number) => {
        const updatedSubTasks = subTasks.map((st, i) => 
            i === index ? { ...st, isCompleted: !st.isCompleted } : st
        )
        setSubTasks(updatedSubTasks)
        if (isEditMode) {
            handleAutoSave({ subTasks: updatedSubTasks })
        }
    }

    const removeSubTask = (index: number) => {
        const updatedSubTasks = subTasks.filter((_, i) => i !== index)
        setSubTasks(updatedSubTasks)
        if (isEditMode) {
            handleAutoSave({ subTasks: updatedSubTasks })
        }
    }

    // Toggle assignee
    const toggleAssignee = (userId: number) => {
        const newAssignees = assigneeIds.includes(userId)
            ? assigneeIds.filter(id => id !== userId)
            : [...assigneeIds, userId]
        handleAssigneesChange(newAssignees)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:min-w-[45vw] sm:max-w-[50vw] bg-[#191919] border-zinc-800 overflow-y-auto">
                <SheetHeader className="space-y-2 pb-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-zinc-100">
                            {isEditMode ? 'Editar Incidencia' : 'Nueva Incidencia'}
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            {/* Save status indicator */}
                            {isEditMode && saveStatus !== 'idle' && (
                                <span className={`text-xs ${saveStatus === 'saving' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {saveStatus === 'saving' ? 'Guardando...' : 'Guardado'}
                                </span>
                            )}
                            {/* Check/Save button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSave}
                                disabled={isLoading}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                            </Button>
                            {/* Close button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                </SheetHeader>

                <div className="flex flex-col space-y-4 py-6 pl-8">
                    {/* Tipo y Número */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-zinc-300">Tipo</Label>
                            <Select
                                value={type}
                                onValueChange={(value) => {
                                    setType(value as TaskType)
                                    handleSelectChange('type', value)
                                }}
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
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                onBlur={() => handleTextBlur('externalId', externalId ? parseInt(externalId) : undefined)}
                                disabled={isEditMode}
                                className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                placeholder="#"
                            />
                        </div>
                    </div>

                    {/* Descripción (antes Título Corto) */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-300">Descripción</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value)
                                if (isEditMode) {
                                    handleAutoSave({ title: e.target.value })
                                }
                            }}
                            className="bg-zinc-900 border-zinc-800 text-zinc-100"
                            placeholder="Descripción breve de la incidencia"
                        />
                    </div>

                    {/* Prioridad, Tecnología y Horas */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-zinc-300">Prioridad</Label>
                            <Select
                                value={priority}
                                onValueChange={(value) => {
                                    setPriority(value as Priority)
                                    handleSelectChange('priority', value)
                                }}
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
                                value={technology}
                                onValueChange={(value) => {
                                    setTechnology(value as TechStack)
                                    handleSelectChange('technology', value)
                                }}
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
                                value={estimatedTime}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || (/^\d{0,4}$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 9999)) {
                                        setEstimatedTime(value);
                                    }
                                }}
                                onBlur={() => handleTextBlur('estimatedTime', estimatedTime ? parseInt(estimatedTime) : undefined)}
                                className="bg-zinc-900 border-zinc-800 text-zinc-100 w-24"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Colaboradores */}
                    <div className="space-y-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {users.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-zinc-800 rounded cursor-pointer"
                                        onClick={() => toggleAssignee(user.id)}
                                    >
                                        <Checkbox
                                            checked={assigneeIds.includes(user.id)}
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

                    {/* Pendientes */}
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Pendientes</Label>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2">
                            {/* Add new subtask */}
                            <div className="flex gap-2">
                                <Input
                                    value={newSubTask}
                                    onChange={(e) => setNewSubTask(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm"
                                    placeholder="Nuevo ítem..."
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={addSubTask}
                                    className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            {/* Subtask list */}
                            <div className="space-y-1">
                                {subTasks.map((subTask, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded group"
                                    >
                                        <Checkbox
                                            checked={subTask.isCompleted}
                                            onCheckedChange={() => toggleSubTask(index)}
                                            className="border-zinc-600"
                                        />
                                        <span className={`text-sm flex-1 ${subTask.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                                            {subTask.title}
                                        </span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeSubTask(index)}
                                            className="h-6 w-6 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                {subTasks.length === 0 && (
                                    <p className="text-zinc-500 text-sm text-center py-2">
                                        No hay ítems en el checklist
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Comentario */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-zinc-300">Comentario</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value)
                                if (isEditMode) {
                                    handleAutoSave({ description: e.target.value })
                                }
                            }}
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[120px] resize-none"
                            placeholder="Añade comentarios o notas técnicas..."
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
