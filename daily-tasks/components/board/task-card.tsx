'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, CheckCircle, Clock, User, List, EllipsisVertical, CheckCircle as CheckCircleIcon, BarChart3, FileText, Trash2, Eye } from 'lucide-react'
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
import { TaskStatus } from '@/types/enums'
import { calculateCompletedHours, formatHoursDisplay } from '@/lib/hours-calculation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { completeIncidence, deleteIncidence } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'

interface TaskCardProps {
    task: IncidenceWithDetails
    onClick?: () => void
    canDrag?: boolean
    isDev?: boolean
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

export function TaskCard({ task, onClick, canDrag = true, isDev = false }: TaskCardProps) {
    const router = useRouter()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task }, disabled: !canDrag })

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const canComplete = task.status === TaskStatus.REVIEW || task.status === TaskStatus.IN_PROGRESS
    const canDiscard = task.status !== TaskStatus.DONE && task.status !== TaskStatus.REVIEW

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

    const getCollaboratorsList = () => {
        return task.assignments
            .filter(a => a.isAssigned)
            .map(assignment => {
                const totalTasks = assignment.tasks.length
                const completedTasks = assignment.tasks.filter(t => t.isCompleted).length
                const pendingTasks = totalTasks - completedTasks
                
                return {
                    name: assignment.user.username,
                    totalTasks,
                    completedTasks,
                    pendingTasks
                }
            })
            .sort((a, b) => {
                if (b.pendingTasks !== a.pendingTasks) {
                    return b.pendingTasks - a.pendingTasks
                }
                return b.name.localeCompare(a.name)
            })
    }

    const collaborators = getCollaboratorsList()

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDialogOpen(true)
    }

    const handleConfirmComplete = async () => {
        setIsLoading(true)
        const result = await completeIncidence(task.id)
        setIsLoading(false)
        setIsDialogOpen(false)

        if (result.success) {
            toast.success('Incidencia completada correctamente')
        } else {
            toast.error(result.error || 'Error al completar la incidencia')
        }
    }

    const handleConfirmDiscard = async () => {
        setIsLoading(true)
        const result = await deleteIncidence(task.id)
        setIsLoading(false)
        setIsDiscardDialogOpen(false)

        if (result.success) {
            toast.success('Incidencia descartada')
        } else {
            toast.error(result.error || 'Error al descartar la incidencia')
        }
    }

    const handleViewIncidence = (e: React.MouseEvent) => {
        e.stopPropagation()
        router.push(`/dashboard/incidences/${task.id}`)
    }

    return (
        <>
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
                    <div className="flex items-center gap-1">
                        <Badge
                            variant="secondary"
                            className={`text-[9px] font-medium px-1.5 py-0 flex-shrink-0 ${priorityColors[task.priority as keyof typeof priorityColors] || ''} border`}
                        >
                            {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0.5 hover:bg-transparent"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <EllipsisVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
                                {!isDev && canComplete && (
                                    <DropdownMenuItem onClick={handleOpenDialog}>
                                        <CheckCircleIcon className="mr-2 h-4 w-4 text-green-500" />
                                        Completar Incidencia
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleViewIncidence}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Incidencia
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Ver Métricas
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Ver Páginas
                                </DropdownMenuItem>
                                {!isDev && canDiscard && (
                                    <DropdownMenuSeparator />
                                )}
                                {!isDev && canDiscard && (
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsDiscardDialogOpen(true)
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Descartar Incidencia
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>
                        Completar Incidencia {task.type} {task.externalId}
                    </DialogTitle>
                    <DialogDescription>
                        {task.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <h4 className="text-sm font-medium mb-3">Colaboradores:</h4>
                    <div className="space-y-2">
                        {collaborators.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay colaboradores asignados</p>
                        ) : (
                            collaborators.map((collab, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">{collab.name}</span>
                                    <span className="text-muted-foreground">
                                        {collab.totalTasks === 0
                                            ? 'Sin tareas'
                                            : `${collab.pendingTasks}/${collab.totalTasks} pendientes`
                                        }
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmComplete} disabled={isLoading}>
                        {isLoading ? 'Completando...' : 'Confirmar Completado'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>¿Estás seguro de descartar esta incidencia?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Se borrarán todas las tareas y asignaciones asociadas.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDiscardDialogOpen(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleConfirmDiscard} disabled={isLoading}>
                        {isLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
