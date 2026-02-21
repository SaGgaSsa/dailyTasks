'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, CheckCircle, Clock, User, List } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IncidenceWithDetails } from '@/types'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { MarkdownText } from '@/components/ui/markdown-text'
import { TaskStatus } from '@/types/enums'
import { calculateCompletedHours, formatHoursDisplay } from '@/lib/hours-calculation'

interface TaskCardProps {
    task: IncidenceWithDetails
    onClick?: () => void
    canDrag?: boolean
}

const priorityColors = {
    LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    HIGH: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const typeColors: Record<string, string> = {
    I_MODAPL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-purple-500/10 text-purple-400 border-purple-400/20',
}

export function TaskCard({ task, onClick, canDrag = true }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task }, disabled: !canDrag })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const allSubTasks = task.assignments.flatMap(a => a.tasks)
    const completedItems = allSubTasks.filter(i => i.isCompleted).length
    const totalItems = allSubTasks.length

    const isBacklog = task.status === TaskStatus.BACKLOG
    const hasHours = (task.estimatedTime ?? 0) > 0
    const hasAssignees = task.assignments.length > 0
    const hasSubTasks = allSubTasks.length > 0

    const completedHours = calculateCompletedHours(task)

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                if (onClick) onClick();
            }}
            className={`mb-3 ${canDrag ? 'cursor-pointer' : 'cursor-default'} bg-card border-border/50 hover:bg-accent/50 transition-all duration-200 shadow-sm touch-none ${isDragging ? 'shadow-xl ring-1 ring-border z-50 opacity-100' : ''}`}
        >
            <CardContent className="p-2 space-y-1.5">
                {/* Header: ID + Priority */}
                <div className="flex items-center justify-between">
                    <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold px-1.5 py-0 uppercase tracking-tight flex-shrink-0 ${typeColors[task.type] || 'bg-zinc-500/10 text-zinc-400'}`}
                    >
                        {task.type} {task.externalId}
                    </Badge>
                    <Badge
                        variant="secondary"
                        className={`text-[9px] font-medium px-1.5 py-0 flex-shrink-0 ${priorityColors[task.priority as keyof typeof priorityColors] || ''} border`}
                    >
                        {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                    </Badge>
                </div>

                {/* Title */}
                <h3 className="text-xs font-medium text-card-foreground truncate">
                    {task.title}
                </h3>

                {/* Separador */}
                <div className="border-t border-border/50" />



                {/* Technology + Hours */}
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-border bg-transparent font-normal">
                        {task.technology}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                        {formatHoursDisplay(completedHours, task.estimatedTime)}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckSquare className="h-3 w-3" />
                        <span className="text-[10px] font-medium">
                            {completedItems}/{totalItems}
                        </span>
                    </div>

                    <div className="flex items-center">
                        {(() => {
                            const activeAssignments = task.assignments.filter(a => a.isAssigned)
                            const count = activeAssignments.length

                            if (count === 0) return null

                            if (count === 1) {
                                const assignment = activeAssignments[0]
                                return (
                                    <UserAvatar 
                                        username={assignment.user.username} 
                                        className="h-5 w-5 border border-background ring-1 ring-border text-[8px]" 
                                    />
                                )
                            }

                            const usernames = activeAssignments.map(a => a.user.username).join(', ')
                            return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <User className="h-5 w-5 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">{usernames}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            )
                        })()}
                    </div>
                </div>
                {totalItems > 0 && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary/50 transition-all duration-300"
                            style={{ width: `${(completedItems / totalItems) * 100}%` }}
                        />
                    </div>
                )}

                {/* Debug: Position */}
                {/* <div className="text-[9px] text-zinc-600 font-mono">
                    pos: {task.position}
                </div> */}

                {/* Indicadores de requisitos (solo en BACKLOG) */}
                {isBacklog && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
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
                                    <div className={hasAssignees ? 'text-muted-foreground' : 'text-orange-500'}>
                                        {hasAssignees ? <CheckCircle className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{hasAssignees ? 'Colaborador asignado' : 'Falta asignar colaborador'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={hasSubTasks ? 'text-muted-foreground' : 'text-orange-500'}>
                                        {hasSubTasks ? <CheckCircle className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{hasSubTasks ? 'Checklist creado' : 'Falta crear checklist'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
