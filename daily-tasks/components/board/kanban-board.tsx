'use client'

import { useState } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BoardColumn } from './board-column'
import { TaskCard } from './task-card'
import { IncidenceForm } from './incidence-form'
import { IncidenceWithDetails } from '@/types'
import { updateIncidenceStatus } from '@/app/actions/incidence-actions'
import { TaskStatus } from '@/types/enums'

interface KanbanBoardProps {
    initialTasks: IncidenceWithDetails[]
}

const COLUMNS = [
    { id: TaskStatus.TODO, title: 'Por Hacer' },
    { id: TaskStatus.IN_PROGRESS, title: 'En Progreso' },
    { id: TaskStatus.REVIEW, title: 'Revisión' },
]

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [activeTask, setActiveTask] = useState<IncidenceWithDetails | null>(null)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragStart(event: DragStartEvent) {
        const { active } = event
        const task = tasks.find((t) => t.id === active.id)
        if (task) setActiveTask(task)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveATask = !!active.data.current?.task
        const isOverATask = !!over.data.current?.task

        if (!isActiveATask) return

        const activeIndex = tasks.findIndex((t) => t.id === activeId)
        if (activeIndex === -1) return

        if (isOverATask) {
            const overIndex = tasks.findIndex((t) => t.id === overId)
            if (overIndex === -1) return

            if (tasks[activeIndex].status !== tasks[overIndex].status) {
                setTasks((prev) => {
                    const newTasks = [...prev]
                    newTasks[activeIndex] = {
                        ...newTasks[activeIndex],
                        status: prev[overIndex].status
                    }
                    return arrayMove(newTasks, activeIndex, overIndex)
                })
            } else {
                setTasks((prev) => arrayMove(prev, activeIndex, overIndex))
            }
        }

        const isOverAColumn = COLUMNS.some((col) => col.id === overId)
        if (isOverAColumn) {
            if (tasks[activeIndex].status !== overId) {
                setTasks((prev) => {
                    const newTasks = [...prev]
                    newTasks[activeIndex] = {
                        ...newTasks[activeIndex],
                        status: overId as TaskStatus
                    }
                    return arrayMove(newTasks, activeIndex, activeIndex)
                })
            }
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over) {
            setActiveTask(null)
            return
        }

        const task = tasks.find((t) => t.id === active.id)
        if (task) {
            await updateIncidenceStatus(task.id, task.status, tasks.indexOf(task))
        }

        setActiveTask(null)
    }

    function handleCardClick(task: IncidenceWithDetails) {
        setSelectedTask(task)
        setIsSheetOpen(true)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-6 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <BoardColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={tasks.filter((t) => t.status === col.id)}
                        onCardClick={handleCardClick}
                    />
                ))}
            </div>

            <IncidenceForm
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setSelectedTask(null)
                }}
                initialData={selectedTask}
            />

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeTask ? <TaskCard task={activeTask} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
