'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Globe, Link as LinkIcon, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getUsers } from '@/app/actions/user-actions'
import { Checkbox } from '@/components/ui/checkbox'
import { IncidenceWithDetails } from '@/types'
import { TaskStatus, TaskType, TechStack, Priority } from '@prisma/client'
import { createIncidence, updateIncidence } from '@/app/actions/incidence-actions'
import { MarkdownText } from '@/components/ui/markdown-text'

interface IncidenceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: IncidenceWithDetails | null
}

export function IncidenceForm({ open, onOpenChange, initialData }: IncidenceFormProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'ADMIN'

    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<any[]>([])

    // Form State
    const [type, setType] = useState<TaskType>(TaskType.I_MODAPL)
    const [externalId, setExternalId] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [tech, setTech] = useState<TechStack>(TechStack.WEB)
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM)
    const [status, setStatus] = useState<TaskStatus>(TaskStatus.BACKLOG)
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
    const [estimatedTime, setEstimatedTime] = useState('')

    // Subtasks
    const [subTasks, setSubTasks] = useState<{ title: string, isCompleted: boolean }[]>([])
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('')

    useEffect(() => {
        if (isAdmin && open) {
            getUsers().then(setUsers)
        }
    }, [isAdmin, open])

    useEffect(() => {
        if (initialData) {
            setType(initialData.type)
            setExternalId(initialData.externalId.toString())
            setTitle(initialData.title)
            setDescription(initialData.description || '')
            setTech(initialData.technology)
            setPriority(initialData.priority)
            setStatus(initialData.status)
            setSelectedAssigneeIds(initialData.assignees.map(a => a.id))
            setEstimatedTime(initialData.estimatedTime?.toString() || '')
            setSubTasks(initialData.subTasks.map(st => ({ title: st.title, isCompleted: st.isCompleted })))
        } else {
            setType(TaskType.I_MODAPL)
            setExternalId('')
            setTitle('')
            setDescription('')
            setTech(TechStack.WEB)
            setPriority(Priority.MEDIUM)
            setStatus(TaskStatus.BACKLOG)
            setSelectedAssigneeIds([])
            setEstimatedTime('')
            setSubTasks([])
        }
    }, [initialData, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (initialData) {
                const res = await updateIncidence(initialData.id, {
                    title,
                    description,
                    priority,
                    status: isAdmin ? status : undefined,
                    estimatedTime: estimatedTime ? parseInt(estimatedTime) : undefined,
                    assigneeIds: isAdmin ? selectedAssigneeIds : undefined,
                    subTasks
                })
                if (res.success) {
                    toast.success('Actualizado correctamente')
                    onOpenChange(false)
                    router.refresh()
                } else {
                    toast.error(res.error)
                }
            } else {
                const res = await createIncidence({
                    type,
                    externalId: parseInt(externalId),
                    title,
                    description,
                    tech,
                    priority,
                    estimatedTime: estimatedTime ? parseInt(estimatedTime) : undefined,
                    assigneeIds: selectedAssigneeIds
                })
                if (res.success) {
                    toast.success('Creado correctamente')
                    onOpenChange(false)
                    router.refresh()
                } else {
                    toast.error(res.error)
                }
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const addSubTask = () => {
        if (!newSubTaskTitle.trim()) return
        setSubTasks([...subTasks, { title: newSubTaskTitle, isCompleted: false }])
        setNewSubTaskTitle('')
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto bg-[#121212] border-zinc-800 text-zinc-100 p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-8 pb-4 border-b border-zinc-900">
                        {initialData ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                                    {initialData.type} {initialData.externalId}
                                </span>
                                <SheetTitle className="text-3xl font-bold text-zinc-100 leading-tight tracking-tight">
                                    {initialData.title}
                                </SheetTitle>
                            </div>
                        ) : (
                            <SheetTitle className="text-2xl font-bold text-zinc-100 tracking-tight">Nueva Incidencia Técnica</SheetTitle>
                        )}
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex-1 p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Left Column: Core Data */}
                            <div className="space-y-6">
                                {!initialData && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-500 text-xs font-bold uppercase">Tipo</Label>
                                            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-10"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    {Object.values(TaskType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-zinc-500 text-xs font-bold uppercase">Número de Trámite</Label>
                                            <Input
                                                type="number"
                                                value={externalId}
                                                onChange={e => setExternalId(e.target.value)}
                                                className="bg-zinc-900/50 border-zinc-800 h-10"
                                                placeholder="Ej: 1744"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-zinc-500 text-xs font-bold uppercase">Título Corto</Label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 h-10"
                                        placeholder="Resumen de la tarea"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-500 text-xs font-bold uppercase">Descripción Técnica</Label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 min-h-[180px] font-mono text-sm leading-relaxed"
                                        placeholder="Describe la solución técnica, requerimientos, etc."
                                    />
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-1">
                                        <Info className="h-3 w-3" />
                                        <span>Soporta Markdown: **negrita**, [link](url), - lista</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-xs font-bold uppercase">Prioridad</Label>
                                        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                                            <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                                {Object.values(Priority).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {!initialData && (
                                        <div className="space-y-2">
                                            <Label className="text-zinc-500 text-xs font-bold uppercase">Tecnología</Label>
                                            <Select value={tech} onValueChange={(v) => setTech(v as TechStack)}>
                                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-10"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    {Object.values(TechStack).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {initialData && isAdmin && (
                                        <div className="space-y-2">
                                            <Label className="text-zinc-500 text-xs font-bold uppercase">Estado</Label>
                                            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-10"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    {Object.values(TaskStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-500 text-xs font-bold uppercase">Horas Estimadas</Label>
                                    <Input
                                        type="number"
                                        value={estimatedTime}
                                        onChange={e => setEstimatedTime(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 h-10 w-32"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Right Column: execution and subtasks */}
                            <div className="space-y-8">
                                {/* Preview Section */}
                                {description && (
                                    <div className="space-y-3 p-5 border border-zinc-800/50 rounded-xl bg-zinc-950/50">
                                        <Label className="text-zinc-500 text-xs font-bold uppercase">Vista Previa de Doc</Label>
                                        <MarkdownText content={description} className="text-zinc-400" />
                                    </div>
                                )}

                                {/* SubTasks Section */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-zinc-100 font-bold flex items-center gap-2">
                                            Checklist de Ejecución
                                        </Label>
                                        <span className="text-[10px] text-zinc-500 font-mono">{subTasks.filter(st => st.isCompleted).length}/{subTasks.length} Done</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Añadir paso técnico..."
                                            value={newSubTaskTitle}
                                            onChange={e => setNewSubTaskTitle(e.target.value)}
                                            className="bg-zinc-900/50 border-zinc-800 h-10 text-sm"
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubTask(); } }}
                                        />
                                        <Button type="button" onClick={addSubTask} variant="secondary" className="h-10 px-3"><Plus className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                                        {subTasks.map((st, i) => (
                                            <div key={i} className="flex items-center justify-between group p-3 rounded-lg hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-800/50">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={st.isCompleted}
                                                        onCheckedChange={() => {
                                                            const newSt = [...subTasks];
                                                            newSt[i].isCompleted = !newSt[i].isCompleted;
                                                            setSubTasks(newSt);
                                                        }}
                                                        className="border-zinc-700 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-900"
                                                    />
                                                    <span className={`text-sm ${st.isCompleted ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                                                        {st.title}
                                                    </span>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setSubTasks(subTasks.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 h-6 w-6 text-zinc-600 hover:text-red-400">
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Admin: Assignees */}
                                {isAdmin && (
                                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                                        <Label className="text-zinc-500 text-xs font-bold uppercase">Asignar Equipo</Label>
                                        <div className="grid grid-cols-2 gap-3 p-4 border border-zinc-800/50 rounded-xl bg-zinc-900/20">
                                            {users.filter(u => u.role === 'DEV').map(u => (
                                                <div key={u.id} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`user-${u.id}`}
                                                        checked={selectedAssigneeIds.includes(u.id)}
                                                        onCheckedChange={() => {
                                                            setSelectedAssigneeIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])
                                                        }}
                                                        className="border-zinc-700"
                                                    />
                                                    <label htmlFor={`user-${u.id}`} className="text-xs font-medium text-zinc-400 cursor-pointer hover:text-zinc-200">
                                                        {u.username}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-zinc-900">
                            <Button type="submit" disabled={loading} className="w-full bg-zinc-100 text-zinc-900 hover:bg-white font-bold py-7 rounded-xl text-lg shadow-xl shadow-zinc-900/20">
                                {loading ? 'Procesando...' : (initialData ? 'Confirmar Cambios' : 'Crear Nueva Incidencia')}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
