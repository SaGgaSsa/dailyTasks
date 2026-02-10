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
import { CheckCircle2, Inbox, Clock, User, List, CheckCircle } from 'lucide-react'
import { TaskStatus, TaskType } from '@/types/enums'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { calculateCompletedHours, formatHoursDisplay, isFullyCompleted } from '@/lib/hours-calculation'

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
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tramite</div>,
        cell: ({ row }) => (
            <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-zinc-900/50 whitespace-nowrap ${typeColors[row.original.type]}`}>
                {row.original.type} {row.original.externalId}
            </Badge>
        ),
    },
    {
        accessorKey: 'title',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Detalle</div>,
        cell: ({ row }) => {
            const title = row.original.title
            const totalHours = row.original.estimatedTime || 0
            const completedHours = calculateCompletedHours(row.original)
            const isComplete = isFullyCompleted(completedHours, row.original.estimatedTime)
            
            return (
                <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm text-zinc-200 font-medium flex-1 truncate" title={title}>
                        {title}
                    </span>
                    <span className={`text-xs whitespace-nowrap shrink-0 ${isComplete ? 'text-green-400' : 'text-zinc-400'}`}>
                        {formatHoursDisplay(completedHours, totalHours)}{totalHours > 0 ? 'h' : ''}
                        {isComplete && <CheckCircle2 className="h-3 w-3 ml-1 inline" />}
                    </span>
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
                <Badge variant="outline" className={`text-[10px] font-medium border whitespace-nowrap ${colors[priority as keyof typeof colors] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'}`}>
                    {priorityLabels[priority] || priority}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'status',
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estado</div>,
        cell: ({ row }) => (
            <Badge variant="outline" className={`text-[10px] font-medium border whitespace-nowrap ${statusColors[row.original.status]}`}>
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
        header: () => <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Req</div>,
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
        accessorKey: 'technology',
        header: () => null,
        cell: ({ row }) => (
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/30 px-2 py-0.5 rounded whitespace-nowrap">
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
                            className="h-6 w-6 border-2 border-[#0F0F0F] ring-1 ring-zinc-800 text-[9px]"
                        />
                    </div>
                )
            }

            const usernames = assignments.map(a => a.user.username).join(', ')

            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-center w-8 text-zinc-500">
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
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status)

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
                <Table className="table-fixed w-full">
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const widthClass = header.column.id === 'type' ? 'w-24' :
                                        header.column.id === 'title' ? 'w-full' :
                                        header.column.id === 'priority' ? 'w-20' :
                                        header.column.id === 'status' ? 'w-24' :
                                        header.column.id === 'actions' ? 'w-20' :
                                        header.column.id === 'technology' ? 'w-16' :
                                        header.column.id === 'assignees' ? 'w-16' : ''
                                    return (
                                        <TableHead key={header.id} className={`bg-[#0F0F0F] ${widthClass}`}>
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
                    <TableBody className="divide-y divide-zinc-900">
                        {filteredTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-12 text-center w-full">
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
                                    {row.getVisibleCells().map(cell => {
                                        const widthClass = cell.column.id === 'type' ? 'w-24' :
                                            cell.column.id === 'title' ? 'w-full' :
                                            cell.column.id === 'priority' ? 'w-20' :
                                            cell.column.id === 'status' ? 'w-24' :
                                            cell.column.id === 'actions' ? 'w-20' :
                                            cell.column.id === 'technology' ? 'w-16' :
                                            cell.column.id === 'assignees' ? 'w-16' : ''
                                        const extraClass = cell.column.id === 'title' ? 'min-w-0' : ''
                                        return (
                                            <TableCell key={cell.id} className={`py-3 ${widthClass} ${extraClass}`.trim()}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
