'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus, BrainCircuit, User, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { SearchBar } from '@/components/ui/search-bar'
import { FilterChips } from '@/components/ui/filter-chips'
import { TaskStatus, TechStack } from '@/types/enums'
import { useSearchParamsSync } from '@/hooks/useSearchParamsSync'
import { getIncidences } from '@/app/actions/incidence-actions'

interface DashboardClientProps {
    view: 'BACKLOG' | 'KANBAN'
    backlogTasks: IncidenceWithDetails[]
    kanbanTasks: IncidenceWithDetails[]
    isAdmin: boolean
}

export function DashboardClient({ view, backlogTasks, kanbanTasks, isAdmin }: DashboardClientProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [backlogTasksState, setBacklogTasksState] = useState<IncidenceWithDetails[]>(backlogTasks)
    const [kanbanTasksState, setKanbanTasksState] = useState<IncidenceWithDetails[]>(kanbanTasks)

    const { params, updateSearch, updateTech, updateStatus, updateAssignee, updateMine, updateView, resetFilters, isLoading } = useSearchParamsSync()

    useEffect(() => {
        setBacklogTasksState(backlogTasks)
    }, [backlogTasks])

    useEffect(() => {
        setKanbanTasksState(kanbanTasks)
    }, [kanbanTasks])

    const userId = session?.user?.id ? Number(session.user.id) : undefined

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

    const handleTaskUpdate = useCallback(async () => {
        const currentView = view === 'BACKLOG' ? 'BACKLOG' : 'KANBAN'
        const tech = params.tech || []
        const status = params.status || []
        const assignee = params.assignee || []
        
        const newTasks = await getIncidences({
            viewType: currentView,
            search: params.search || '',
            tech,
            status: status.join(','),
            assignee,
            mine: params.mine || false
        })

        if (currentView === 'BACKLOG') {
            setBacklogTasksState(newTasks)
        } else {
            setKanbanTasksState(newTasks)
        }
    }, [view, params])

    const handleIncidenceCreated = useCallback(() => {
        router.refresh()
    }, [router])

    const handleResetKanbanFilters = useCallback(() => {
        updateTech([])
        updateAssignee([])
    }, [updateTech, updateAssignee])

    const handleViewChange = useCallback((newView: 'backlog' | 'kanban') => {
        if ((newView === 'backlog' && view === 'BACKLOG') || (newView === 'kanban' && view === 'KANBAN')) return
        updateView(newView)
    }, [view, updateView])

    const handleResetBacklogFilters = useCallback(() => {
        updateTech([])
        updateStatus([])
        updateAssignee([])
    }, [updateTech, updateStatus, updateAssignee])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                <div className="text-zinc-400">Cargando...</div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col h-full space-y-4">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Kanban
                            <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">
                                {kanbanTasksState.length}
                            </Badge>
                        </h2>

                        <SearchBar
                            value={params.search || ''}
                            onChange={updateSearch}
                            className="w-48"
                        />

                        <FilterDropdown
                            icon={<BrainCircuit className="h-4 w-4" />}
                            label="Tecnología"
                            options={techOptions}
                            selectedValues={params.tech || []}
                            allValues={Object.values(TechStack)}
                            onValuesChange={updateTech}
                        />

                        <FilterDropdown
                            icon={<User className="h-4 w-4" />}
                            label="Usuario"
                            options={userOptions}
                            selectedValues={params.assignee || []}
                            allValues={userOptions.map(opt => opt.value)}
                            onValuesChange={updateAssignee}
                        />
                    </div>
                </div>

                <FilterChips
                    searchQuery={params.search}
                    selectedTech={params.tech}
                    selectedStatus={[]}
                    selectedAssignee={params.assignee || []}
                    techOptions={techOptions}
                    statusOptions={statusOptions}
                    assigneeOptions={userOptions}
                    onSearchChange={updateSearch}
                    onTechChange={updateTech}
                    onStatusChange={() => {}}
                    onAssigneeChange={updateAssignee}
                    onResetFilters={() => {
                        updateSearch('')
                        updateTech([])
                        updateAssignee([])
                    }}
                />

                <div className="flex-1 min-h-0 overflow-visible">
                    <KanbanBoard
                        initialTasks={kanbanTasksState}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={params.search || ''}
                        techFilter={params.tech || []}
                        userId={userId}
                        userFilter={params.assignee || []}
                        kanbanOnlyMyAssignments={false}
                        onResetFilters={handleResetKanbanFilters}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {view === 'BACKLOG' ? 'Backlog' : 'Kanban'}
                        <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">
                            {view === 'BACKLOG' ? backlogTasksState.length : kanbanTasksState.length}
                        </Badge>
                    </h2>

                    <SearchBar
                        value={params.search || ''}
                        onChange={updateSearch}
                        className="w-48"
                    />

                    <FilterDropdown
                        icon={<BrainCircuit className="h-4 w-4" />}
                        label="Tecnología"
                        options={techOptions}
                        selectedValues={params.tech || []}
                        allValues={Object.values(TechStack)}
                        onValuesChange={updateTech}
                    />

                    {view === 'BACKLOG' && (
                        <FilterDropdown
                            icon={<LayoutDashboard className="h-4 w-4" />}
                            label="Estado"
                            options={statusOptions}
                            selectedValues={params.status || []}
                            allValues={statusOptions.map(opt => opt.value)}
                            onValuesChange={updateStatus}
                            resetValue={TaskStatus.BACKLOG}
                        />
                    )}

                    <FilterDropdown
                        icon={<User className="h-4 w-4" />}
                        label="Usuario"
                        options={userOptions}
                        selectedValues={params.assignee || []}
                        allValues={userOptions.map(opt => opt.value)}
                        onValuesChange={updateAssignee}
                    />
                </div>

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={params.mine || false}
                                onCheckedChange={updateMine}
                                className="border-zinc-600"
                            />
                            <span className="text-sm text-zinc-400">Mis asignaciones</span>
                        </label>
                    )}
                    {view === 'BACKLOG' && (
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
                    <Tabs value={view.toLowerCase()} onValueChange={(v) => handleViewChange(v as 'backlog' | 'kanban')}>
                        <TabsList className="bg-zinc-900 border border-zinc-800 h-8">
                            <TabsTrigger value="backlog" className="data-[state=active]:bg-zinc-800 px-3">
                                <ListTodo className="h-4 w-4" />
                            </TabsTrigger>
                            <TabsTrigger value="kanban" className="data-[state=active]:bg-zinc-800 px-3">
                                <LayoutDashboard className="h-4 w-4" />
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <FilterChips
                searchQuery={params.search}
                selectedTech={params.tech}
                selectedStatus={view === 'BACKLOG' ? params.status : []}
                selectedAssignee={params.assignee || []}
                techOptions={techOptions}
                statusOptions={statusOptions}
                assigneeOptions={userOptions}
                onSearchChange={updateSearch}
                onTechChange={updateTech}
                onStatusChange={updateStatus}
                onAssigneeChange={updateAssignee}
                onResetFilters={resetFilters}
            />

            <div className="flex-1 min-h-0 overflow-hidden">
                {view === 'BACKLOG' ? (
                    <Backlog
                        initialTasks={backlogTasksState}
                        isSheetOpen={isSheetOpen}
                        onOpenChange={setIsSheetOpen}
                        taskSelect={setSelectedTask}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={params.search || ''}
                        setSearchQuery={updateSearch}
                        techFilter={params.tech || []}
                        setTechFilter={updateTech}
                        statusFilter={params.status || []}
                        setStatusFilter={updateStatus}
                        onlyMyAssignments={params.mine || false}
                        setOnlyMyAssignments={updateMine}
                        onResetFilters={handleResetBacklogFilters}
                    />
                ) : (
                    <KanbanBoard
                        initialTasks={kanbanTasksState}
                        onTaskUpdate={handleTaskUpdate}
                        searchQuery={params.search || ''}
                        techFilter={params.tech || []}
                        userId={userId}
                        userFilter={params.assignee || []}
                        kanbanOnlyMyAssignments={params.mine || false}
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
                type={selectedTask?.type}
                externalId={selectedTask?.externalId}
                onTaskUpdate={handleTaskUpdate}
                onIncidenceCreated={handleIncidenceCreated}
                isDev={!isAdmin}
            />
        </div>
    )
}
