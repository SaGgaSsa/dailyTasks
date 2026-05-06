'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { BoardColumn } from './board-column'
import { TaskCard } from './task-card'
import { IncidenceWithDetails } from '@/types'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateIncidenceStatus, updateTaskOrder } from '@/app/actions/incidence-actions'
import { TaskStatus } from '@/types/enums'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'

interface KanbanBoardProps {
    initialTasks: IncidenceWithDetails[]
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
    searchQuery?: string
    techFilter?: string[]
    userId?: number
    userFilter?: string[]
    kanbanOnlyMyAssignments?: boolean
    onResetFilters?: () => void
    isDev?: boolean
    onCardClick?: (task: IncidenceWithDetails) => void
}

export function KanbanBoard({ initialTasks, onTaskUpdate, searchQuery = '', techFilter = [], userId, userFilter = [], kanbanOnlyMyAssignments = false, onResetFilters, isDev = false, onCardClick }: KanbanBoardProps) {
    const { t, locale } = useI18n()
    const router = useRouter()
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [activeTask, setActiveTask] = useState<IncidenceWithDetails | null>(null)
    const initialTasksRef = useRef(initialTasks)

    const COLUMNS = useMemo(() => [
        { id: TaskStatus.TODO, title: t.kanban.toDo },
        { id: TaskStatus.IN_PROGRESS, title: t.kanban.inProgress },
        { id: TaskStatus.REVIEW, title: t.kanban.review },
    ], [t.kanban])

    // Solo actualizar estado cuando initialTasks cambie realmente (no en cada render)
    useEffect(() => {
        if (JSON.stringify(initialTasksRef.current) !== JSON.stringify(initialTasks)) {
            initialTasksRef.current = initialTasks
            setTasks(initialTasks)
        }
    }, [initialTasks])

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.comment && task.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
                `${task.externalWorkItem?.type ?? ''} ${task.externalWorkItem?.externalId ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesTech = techFilter.length === 0 || techFilter.includes(String(task.technology?.id))

            const matchesUserFilter = userFilter.length === 0 || task.assignments.some(a => a.userId === Number(userId) || userFilter.includes(String(a.userId)))

            return matchesSearch && matchesTech && matchesUserFilter
        })
    }, [tasks, searchQuery, techFilter, userId, userFilter])

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            const prioOrder: Record<string, number> = { BLOCKER: -1, HIGH: 0, MEDIUM: 1, LOW: 2 };
            const aPri = prioOrder[a.priority] ?? 9;
            const bPri = prioOrder[b.priority] ?? 9;
            if (aPri !== bPri) return aPri - bPri;
            return (a.position || 0) - (b.position || 0);
        });
    }, [filteredTasks])

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
        const task = tasks.find((t) => t.id === Number(active.id))
        if (task) setActiveTask(task)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over) {
            setActiveTask(null)
            return
        }

        const activeId = Number(active.id)
        const overId = over.id

        // Buscar la tarea en el estado actual (puede haber sido modificada por handleDragOver)
        const currentTask = tasks.find((t) => t.id === activeId)
        if (!currentTask) return

        // Guardar el estado original antes de cualquier optimistic update
        const originalTask = initialTasks.find((t) => t.id === activeId)
        const originalStatus = originalTask?.status || currentTask.status

        // Check if dropping over a column or a task
        const isOverColumn = COLUMNS.some(col => col.id === (overId as TaskStatus))

        if (isOverColumn) {
            // Dropping directly on a column - update status
            const newStatus = overId as TaskStatus
            if (originalStatus !== newStatus) {
                // Calcular posición al final de la columna destino
                const columnTasks = tasks.filter(t => t.status === newStatus)
                const lastPos = columnTasks.length > 0 
                    ? Math.max(...columnTasks.map(t => t.position || 0))
                    : 0
                const newPosition = lastPos + 100
                
                // Optimistic update
                setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, status: newStatus, position: newPosition } : t))
                
                const result = await updateIncidenceStatus(currentTask.id, newStatus, newPosition, locale)
                if (!result.success && result.error) {
                    toast.error(result.error)
                    setTasks(prev => prev.map(t =>
                        t.id === currentTask.id ? { ...t, status: originalStatus } : t
                    ))
                }
            }
        } else {
            // Dropping over another task - could be reorder or column change
            const overTask = tasks.find(t => t.id === Number(overId))
            if (!overTask) {
                setActiveTask(null)
                return
            }

            const newStatus = overTask.status

            if (originalStatus !== newStatus) {
                // Moving to different column - calcular posición basada en la tarea objetivo
                const columnTasks = tasks.filter(t => t.status === newStatus)
                const overIndex = columnTasks.findIndex(t => t.id === overTask.id)
                
                let newPosition: number
                if (overIndex === -1 || columnTasks.length === 0) {
                    // Si no se encuentra o la columna está vacía, al final
                    newPosition = 100
                } else if (overIndex === 0) {
                    // Al principio de la columna
                    const firstPos = columnTasks[0].position || 0
                    newPosition = firstPos - 100
                } else {
                    // Entre la tarea anterior y la objetivo
                    const prevPos = columnTasks[overIndex - 1].position || 0
                    const overPos = columnTasks[overIndex].position || 0
                    newPosition = (prevPos + overPos) / 2
                }
                
                // Optimistic update
                setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, status: newStatus, position: newPosition } : t))
                
                const result = await updateIncidenceStatus(currentTask.id, newStatus, newPosition, locale)
                if (!result.success && result.error) {
                    toast.error(result.error)
                    setTasks(prev => prev.map(t =>
                        t.id === currentTask.id ? { ...t, status: originalStatus } : t
                    ))
                }
            } else {
                // Same column - check if same priority group
                if (currentTask.priority === overTask.priority) {
                    // Reordering within same priority group
                    const result = await updateTaskOrder({
                        taskId: currentTask.id,
                        overTaskId: overTask.id
                    }, locale)
                    if (!result.success && result.error) {
                        toast.error(result.error)
                    }
                } else {
                    // Different priority - this shouldn't happen visually but handle gracefully
                    toast.info('Las tareas se mantienen agrupadas por prioridad')
                }
            }
        }

        setActiveTask(null)
    }

    function handleCardClick(task: IncidenceWithDetails) {
        if (onCardClick) {
            onCardClick(task)
        } else {
            router.push(`/incidences/${task.id}`)
        }
    }

    function handleTaskUpdate(updatedTask: IncidenceWithDetails) {
        setTasks(prev => {
            const exists = prev.some(t => t.id === updatedTask.id)
            if (!exists && updatedTask.status !== 'BACKLOG') {
                return [...prev, updatedTask]
            }
            return prev.map(t =>
                t.id === updatedTask.id ? updatedTask : t
            )
        })
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask)
        }
    }



    if (filteredTasks.length === 0) {
        return (
            <div className="flex flex-col items-center pt-8">
                <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-muted/50">
                        <Inbox className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-muted-foreground font-medium">{t.incidences.noIncidences}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full min-h-0 gap-6 overflow-x-auto overflow-y-hidden pb-4">
                    {COLUMNS.map((col) => (
                        <BoardColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tasks={sortedTasks.filter(t => t.status === col.id)}
                            onCardClick={handleCardClick}
                            canDrag={!isDev}
                            isDev={isDev}
                        />
                    ))}
            </div>

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
