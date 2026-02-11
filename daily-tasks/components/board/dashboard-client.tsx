'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus, BrainCircuit, User, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { SearchBar } from '@/components/ui/search-bar'
import { FilterChips } from '@/components/ui/filter-chips'
import { TaskStatus, TechStack } from '@/types/enums'
import { useSearchParamsSync } from '@/hooks/useSearchParamsSync'

interface DashboardClientProps {
    backlogTasks: IncidenceWithDetails[]
    kanbanTasks: IncidenceWithDetails[]
    isAdmin: boolean
}

export function DashboardClient({ backlogTasks, kanbanTasks, isAdmin }: DashboardClientProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const [viewMode, setViewMode] = useState<'BACKLOG' | 'KANBAN'>(session?.user?.role === 'DEV' ? 'KANBAN' : 'BACKLOG')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [backlogTasksState, setBacklogTasksState] = useState(backlogTasks)
    const [kanbanTasksState, setKanbanTasksState] = useState(kanbanTasks)
    

    const { params, updateSearch, updateTech, updateStatus, updateAssignee, updateMine, resetFilters, isLoading } = useSearchParamsSync()

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

    const handleTaskUpdate = useCallback((updatedTask: IncidenceWithDetails) => {
        // Update backlog with proper sorting by priority (HIGH > MEDIUM > LOW) and createdAt
        setBacklogTasksState(prev => {
            const updated = prev.map(t => t.id === updatedTask.id ? updatedTask : t)
            return updated.sort((a, b) => {
                const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
                if (priorityDiff !== 0) return priorityDiff
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })
        })
        
        // Update kanban with proper sorting (status -> position -> priority -> createdAt)
        setKanbanTasksState(prev => {
            const updated = prev.map(t => t.id === updatedTask.id ? updatedTask : t)
            return updated.sort((a, b) => {
                // Primary sort: status order (TODO -> IN_PROGRESS -> REVIEW)
                const statusOrder: Record<string, number> = {
                    'TODO': 1, 'IN_PROGRESS': 2, 'REVIEW': 3,
                    'BACKLOG': 0, 'DONE': 4,
                }
                const statusDiff = statusOrder[a.status] - statusOrder[b.status]
                if (statusDiff !== 0) return statusDiff
                
                // Secondary sort: position within column
                const aPosition = a.position ?? 999
                const bPosition = b.position ?? 999
                const positionDiff = aPosition - bPosition
                if (positionDiff !== 0) return positionDiff
                
                // Tertiary sort: priority (HIGH > MEDIUM > LOW)
                const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
                if (priorityDiff !== 0) return priorityDiff
                
                // Final sort: createdAt (oldest first)
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })
        })
    }, [])

    const handleIncidenceCreated = useCallback(() => {
        router.refresh()
    }, [router])

    const handleResetKanbanFilters = useCallback(() => {
        updateTech([])
        updateAssignee([])
    }, [updateTech, updateAssignee])

    const handleViewChange = useCallback((newView: 'BACKLOG' | 'KANBAN') => {
        if (newView === viewMode) return
        setViewMode(newView)
    }, [viewMode])

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
                    </div>
                </div>

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
                        {viewMode === 'BACKLOG' ? 'Backlog' : 'Kanban'}
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

                    {viewMode === 'BACKLOG' && (
                        <>
                            <FilterDropdown
                                icon={<LayoutDashboard className="h-4 w-4" />}
                                label="Estado"
                                options={statusOptions}
                                selectedValues={params.status || []}
                                allValues={statusOptions.map(opt => opt.value)}
                                onValuesChange={updateStatus}
                                resetValue={TaskStatus.BACKLOG}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={params.mine || false}
                                    onCheckedChange={updateMine}
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
                                selectedValues={params.assignee || []}
                                allValues={userOptions.map(opt => opt.value)}
                                onValuesChange={updateAssignee}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={params.mine || false}
                                    onCheckedChange={updateMine}
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
                    <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as 'BACKLOG' | 'KANBAN')}>
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

            <FilterChips
                searchQuery={params.search}
                selectedTech={params.tech}
                selectedStatus={viewMode === 'BACKLOG' ? params.status : []}
                selectedAssignee={viewMode === 'KANBAN' ? params.assignee : []}
                techOptions={techOptions}
                statusOptions={statusOptions}
                assigneeOptions={userOptions}
                onSearchChange={updateSearch}
                onTechChange={updateTech}
                onStatusChange={updateStatus}
                onAssigneeChange={updateAssignee}
                onResetFilters={resetFilters}
            />

            <div className="flex-1 min-h-0 overflow-visible">
                {viewMode === 'BACKLOG' ? (
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
                onTaskUpdate={handleTaskUpdate}
                onIncidenceCreated={handleIncidenceCreated}
                isDev={!isAdmin}
            />
        </div>
    )
}