'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, CheckCircle, CheckCircle2, Clock, User, List } from 'lucide-react'
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
import { calculateCompletedHours, formatHoursDisplay, isFullyCompleted } from '@/lib/hours-calculation'
import { useSession } from 'next-auth/react'

interface TaskCardProps {
    task: IncidenceWithDetails
    onClick?: () => void
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

export function TaskCard({ task, onClick }: TaskCardProps) {
    const { data: session } = useSession()
    const userId = session?.user?.id || undefined
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task } })

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
    const isComplete = isFullyCompleted(completedHours, task.estimatedTime)
    const userAssignment = task.assignments.find(a => String(a.userId) === String(userId))
    const userHours = userAssignment?.estimatedHours || 0

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (onClick) onClick();
            }}
            className={`mb-3 cursor-pointer bg-[#191919] border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-200 shadow-sm touch-none ${isDragging ? 'shadow-xl ring-1 ring-zinc-700 z-50 opacity-100' : ''}`}
        >
            <CardContent className="p-2 space-y-1.5">
                {/* Header: ID + Priority + Title */}
                <div className="flex items-center gap-2">
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
                    <h3 className="text-xs font-medium text-zinc-200 truncate flex-1 min-w-0">
                        {task.title}
                    </h3>
                </div>

                {/* Description Snippet with Markdown */}
                {task.description && (
                    <div className="line-clamp-2">
                        <MarkdownText
                            content={task.description}
                            className="text-[11px] text-zinc-500 prose-p:leading-tight prose-a:text-blue-400"
                        />
                    </div>
                )}

                {/* Technology + Hours */}
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] text-zinc-500 border-zinc-800 bg-transparent font-normal">
                        {task.technology}
                    </Badge>
                    <span className="text-[10px] text-zinc-400">
                        {formatHoursDisplay(completedHours, task.estimatedTime)}
                    </span>
                </div>
                {task.estimatedTime && userId && userHours > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">
                            Mis horas: {userHours}h
                        </span>
                        {task.estimatedTime && isComplete && (
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-500">
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
                                        className="h-5 w-5 border border-zinc-900 ring-1 ring-zinc-800 text-[8px]" 
                                    />
                                )
                            }

                            const usernames = activeAssignments.map(a => a.user.username).join(', ')
                            return (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <User className="h-4 w-4 text-zinc-500" />
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
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500/50 transition-all duration-300"
                            style={{ width: `${(completedItems / totalItems) * 100}%` }}
                        />
                    </div>
                )}

                {/* Indicadores de requisitos (solo en BACKLOG) */}
                {isBacklog && (
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
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
