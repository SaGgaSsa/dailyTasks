'use client'

import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { ColumnAction } from './column-action'
import { IncidenceWithDetails } from '@/types'

interface BoardColumnProps {
    id: string
    title: string
    tasks: IncidenceWithDetails[]
    onCardClick: (task: IncidenceWithDetails) => void
}

export function BoardColumn({ id, title, tasks, onCardClick }: BoardColumnProps) {
    const { setNodeRef } = useDroppable({
        id,
    })

    const sortableItems = tasks.length > 0 
        ? tasks.map((t) => t.id) 
        : [id] // Placeholder para permitir drop en columnas vacías

    return (
        <div className="flex flex-col flex-1 min-w-[300px] h-full bg-zinc-900/30 rounded-xl overflow-hidden">
            <div className="p-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-xs text-zinc-400 uppercase tracking-wider">{title}</h3>
                    <span className="text-zinc-600 text-[11px] font-medium">
                        {tasks.length}
                    </span>
                </div>
                <ColumnAction status={id} />
            </div>

            <div
                ref={setNodeRef}
                className="flex-1 px-3 overflow-y-auto"
            >
                <SortableContext
                    items={sortableItems}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onClick={() => onCardClick(task)}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
