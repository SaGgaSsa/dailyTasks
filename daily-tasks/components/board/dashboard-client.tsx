'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus, BrainCircuit, User } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
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

export function DashboardClient({ backlogTasks, kanbanTasks, isAdmin }: DashboardClientProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const [viewMode, setViewMode] = useState<'BACKLOG' | 'KANBAN'>(isAdmin ? 'BACKLOG' : 'KANBAN')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [backlogTasksState, setBacklogTasksState] = useState(backlogTasks)
    const [kanbanTasksState, setKanbanTasksState] = useState(kanbanTasks)
    const [searchQuery, setSearchQuery] = useState('')
    const [techFilter, setTechFilter] = useState<string[]>(Object.values(TechStack))
    const [statusFilter, setStatusFilter] = useState<string[]>([TaskStatus.BACKLOG])
    const [onlyMyAssignments, setOnlyMyAssignments] = useState(false)
    const [kanbanOnlyMyAssignments, setKanbanOnlyMyAssignments] = useState(false)
    const [userFilter, setUserFilter] = useState<string[]>([])

    const userId = session?.user?.id ? Number(session.user.id) : undefined

    const userOptions = useMemo(() => {
        interface UserInfo {
            id: number
            name: string
            username: string
            role: string
        }
        const users = new Map<number, UserInfo>()

        const addUsersFromTasks = (tasks: IncidenceWithDetails[]) => {
            tasks.forEach(task => {
                task.assignments
                    .filter(a => a.isAssigned)
                    .forEach(a => {
                        users.set(a.user.id, {
                            id: a.user.id,
                            name: a.user.name || '',
                            username: a.user.username || '',
                            role: a.user.role
                        })
                    })
            })
        }

        addUsersFromTasks(backlogTasks)
        addUsersFromTasks(kanbanTasks)

        return Array.from(users.values())
            .sort((a, b) => {
                if (a.role !== b.role) {
                    return a.role === 'DEV' ? -1 : 1
                }
                const aLabel = a.name || a.username
                const bLabel = b.name || b.username
                return aLabel.localeCompare(bLabel)
            })
            .map(u => ({
                value: String(u.id),
                label: u.name || u.username
            }))
    }, [backlogTasks, kanbanTasks])

    const handleTaskUpdate = useCallback((updatedTask: IncidenceWithDetails) => {
        setBacklogTasksState(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
        setKanbanTasksState(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
    }, [])

    const handleIncidenceCreated = () => {
        router.refresh()
    }

    const handleResetKanbanFilters = () => {
        setSearchQuery('')
        setTechFilter(Object.values(TechStack))
        setUserFilter([])
        setKanbanOnlyMyAssignments(false)
    }

    const handleResetBacklogFilters = () => {
        setSearchQuery('')
        setTechFilter(Object.values(TechStack))
        setStatusFilter([TaskStatus.BACKLOG])
        setOnlyMyAssignments(false)
    }

    if (!isAdmin) {
        return <KanbanBoard initialTasks={kanbanTasksState} onTaskUpdate={handleTaskUpdate} userId={userId} />
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {viewMode === 'BACKLOG' ? 'Backlog' : 'Kanban'}
                    </h2>

                    <Input
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 w-48 h-8 text-sm"
                    />

                    <FilterDropdown
                        icon={<BrainCircuit className="h-4 w-4" />}
                        label="Tecnología"
                        options={techOptions}
                        selectedValues={techFilter}
                        allValues={Object.values(TechStack)}
                        onValuesChange={setTechFilter}
                    />

                    {viewMode === 'BACKLOG' && (
                        <>
                            <FilterDropdown
                                icon={<LayoutDashboard className="h-4 w-4" />}
                                label="Estado"
                                options={statusOptions}
                                selectedValues={statusFilter}
                                allValues={statusOptions.map(o => o.value)}
                                onValuesChange={setStatusFilter}
                                resetValue={TaskStatus.BACKLOG}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={onlyMyAssignments}
                                    onCheckedChange={(checked) => setOnlyMyAssignments(checked === true)}
                                    className="border-zinc-600"
                                />
                                <span className="text-sm text-zinc-400">Mis asignaciones</span>
                            </label>
                        </>
                    )}

                    {viewMode === 'KANBAN' && (
                        <>
                            <FilterDropdown
                                icon={<User className="h-4 w-4" />}
                                label="Usuario"
                                options={userOptions}
                                selectedValues={userFilter}
                                allValues={userOptions.map(o => o.value)}
                                onValuesChange={setUserFilter}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={kanbanOnlyMyAssignments}
                                    onCheckedChange={(checked) => setKanbanOnlyMyAssignments(checked === true)}
                                    className="border-zinc-600"
                                />
                                <span className="text-sm text-zinc-400">Mis asignaciones</span>
                            </label>
                        </>
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

            <div className="flex-1 min-h-0 overflow-visible">
                {viewMode === 'BACKLOG' ? (
                    <Backlog
                        initialTasks={backlogTasksState}
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
                        onResetFilters={handleResetBacklogFilters}
                    />
                ) : (
                    <KanbanBoard
                        initialTasks={kanbanTasksState}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={searchQuery}
                        techFilter={techFilter}
                        userId={userId}
                        userFilter={userFilter}
                        kanbanOnlyMyAssignments={kanbanOnlyMyAssignments}
                        onResetFilters={handleResetKanbanFilters}
                    />
                )}
            </div>

            <IncidenceForm
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setSelectedTask(null)
                }}
                initialData={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                onIncidenceCreated={handleIncidenceCreated}
                isDev={!isAdmin}
            />
        </div>
    )
}
