'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IncidenceWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { CheckCircle2, Inbox, Clock, User, List, CheckCircle, GripVertical } from 'lucide-react'
import { TaskStatus, TaskType } from '@/types/enums'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { calculateCompletedHours, formatHoursDisplay, isFullyCompleted } from '@/lib/hours-calculation'
import { useI18n } from '@/components/providers/i18n-provider'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateTaskOrder } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'
import { DataTableRowActions } from '@/components/backlog/data-table-row-actions'

interface BacklogProps {
    initialTasks: IncidenceWithDetails[]
    isSheetOpen?: boolean
    onOpenChange?: (open: boolean) => void
    taskSelect?: (task: IncidenceWithDetails | null) => void
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    techFilter: string[]
    setTechFilter: (filter: string[]) => void
    statusFilter: string[]
    setStatusFilter: (filter: string[]) => void
    onlyMyAssignments: boolean
    setOnlyMyAssignments: (value: boolean) => void
    onResetFilters?: () => void
}

const statusColors: Record<TaskStatus, string> = {
    BACKLOG: 'bg-muted text-muted-foreground border-border',
    TODO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DONE: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const typeColors: Record<TaskType, string> = {
    I_MODAPL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const defaultPriorityLabels: Record<string, string> = {
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
}

interface SortableRowProps {
    row: any
    onClick: () => void
}

function SortableRow({ row, onClick }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.original.id, data: { task: row.original } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${isDragging ? 'bg-accent/80' : ''}`}
            onClick={onClick}
            {...attributes}
        >
            {row.getVisibleCells().map((cell: any) => {
                const widthClass = cell.column.id === 'drag-handle' ? 'w-10' :
                    cell.column.id === 'type' ? 'w-32 text-center' :
                    cell.column.id === 'title' ? 'w-auto min-w-0' :
                    cell.column.id === 'priority' ? 'w-20' :
                    cell.column.id === 'status' ? 'w-24' :
                    cell.column.id === 'requirements' ? 'w-20' :
                    cell.column.id === 'technology' ? 'w-16' :
                    cell.column.id === 'assignees' ? 'w-16' :
                    cell.column.id === 'actions' ? 'w-14' : ''
                const extraClass = cell.column.id === 'title' ? 'min-w-0' : ''
                const isDragHandle = cell.column.id === 'drag-handle'
                return (
                    <TableCell 
                        key={cell.id} 
                        className={`py-3 px-2 ${widthClass} ${extraClass}`.trim()}
                        {...(isDragHandle ? { 
                            ...listeners,
                            onClick: (e: React.MouseEvent) => {
                                e.stopPropagation()
                            }
                        } : {})}
                    >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )
            })}
        </TableRow>
    )
}

const columns: ColumnDef<IncidenceWithDetails>[] = [
    {
        id: 'drag-handle',
        header: () => null,
        cell: ({ row }) => {
            return (
                <div className="flex items-center justify-center">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                </div>
            )
        },
        size: 40,
    },
    {
        accessorKey: 'type',
        header: () => <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Tramite</div>,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-muted whitespace-nowrap ${typeColors[row.original.type]}`}>
                    {row.original.type} {row.original.externalId}
                </Badge>
            </div>
        ),
    },
    {
        accessorKey: 'title',
        header: () => <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detalle</div>,
        cell: ({ row }) => {
            const title = row.original.title
            const totalHours = row.original.estimatedTime || 0
            const completedHours = calculateCompletedHours(row.original)
            const isComplete = isFullyCompleted(completedHours, row.original.estimatedTime)
            
            const allTasks = row.original.assignments.flatMap(a => a.tasks)
            const pendingTasks = allTasks.filter(t => !t.isCompleted)
            const hasTasks = allTasks.length > 0
            
            return (
                <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm text-foreground font-medium flex-1 truncate" title={title}>
                        {title}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                        {hasTasks && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {pendingTasks.length}/{allTasks.length} pendientes
                            </span>
                        )}
                        <span className={`text-xs whitespace-nowrap ${isComplete ? 'text-green-400' : 'text-muted-foreground'}`}>
                            {formatHoursDisplay(completedHours, totalHours)}
                            {isComplete && <CheckCircle2 className="h-3 w-3 ml-1 inline" />}
                        </span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: 'priority',
        header: () => null,
        cell: ({ row }) => {
            const priority = row.original.priority
            const colors = {
                HIGH: 'text-red-400 bg-red-500/10 border-red-500/20',
                MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                LOW: 'text-green-400 bg-green-500/10 border-green-500/20',
            }
            return (
                <Badge variant="outline" className={`text-[10px] font-medium border whitespace-nowrap ${colors[priority as keyof typeof colors] || 'text-muted-foreground bg-muted border-border'}`}>
                    {defaultPriorityLabels[priority] || priority}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'status',
        header: () => <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Estado</div>,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <Badge variant="outline" className={`text-[10px] font-medium border whitespace-nowrap ${statusColors[row.original.status]}`}>
                    {row.original.status === 'BACKLOG' ? 'Backlog' :
                        row.original.status === 'TODO' ? 'Por Hacer' :
                            row.original.status === 'IN_PROGRESS' ? 'En Progreso' :
                                row.original.status === 'REVIEW' ? 'Revision' :
                                    row.original.status === 'DONE' ? 'Finalizado' : row.original.status}
                </Badge>
            </div>
        ),
    },
    {
        id: 'requirements',
        header: () => <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Req</div>,
        cell: ({ row }) => {
            const task = row.original
            const hasHours = (task.estimatedTime ?? 0) > 0

            return (
                <div className="flex items-center justify-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={hasHours ? 'text-muted-foreground' : 'text-orange-500'}>
                                    {hasHours ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{hasHours ? 'Horas asignadas' : 'Falta estimar horas'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={task.assignments.length > 0 ? 'text-muted-foreground' : 'text-orange-500'}>
                                    {task.assignments.length > 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{task.assignments.length > 0 ? 'Colaborador asignado' : 'Falta asignar colaborador'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={(() => {
                                    const allTasks = task.assignments.flatMap(a => a.tasks)
                                    return allTasks.length > 0 ? 'text-muted-foreground' : 'text-orange-500'
                                })()}>
                                    {(() => {
                                        const allTasks = task.assignments.flatMap(a => a.tasks)
                                        return allTasks.length > 0 ? <CheckCircle className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />
                                    })()}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{(() => {
                                    const allTasks = task.assignments.flatMap(a => a.tasks)
                                    return allTasks.length > 0 ? 'Checklist creado' : 'Falta crear checklist'
                                })()}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )
        },
    },
    {
        accessorKey: 'technology',
        header: () => null,
        cell: ({ row }) => (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                {row.original.technology}
            </span>
        ),
        size: 70,
    },
    {
        accessorKey: 'assignees',
        header: () => null,
        cell: ({ row }) => {
            const assignments = row.original.assignments.filter(a => a.isAssigned)
            const count = assignments.length

            if (count === 0) return <div className="w-8" />

            if (count === 1) {
                const assignment = assignments[0]
                return (
                    <div className="flex items-center justify-center w-8">
                        <UserAvatar
                            username={assignment.user.username}
                            className="h-6 w-6 border-2 border-background ring-1 ring-border text-[9px]"
                        />
                    </div>
                )
            }

            const usernames = assignments.map(a => a.user.username).join(', ')

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-center w-8 text-muted-foreground">
                                <User className="h-5 w-5" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{usernames}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        size: 40,
    },
    {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => <DataTableRowActions row={row} />,
        size: 40,
    },
]

export function Backlog({ 
    initialTasks, 
    isSheetOpen: externalSheetOpen, 
    onOpenChange, 
    taskSelect, 
    onTaskUpdate,
    searchQuery,
    setSearchQuery,
    techFilter,
    setTechFilter,
    statusFilter,
    setStatusFilter,
    onlyMyAssignments,
    setOnlyMyAssignments,
    onResetFilters,
}: BacklogProps) {
    const { data: session } = useSession()
    const { t } = useI18n()
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [internalSheetOpen, setInternalSheetOpen] = useState(false)
    const initialTasksRef = useRef(initialTasks)

    const priorityLabels = useMemo(() => ({
        HIGH: t.priorities.HIGH,
        MEDIUM: t.priorities.MEDIUM,
        LOW: t.priorities.LOW,
    }), [t.priorities])

    const isSheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen
    const setIsSheetOpen = onOpenChange || setInternalSheetOpen

    // Solo actualizar estado cuando initialTasks cambie realmente (no en cada render)
    useEffect(() => {
        if (JSON.stringify(initialTasksRef.current) !== JSON.stringify(initialTasks)) {
            initialTasksRef.current = initialTasks
            setTasks(initialTasks)
        }
    }, [initialTasks])

    const filteredTasks = useMemo(() => {
        const filtered = tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                `${task.type} ${task.externalId}`.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesTech = techFilter.length === 0 || techFilter.includes(task.technology)
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status)

            return matchesSearch && matchesTech && matchesStatus
        })
        
        // Sort by priority (HIGH > MEDIUM > LOW), then by position, then by createdAt
        return filtered.sort((a, b) => {
            const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            
            const positionDiff = (a.position || 0) - (b.position || 0)
            if (positionDiff !== 0) return positionDiff
            
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
    }, [tasks, searchQuery, techFilter, statusFilter])

    const table = useReactTable({
        data: filteredTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

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

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over) return

        const activeId = Number(active.id)
        const overId = Number(over.id)

        if (activeId === overId) return

        const activeTask = tasks.find(t => t.id === activeId)
        const overTask = tasks.find(t => t.id === overId)

        if (!activeTask || !overTask) return

        // Solo permitir reordenar tareas con la misma prioridad
        if (activeTask.priority !== overTask.priority) {
            toast.info('Solo puedes reordenar tareas con la misma prioridad')
            return
        }

        // Actualizar el estado local optimistamente
        const previousTasks = [...tasks]
        const activeIndex = filteredTasks.findIndex(t => t.id === activeId)
        const overIndex = filteredTasks.findIndex(t => t.id === overId)
        
        const newTasks = arrayMove(filteredTasks, activeIndex, overIndex)
        setTasks(prev => {
            const otherTasks = prev.filter(t => !newTasks.find(nt => nt.id === t.id))
            return [...otherTasks, ...newTasks]
        })

        // Llamar a la server action
        const result = await updateTaskOrder({
            taskId: activeId,
            overTaskId: overId
        }, 'es')

        if (!result.success && result.error) {
            toast.error(result.error)
            // Revertir cambios si falla
            setTasks(previousTasks)
        }
    }

    function handleTaskUpdate(updatedTask: IncidenceWithDetails) {
        setTasks(prev => {
            if (updatedTask.status !== 'BACKLOG') {
                return prev.filter(t => t.id !== updatedTask.id)
            }
            return prev.map(task =>
                task.id === updatedTask.id ? updatedTask : task
            )
        })
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask)
        }
    }

    return (
        <div className="flex flex-col gap-3 h-full min-w-0 pr-1">
            <div className="border border-border rounded-2xl bg-card shadow-inner flex flex-col h-full overflow-hidden min-w-0">
                {/* Header sticky */}
                <div className="flex-shrink-0">
                    <Table className="table-fixed w-full">
                        <TableHeader className="sticky top-0 z-10 border-b-2 border-border">
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        const widthClass = header.column.id === 'drag-handle' ? 'w-10' :
                                            header.column.id === 'type' ? 'w-32 text-center' :
                                            header.column.id === 'title' ? 'w-auto' :
                                            header.column.id === 'priority' ? 'w-20' :
                                            header.column.id === 'status' ? 'w-24 text-center' :
                                            header.column.id === 'requirements' ? 'w-20 text-center' :
                                            header.column.id === 'technology' ? 'w-16' :
                                            header.column.id === 'assignees' ? 'w-16' :
                                            header.column.id === 'actions' ? 'w-14' : ''
                                        return (
                                            <TableHead key={header.id} className={`bg-card ${widthClass} h-10 px-2`}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                    </Table>
                </div>
                
                {/* Body con scroll */}
                <ScrollArea className="flex-1 overflow-x-hidden">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredTasks.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Table className="table-fixed w-full">
                                <TableBody className="divide-y divide-border">
                                    {filteredTasks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="p-12 text-center w-full">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="p-4 rounded-full bg-muted/50">
                                                        <Inbox className="h-8 w-8 text-muted-foreground/60" />
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground font-medium">No se encontraron incidencias</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        table.getRowModel().rows.map(row => (
                                            <SortableRow
                                                key={row.original.id}
                                                row={row}
                                                onClick={() => {
                                                    if (taskSelect) {
                                                        taskSelect(row.original)
                                                    }
                                                    setIsSheetOpen(true)
                                                }}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </SortableContext>
                    </DndContext>
                </ScrollArea>
            </div>
        </div>
    )
}
