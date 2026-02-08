'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
    { value: 'ALL', label: 'Todos' },
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
    
    // Filtros del backlog
    const [searchQuery, setSearchQuery] = useState('')
    const [techFilter, setTechFilter] = useState<string[]>((Object.values(TechStack) as string[]))
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [onlyMyAssignments, setOnlyMyAssignments] = useState(false)
    const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false)

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
                    
                    {viewMode === 'BACKLOG' && (
                        <div className="flex items-center gap-3">
                            <Input
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-zinc-100 w-48 h-8 text-sm"
                            />
                            <Popover open={isTechDropdownOpen} onOpenChange={setIsTechDropdownOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm justify-start">
                                        Tecnologia
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800" align="start">
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
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-32 h-8 text-sm">
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
