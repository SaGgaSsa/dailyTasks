'use client'

import { useState } from 'react'
import { KanbanBoard } from '@/components/board/kanban-board'
import { Backlog } from '@/components/board/backlog'
import { IncidenceWithDetails } from '@/types'
import { LayoutDashboard, ListTodo, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenceForm } from './incidence-form'
import { Button } from '@/components/ui/button'

interface DashboardClientProps {
    backlogTasks: IncidenceWithDetails[]
    kanbanTasks: IncidenceWithDetails[]
    isAdmin: boolean
}

export function DashboardClient({ backlogTasks, kanbanTasks, isAdmin }: DashboardClientProps) {
    const [viewMode, setViewMode] = useState<'BACKLOG' | 'KANBAN'>(isAdmin ? 'BACKLOG' : 'KANBAN')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)

    if (!isAdmin) {
        return <KanbanBoard initialTasks={kanbanTasks} />
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header con título y tabs */}
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {viewMode === 'BACKLOG' ? 'Backlog' : 'Kanban'}
                </h2>
                
                <div className="flex items-center gap-3">
                    {viewMode === 'BACKLOG' && (
                        <Button 
                            onClick={() => {
                                setSelectedTask(null)
                                setIsSheetOpen(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Incidencia
                        </Button>
                    )}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'BACKLOG' | 'KANBAN')}>
                        <TabsList className="bg-zinc-900 border border-zinc-800 h-9">
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
            <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === 'BACKLOG' ? (
                    <Backlog 
                        initialTasks={backlogTasks} 
                        isSheetOpen={isSheetOpen}
                        onSheetOpenChange={setIsSheetOpen}
                        onTaskSelect={setSelectedTask}
                    />
                ) : (
                    <KanbanBoard initialTasks={kanbanTasks} />
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
            />
        </div>
    )
}
