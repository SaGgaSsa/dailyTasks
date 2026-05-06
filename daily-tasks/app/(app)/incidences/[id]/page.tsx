import { notFound } from 'next/navigation'
import { getIncidencePageData } from '@/app/actions/incidence-actions'
import { getEnvironmentAvailability } from '@/app/actions/environment-log'
import { auth } from '@/auth'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { TaskStatus } from '@/types/enums'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { User } from 'lucide-react'
import { IncidencePageContent } from './_components/incidence-page-content'
import { UserRole } from '@prisma/client'

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
    BACKLOG: { label: 'Backlog', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    TODO: { label: 'Por Hacer', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    IN_PROGRESS: { label: 'En Progreso', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    REVIEW: { label: 'En Revisión', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    DONE: { label: 'Completado', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    DISMISSED: { label: 'Desestimado', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const techLabels: Record<string, string> = {
    SISA: 'SISA',
    WEB: 'WEB',
    ANDROID: 'Android',
    ANGULAR: 'Angular',
    SPRING: 'Spring',
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

async function EnvironmentAvailability({ incidenceId }: { incidenceId: number }) {
    const availability = await getEnvironmentAvailability({ incidenceId })
    const environments = availability.success ? availability.data ?? [] : []

    if (environments.length === 0) {
        return null
    }

    return (
        <>
            <Separator className="my-6" />
            <div className="space-y-2">
                <div className="text-sm font-medium">Disponibilidad</div>
                <div className="space-y-2">
                    {environments.map((environment) => (
                        <div key={environment.environmentId} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">{environment.environmentName}</span>
                            <Badge
                                variant="outline"
                                className={
                                    environment.isAvailable
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                        : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
                                }
                            >
                                {environment.isAvailable ? 'Disponible' : 'Pendiente'}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function IncidenceDetailPage({ params }: PageProps) {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
        notFound()
    }

    const incidenceId = parseInt(id, 10)
    if (isNaN(incidenceId)) {
        notFound()
    }

    const { incidence, users } = await getIncidencePageData(incidenceId)

    if (!incidence) {
        notFound()
    }

    const currentUserId = Number(session.user.id)
    const currentUserRole = session.user.role as UserRole
    const isAdmin = currentUserRole === UserRole.ADMIN
    const isAssignedToCurrentUser = incidence.assignments.some(
        (assignment) => assignment.isAssigned && assignment.userId === currentUserId
    )

    const assignedHours = incidence.assignments.reduce(
        (sum, a) => sum + (a.assignedHours ?? 0),
        0
    )

    const WORK_HOURS_PER_DAY = 8

    const pendingHours = incidence.assignments.reduce((sum, assignment) => {
        const hasNoTasks = assignment.tasks.length === 0
        const hasIncompleteTask = assignment.tasks.some((task) => !task.isCompleted)

        if (hasNoTasks || hasIncompleteTask) {
            return sum + (assignment.assignedHours ?? 0)
        }
        return sum
    }, 0)

    const rawDays = pendingHours / WORK_HOURS_PER_DAY
    const remainingDays = Math.ceil(rawDays * 2) / 2

    const allTasks = incidence.assignments.flatMap((a) => a.tasks)
    const completedTasks = allTasks.filter((t) => t.isCompleted).length
    const totalTasks = allTasks.length

    const statusInfo = statusConfig[incidence.status]

    return (
        <>
            <div className="mt-0 grid grid-cols-1 gap-15 lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]">
                <IncidencePageContent
                    incidence={incidence}
                    allUsers={users}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    currentUserRole={currentUserRole}
                    isAssignedToCurrentUser={isAssignedToCurrentUser}
                />

                <div className="lg:sticky lg:top-0 lg:self-start">
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Trámite</span>
                        <IncidenceBadge type={incidence.externalWorkItem.type} color={incidence.externalWorkItem.color} externalId={incidence.externalWorkItem.externalId} />
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Fecha de creación</span>
                        <span className="text-sm font-medium">{formatDate(incidence.createdAt)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Horas estimadas</span>
                        <span className="text-sm font-medium">
                            {incidence.estimatedTime ? `${incidence.estimatedTime}h` : 'Sin estimar'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Horas asignadas</span>
                        <span className="text-sm font-medium">{assignedHours > 0 ? `${assignedHours}h` : '0h'}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Días restantes</span>
                        <span className="text-sm font-medium">{remainingDays > 0 ? `${remainingDays} días` : '0 días'}</span>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Estado</span>
                        <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                        </Badge>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Tecnología</span>
                        <span className="text-sm font-medium">{techLabels[incidence.technology?.name || '']}</span>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Asignados</span>
                        {incidence.assignments.length > 0 ? (
                            (() => {
                                const activeAssignments = incidence.assignments.filter(a => a.isAssigned)
                                const count = activeAssignments.length

                                if (count === 0) {
                                    return <span className="text-sm text-muted-foreground">Sin asignar</span>
                                }

                                if (count === 1) {
                                    const assignment = activeAssignments[0]
                                    return (
                                        <UserAvatar 
                                            username={assignment.user.username}
                                            className="h-6 w-6 text-xs" 
                                        />
                                    )
                                }

                                const usernames = activeAssignments.map(a => a.user.name || a.user.username).join(', ')
                                return (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <User className="h-5 w-5 text-muted-foreground cursor-default" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">{usernames}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            })()
                        ) : (
                            <span className="text-sm text-muted-foreground">Sin asignar</span>
                        )}
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Tareas</span>
                        <span className="text-sm font-medium">
                            {completedTasks}/{totalTasks}
                        </span>
                    </div>

                    <EnvironmentAvailability incidenceId={incidence.id} />
                </div>
            </div>
        </>
    )
}
