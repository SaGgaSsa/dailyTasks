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
    canDrag?: boolean
}

export function BoardColumn({ id, title, tasks, onCardClick, canDrag = true }: BoardColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: 'Column',
            columnId: id,
        },
    })

    const sortableItems = tasks.map((t) => t.id)

    return (
        <div className="flex flex-col flex-1 min-w-[300px] h-full bg-muted/30 rounded-xl overflow-hidden">
            <div className="p-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">{title}</h3>
                    <span className="text-muted-foreground/50 text-[11px] font-medium">
                        {tasks.length}
                    </span>
                </div>
                <ColumnAction status={id} />
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col px-3 py-2 min-h-[500px] transition-colors ${isOver ? 'bg-accent/30' : ''}`}
            >
                <div className="flex-1">
                    <SortableContext
                        items={sortableItems}
                        strategy={verticalListSortingStrategy}
                    >
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onCardClick(task)}
                                canDrag={canDrag}
                            />
                        ))}
                    </SortableContext>
                    {tasks.length === 0 && (
                        <div className="h-full min-h-[100px] border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                            Arrastra aquí
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
