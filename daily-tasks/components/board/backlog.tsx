'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { IncidenceWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CheckCircle2, Inbox, Clock, User, List, CheckCircle } from 'lucide-react'
import { TaskStatus, TaskType, TechStack } from '@/types/enums'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
    statusFilter: string
    setStatusFilter: (filter: string) => void
    onlyMyAssignments: boolean
    setOnlyMyAssignments: (value: boolean) => void
}

const statusColors: Record<TaskStatus, string> = {
    BACKLOG: 'bg-zinc-500/10 text-zinc-400 border-zinc-800',
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

const priorityLabels: Record<string, string> = {
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
}

const columns: ColumnDef<IncidenceWithDetails>[] = [
    {
        accessorKey: 'type',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-28 shrink-0">Identificador</div>,
        cell: ({ row }) => (
            <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-zinc-900/50 ${typeColors[row.original.type]}`}>
                {row.original.type} {row.original.externalId}
            </Badge>
        ),
    },
    {
        accessorKey: 'title',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-full">Descripcion</div>,
        cell: ({ row }) => {
            const title = row.original.title
            const displayTitle = title.length > 40 ? title.substring(0, 40) + '...' : title
            return (
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-200 font-medium" title={title}>
                        {displayTitle}
                    </span>
                    {(() => {
                        const allTasks = row.original.assignments.flatMap(a => a.tasks)
                        if (allTasks.length === 0) return null
                        const completed = allTasks.filter(st => st.isCompleted).length
                        const total = allTasks.length
                        const isAllCompleted = completed === total
                        return (
                            <span className={`flex items-center gap-1 ${isAllCompleted ? 'text-green-400' : ''}`}>
                                {isAllCompleted ? (
                                    <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>completado</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-zinc-400">
                                            {completed}/{total}
                                        </span>
                                        <span>pendientes</span>
                                    </>
                                )}
                            </span>
                        )
                    })()}
                </div>
            )
        },
    },
    {
        accessorKey: 'priority',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-20 shrink-0">Prioridad</div>,
        cell: ({ row }) => {
            const priority = row.original.priority
            const colors = {
                HIGH: 'text-red-400 bg-red-500/10 border-red-500/20',
                MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                LOW: 'text-green-400 bg-green-500/10 border-green-500/20',
            }
            return (
                <Badge variant="outline" className={`text-[10px] font-medium border ${colors[priority as keyof typeof colors] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'}`}>
                    {priorityLabels[priority] || priority}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'status',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-24 shrink-0">Estado</div>,
        cell: ({ row }) => (
            <Badge variant="outline" className={`text-[10px] font-medium border ${statusColors[row.original.status]}`}>
                {row.original.status === 'BACKLOG' ? 'Backlog' :
                    row.original.status === 'TODO' ? 'Por Hacer' :
                        row.original.status === 'IN_PROGRESS' ? 'En Progreso' :
                            row.original.status === 'REVIEW' ? 'Revision' :
                                row.original.status === 'DONE' ? 'Finalizado' : row.original.status}
            </Badge>
        ),
    },
    {
        id: 'actions',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-20 shrink-0 text-center">Req</div>,
        cell: ({ row }) => {
            const task = row.original
            const hasHours = (task.estimatedTime ?? 0) > 0

            return (
                <div className="flex items-center justify-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={hasHours ? 'text-zinc-600' : 'text-orange-500'}>
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
                                <div className={task.assignments.length > 0 ? 'text-zinc-600' : 'text-orange-500'}>
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
                                    return allTasks.length > 0 ? 'text-zinc-600' : 'text-orange-500'
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
        accessorKey: 'assignees',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-24 shrink-0">Colaboradores</div>,
        cell: ({ row }) => (
            <div className="flex -space-x-1.5 overflow-hidden">
                {row.original.assignments.map((assignment) => (
                    <UserAvatar
                        key={assignment.userId}
                        username={assignment.user.username}
                        className="h-6 w-6 border-2 border-[#0F0F0F] ring-1 ring-zinc-800 text-[9px]"
                    />
                ))}
            </div>
        ),
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
    setOnlyMyAssignments
}: BacklogProps) {
    const { data: session } = useSession()
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [internalSheetOpen, setInternalSheetOpen] = useState(false)

    const isSheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen
    const setIsSheetOpen = onOpenChange || setInternalSheetOpen

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                `${task.type} ${task.externalId}`.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesTech = techFilter.length === 0 || techFilter.includes(task.technology)
            const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter

            const matchesMyAssignments = !onlyMyAssignments ||
                (session?.user?.id && task.assignments.some(a => a.userId === Number(session.user.id)))

            return matchesSearch && matchesTech && matchesStatus && matchesMyAssignments
        })
    }, [tasks, searchQuery, techFilter, statusFilter, onlyMyAssignments, session?.user?.id])

    const table = useReactTable({
        data: filteredTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    function handleTaskUpdate(updatedTask: IncidenceWithDetails) {
        setTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="border border-zinc-900 rounded-2xl bg-[#0F0F0F] shadow-inner">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} className="bg-[#0F0F0F]">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-900">
                        {filteredTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 rounded-full bg-zinc-900/50">
                                            <Inbox className="h-8 w-8 text-zinc-600" />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 font-medium">No se encontraron incidencias</p>
                                            <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-zinc-900/50 transition-colors"
                                    onClick={() => {
                                        if (taskSelect) {
                                            taskSelect(row.original)
                                        }
                                        setIsSheetOpen(true)
                                    }}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
