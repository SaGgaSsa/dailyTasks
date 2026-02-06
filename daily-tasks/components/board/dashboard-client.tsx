'use client'

import { useState } from 'react'
import { KanbanBoard } from '@/components/board/kanban-board'
import { PlanningView } from '@/components/board/planning-view'
import { IncidenceWithDetails } from '@/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutDashboard, ListTodo } from 'lucide-react'

interface DashboardClientProps {
    planningTasks: IncidenceWithDetails[]
    executionTasks: IncidenceWithDetails[]
    isAdmin: boolean
}

export function DashboardClient({ planningTasks, executionTasks, isAdmin }: DashboardClientProps) {
    const [viewMode, setViewMode] = useState<'PLANNING' | 'EXECUTION'>(isAdmin ? 'PLANNING' : 'EXECUTION')

    if (!isAdmin) {
        return <KanbanBoard initialTasks={executionTasks} />
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-end px-1">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="PLANNING" className="data-[state=active]:bg-zinc-800 gap-2">
                            <ListTodo className="h-4 w-4" />
                            Planificación
                        </TabsTrigger>
                        <TabsTrigger value="EXECUTION" className="data-[state=active]:bg-zinc-800 gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Ejecución
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-hidden">
                {viewMode === 'PLANNING' ? (
                    <PlanningView initialTasks={planningTasks} />
                ) : (
                    <KanbanBoard initialTasks={executionTasks} />
                )}
            </div>
        </div>
    )
}
