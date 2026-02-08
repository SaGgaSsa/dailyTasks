'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { IncidenceWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MoreHorizontal, CheckCircle2, Inbox, Clock, User, List, CheckCircle } from 'lucide-react'
import { TaskStatus, TaskType, TechStack } from '@/types/enums'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface BacklogProps {
    initialTasks: IncidenceWithDetails[]
    isSheetOpen?: boolean
    onOpenChange?: (open: boolean) => void
    taskSelect?: (task: IncidenceWithDetails | null) => void
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
}

const statusColors: Record<TaskStatus, string> = {
    BACKLOG: 'bg-zinc-500/10 text-zinc-400 border-zinc-800',
    TODO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DONE: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const typeColors: Record<TaskType, string> = {
    I_MODAPL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const techOptions = [
    { value: 'ALL', label: 'Todas' },
    { value: TechStack.SISA, label: 'SISA' },
    { value: TechStack.WEB, label: 'WEB' },
    { value: TechStack.ANDROID, label: 'ANDROID' },
    { value: TechStack.ANGULAR, label: 'ANGULAR' },
    { value: TechStack.SPRING, label: 'SPRING' },
]

const statusOptions = [
    { value: 'ALL', label: 'Todos' },
    { value: TaskStatus.BACKLOG, label: 'Backlog' },
    { value: TaskStatus.TODO, label: 'Por Hacer' },
    { value: TaskStatus.IN_PROGRESS, label: 'En Progreso' },
    { value: TaskStatus.REVIEW, label: 'Revision' },
    { value: TaskStatus.DONE, label: 'Finalizado' },
]

export function Backlog({ initialTasks, isSheetOpen: externalSheetOpen, onOpenChange, taskSelect, onTaskUpdate }: BacklogProps) {
    const { data: session } = useSession()
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [internalSheetOpen, setInternalSheetOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [techFilter, setTechFilter] = useState<string[]>((Object.values(TechStack) as string[]))
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [onlyMyAssignments, setOnlyMyAssignments] = useState(false)
    const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false)

    const isSheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen
    const setIsSheetOpen = onOpenChange || setInternalSheetOpen

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                `${task.type} ${task.externalId}`.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesTech = techFilter.length === 0 || techFilter.includes(task.technology)
            const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter

            const matchesMyAssignments = !onlyMyAssignments || 
                (session?.user?.id && task.assignees.some(a => a.id === Number(session.user.id)))

            return matchesSearch && matchesTech && matchesStatus && matchesMyAssignments
        })
    }, [tasks, searchQuery, techFilter, statusFilter, onlyMyAssignments, session?.user?.id])

    function handleTaskUpdate(updatedTask: IncidenceWithDetails) {
        setTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask)
        }
    }

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center gap-3 flex-wrap">
                <Input
                    placeholder="Buscar por titulo, descripcion o numero..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 w-64"
                />
                <Popover open={isTechDropdownOpen} onOpenChange={setIsTechDropdownOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-36 justify-start">
                            Tecnologia
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800" align="start">
                        <div className="space-y-1">
                            {techOptions.filter(opt => opt.value !== 'ALL').map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                                    <Checkbox
                                        checked={techFilter.includes(opt.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked === true) {
                                                setTechFilter(prev => [...prev, opt.value])
                                            } else {
                                                setTechFilter(prev => prev.filter(t => t !== opt.value))
                                            }
                                        }}
                                        className="border-zinc-600"
                                    />
                                    <span className="text-sm text-zinc-300">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-36">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                            checked={onlyMyAssignments}
                            onCheckedChange={(checked) => setOnlyMyAssignments(checked === true)}
                            className="border-zinc-600"
                        />
                        <span className="text-sm text-zinc-400">Mis asignaciones</span>
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-auto border border-zinc-900 rounded-2xl bg-[#0F0F0F] shadow-inner">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0F0F0F] border-b border-zinc-900 z-10">
                        <tr>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Identificador</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descripcion</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Estado</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-24 text-center">Prioridad</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-24 text-center">Req.</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Tecnologia</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Colaboradores</th>
                            <th className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-16 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 rounded-full bg-zinc-900/50">
                                            <Inbox className="h-8 w-8 text-zinc-600" />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 font-medium">No se encontraron incidencias</p>
                                            <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className="group hover:bg-zinc-900/40 transition-all cursor-pointer"
                                    onClick={() => {
                                        if (taskSelect) {
                                            taskSelect(task)
                                        }
                                        setIsSheetOpen(true)
                                    }}
                                >
                                    <td className="p-2">
                                        <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-zinc-900/50 ${typeColors[task.type]}`}>
                                            {task.type} {task.externalId}
                                        </Badge>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center gap-3 max-w-lg">
                                            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                                                {task.title}
                                            </span>
                                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
                                                {task.estimatedTime && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-zinc-400">{task.estimatedTime}h</span>
                                                        <span>estimadas</span>
                                                    </span>
                                                )}
                                                {task.subTasks.length > 0 && (
                                                    (() => {
                                                        const completed = task.subTasks.filter(st => st.isCompleted).length
                                                        const total = task.subTasks.length
                                                        const isAllCompleted = completed === total
                                                        return (
                                                            <span className={`flex items-center gap-1 ${isAllCompleted ? 'text-green-400' : ''}`}>
                                                                {isAllCompleted ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        <span>completado</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-zinc-400">
                                                                            {completed}/{total}
                                                                        </span>
                                                                        <span>pendientes</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        )
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex justify-center">
                                            <Badge variant="outline" className={`text-[9px] py-0.5 font-bold border-none uppercase tracking-tighter ${statusColors[task.status]}`}>
                                                {task.status}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center">
                                        <Badge variant="outline" className={`text-[9px] py-0.5 font-bold border-none uppercase tracking-tighter ${
                                            task.priority === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            task.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                            'bg-green-500/10 text-green-400 border-green-500/20'
                                        }`}>
                                            {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                        </Badge>
                                    </td>
                                    <td className="p-2">
                                        <TooltipProvider>
                                            <div className="flex items-center justify-center gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={(task.estimatedTime ?? 0) > 0 ? 'text-zinc-600' : 'text-orange-500'}>
                                                            {(task.estimatedTime ?? 0) > 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{(task.estimatedTime ?? 0) > 0 ? 'Horas asignadas' : 'Falta estimar horas'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={task.assignees.length > 0 ? 'text-zinc-600' : 'text-orange-500'}>
                                                            {task.assignees.length > 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{task.assignees.length > 0 ? 'Equipo asignado' : 'Falta asignar equipo'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={task.subTasks.length > 0 ? 'text-zinc-600' : 'text-orange-500'}>
                                                            {task.subTasks.length > 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{task.subTasks.length > 0 ? 'Checklist creado' : 'Falta crear checklist'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-900/30 px-2 py-1 rounded">
                                            {task.technology}
                                        </span>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {task.assignees.map((user) => (
                                                <UserAvatar 
                                                    key={user.id} 
                                                    username={user.username} 
                                                    className="h-6 w-6 border-2 border-[#0F0F0F] ring-1 ring-zinc-800 text-[9px]" 
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-2 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
