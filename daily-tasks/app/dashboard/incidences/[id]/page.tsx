'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getIncidence, getIncidenceWithUsers } from '@/app/actions/incidence-actions'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { TaskStatus, TechStack } from '@/types/enums'
import { IncidenceWithDetails } from '@/types'
import { IncidenceDetailClient } from './_components/incidence-detail-client'
import { Loader2 } from 'lucide-react'

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
    BACKLOG: { label: 'Backlog', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    TODO: { label: 'Por Hacer', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    IN_PROGRESS: { label: 'En Progreso', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    REVIEW: { label: 'En Revisión', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    DONE: { label: 'Completado', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
}

const techLabels: Record<TechStack, string> = {
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

interface IncidencePageProps {
    id: string
}

function IncidencePageContent({ id }: IncidencePageProps) {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [incidence, setIncidence] = useState<IncidenceWithDetails | null>(null)
    const [users, setUsers] = useState<{ id: number; name: string | null; username: string; role: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasChanges, setHasChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const pendingNavigationRef = useRef<string | null>(null)
    const saveFnRef = useRef<(() => Promise<void>) | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            const incidenceId = parseInt(id, 10)
            if (isNaN(incidenceId)) return

            const incidenceData = await getIncidence(incidenceId)
            if (!incidenceData) return

            const { users: allUsers } = await getIncidenceWithUsers(incidenceData.type, incidenceData.externalId)

            setIncidence(incidenceData)
            setUsers(allUsers)
            setIsLoading(false)
        }

        if (session?.user) {
            fetchData()
        }
    }, [id, session?.user])

    const handleSaveRef = useCallback((saveFn: () => Promise<void>) => {
        saveFnRef.current = saveFn
    }, [])

    const handleSave = async () => {
        if (saveFnRef.current) {
            setIsSaving(true)
            await saveFnRef.current()
            setIsSaving(false)
            setHasChanges(false)
        }
    }

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges])

    useEffect(() => {
        if (!hasChanges) return

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const anchor = target.closest('a')
            if (anchor && anchor.href && !anchor.href.includes(pathname)) {
                e.preventDefault()
                pendingNavigationRef.current = anchor.href
                setShowExitDialog(true)
            }
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [hasChanges, pathname])

    const handleConfirmExit = () => {
        setShowExitDialog(false)
        setHasChanges(false)
        if (pendingNavigationRef.current) {
            window.location.href = pendingNavigationRef.current
        }
    }

    const handleCancelExit = () => {
        setShowExitDialog(false)
        pendingNavigationRef.current = null
    }

    if (!session?.user) {
        notFound()
    }

    if (isLoading || !incidence) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const currentUserId = Number(session.user.id)
    const isAdmin = session.user.role === 'ADMIN'

    const assignedHours = incidence.assignments.reduce(
        (sum, a) => sum + (a.assignedHours ?? 0),
        0
    )

    const allTasks = incidence.assignments.flatMap((a) => a.tasks)
    const completedTasks = allTasks.filter((t) => t.isCompleted).length
    const totalTasks = allTasks.length

    const statusInfo = statusConfig[incidence.status]

    return (
        <>
            <div className="mt-0 grid grid-cols-1 gap-15 lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]">
                <IncidenceDetailClient
                    incidence={incidence}
                    allUsers={users}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    hasChanges={hasChanges}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onHasChangesChange={setHasChanges}
                    onSaveRef={handleSaveRef}
                />

                <div className="pt-6 pr-6">
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
                        <span className="text-sm font-medium">N/A</span>
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
                        <span className="text-sm font-medium">{techLabels[incidence.technology]}</span>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Asignados</span>
                        {incidence.assignments.length > 0 ? (
                            <AvatarGroup>
                                {incidence.assignments.map((assignment) => (
                                    <Avatar key={assignment.id} size="sm">
                                        <AvatarFallback>
                                            {assignment.user.username.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            </AvatarGroup>
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
                </div>
            </div>

            <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Salir sin guardar</DialogTitle>
                        <DialogDescription>
                            Tiene cambios sin guardar. ¿Está seguro de que desea salir?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelExit}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmExit}>
                            Salir sin guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default function IncidenceDetailPage({ params }: PageProps) {
    const [id, setId] = useState<string | null>(null)

    useEffect(() => {
        params.then(p => setId(p.id))
    }, [params])

    if (!id) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return <IncidencePageContent id={id} />
}
