'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus, BrainCircuit } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStatus, TechStack } from '@/types/enums'

interface DashboardClientProps {
    backlogTasks: IncidenceWithDetails[]
    kanbanTasks: IncidenceWithDetails[]
    isAdmin: boolean
}

const techOptions = [
    { value: TechStack.SISA, label: 'SISA' },
    { value: TechStack.WEB, label: 'WEB' },
    { value: TechStack.ANDROID, label: 'ANDROID' },
    { value: TechStack.ANGULAR, label: 'ANGULAR' },
    { value: TechStack.SPRING, label: 'SPRING' },
]

const statusOptions = [
    { value: TaskStatus.BACKLOG, label: 'Backlog' },
    { value: TaskStatus.TODO, label: 'Por Hacer' },
    { value: TaskStatus.IN_PROGRESS, label: 'En Progreso' },
    { value: TaskStatus.REVIEW, label: 'Revision' },
    { value: TaskStatus.DONE, label: 'Finalizado' },
]

export function DashboardClient({ backlogTasks: initialBacklogTasks, kanbanTasks: initialKanbanTasks, isAdmin }: DashboardClientProps) {
    const router = useRouter()
    const [viewMode, setViewMode] = useState<'BACKLOG' | 'KANBAN'>(isAdmin ? 'BACKLOG' : 'KANBAN')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [backlogTasks, setBacklogTasks] = useState(initialBacklogTasks)
    const [kanbanTasks, setKanbanTasks] = useState(initialKanbanTasks)
    
    // Filtros compartidos
    const [searchQuery, setSearchQuery] = useState('')
    const [techFilter, setTechFilter] = useState<string[]>((Object.values(TechStack) as string[]))
    const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false)
    
    // Filtros solo para backlog
    const [statusFilter, setStatusFilter] = useState<string[]>([
        TaskStatus.BACKLOG,
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
        TaskStatus.REVIEW,
        TaskStatus.DONE
    ])
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
    const [onlyMyAssignments, setOnlyMyAssignments] = useState(false)

    useEffect(() => {
        setBacklogTasks(initialBacklogTasks)
        setKanbanTasks(initialKanbanTasks)
    }, [initialBacklogTasks, initialKanbanTasks])

    const handleBacklogUpdate = (updatedTask: IncidenceWithDetails) => {
        setBacklogTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
    }

    const handleTaskUpdate = (updatedTask: IncidenceWithDetails) => {
        setBacklogTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
        setKanbanTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
    }

    const handleIncidenceCreated = () => {
        router.refresh()
    }

    if (!isAdmin) {
        return <KanbanBoard initialTasks={kanbanTasks} onTaskUpdate={handleTaskUpdate} />
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header con título, filtros y tabs */}
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {viewMode === 'BACKLOG' ? 'Backlog' : 'Kanban'}
                    </h2>
                    
                    {/* Filtros compartidos: Buscar y Tecnologia */}
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 w-48 h-8 text-sm"
                        />
                        <Popover open={isTechDropdownOpen} onOpenChange={setIsTechDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm justify-start border-dashed">
                                    <BrainCircuit className="h-4 w-4" />
                                    {techFilter.length > 0 && techFilter.length < Object.values(TechStack).length && (
                                        <>
                                            <Separator orientation="vertical" className="mx-2 h-4" />
                                            <div className="hidden space-x-1 lg:flex">
                                                {techFilter.length > 2 ? (
                                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                        {techFilter.length} seleccionados
                                                    </Badge>
                                                ) : (
                                                    techFilter.map(value => (
                                                        <Badge variant="secondary" key={value} className="rounded-sm px-1 font-normal">
                                                            {techOptions.find(o => o.value === value)?.label || value}
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800" align="start">
                                {techFilter.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTechFilter(Object.values(TechStack) as string[])}
                                        className="w-full mb-2 h-7 text-xs text-zinc-400 hover:text-zinc-200"
                                    >
                                        Limpiar filtros
                                    </Button>
                                )}
                                <div className="space-y-1">
                                    {techOptions.map(opt => (
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
                    </div>

                    {/* Filtros solo para Backlog: Estado y Mis asignaciones */}
                    {viewMode === 'BACKLOG' && (
                        <div className="flex items-center gap-3">
                            <Popover open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm justify-start border-dashed">
                                        <LayoutDashboard className="h-4 w-4" />
                                        {statusFilter.length > 0 && statusFilter.length < statusOptions.length && (
                                            <>
                                                <Separator orientation="vertical" className="mx-2 h-4" />
                                                <div className="hidden space-x-1 lg:flex">
                                                    {statusFilter.length > 2 ? (
                                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                            {statusFilter.length} seleccionados
                                                        </Badge>
                                                    ) : (
                                                        statusFilter.map(value => (
                                                            <Badge variant="secondary" key={value} className="rounded-sm px-1 font-normal">
                                                                {statusOptions.find(o => o.value === value)?.label || value}
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800" align="start">
                                    {statusFilter.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setStatusFilter([
                                                TaskStatus.BACKLOG,
                                                TaskStatus.TODO,
                                                TaskStatus.IN_PROGRESS,
                                                TaskStatus.REVIEW,
                                                TaskStatus.DONE
                                            ])}
                                            className="w-full mb-2 h-7 text-xs text-zinc-400 hover:text-zinc-200"
                                        >
                                            Limpiar filtros
                                        </Button>
                                    )}
                                    <div className="space-y-1">
                                        {statusOptions.map(opt => (
                                            <label key={opt.value} className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                                                <Checkbox
                                                    checked={statusFilter.includes(opt.value)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked === true) {
                                                            setStatusFilter(prev => [...prev, opt.value])
                                                        } else {
                                                            setStatusFilter(prev => prev.filter(t => t !== opt.value))
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
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={onlyMyAssignments}
                                    onCheckedChange={(checked) => setOnlyMyAssignments(checked === true)}
                                    className="border-zinc-600"
                                />
                                <span className="text-sm text-zinc-400">Mis asignaciones</span>
                            </label>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {viewMode === 'BACKLOG' && (
                        <Button 
                            onClick={() => {
                                setSelectedTask(null)
                                setIsSheetOpen(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'BACKLOG' | 'KANBAN')}>
                        <TabsList className="bg-zinc-900 border border-zinc-800 h-8">
                            <TabsTrigger value="BACKLOG" className="data-[state=active]:bg-zinc-800 px-3">
                                <ListTodo className="h-4 w-4" />
                            </TabsTrigger>
                            <TabsTrigger value="KANBAN" className="data-[state=active]:bg-zinc-800 px-3">
                                <LayoutDashboard className="h-4 w-4" />
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-h-0 overflow-visible">
                {viewMode === 'BACKLOG' ? (
                    <Backlog 
                        initialTasks={backlogTasks}
                        isSheetOpen={isSheetOpen}
                        onOpenChange={setIsSheetOpen}
                        taskSelect={setSelectedTask}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        techFilter={techFilter}
                        setTechFilter={setTechFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onlyMyAssignments={onlyMyAssignments}
                        setOnlyMyAssignments={setOnlyMyAssignments}
                    />
                ) : (
                    <KanbanBoard 
                        initialTasks={kanbanTasks}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={searchQuery}
                        techFilter={techFilter}
                    />
                )}
            </div>

            {/* Formulario compartido */}
            <IncidenceForm
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setSelectedTask(null)
                }}
                initialData={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                onIncidenceCreated={handleIncidenceCreated}
            />
        </div>
    )
}
