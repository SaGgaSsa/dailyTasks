'use server'

import { cache } from 'react'
import { db } from '@/lib/db'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Priority as PrismaPriority, TaskStatus, TaskType, TicketQAStatus, Prisma } from '@prisma/client'
import { Priority } from '@/types/enums'
import { IncidenceWithDetails, AssigneeWithHours } from '@/types'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'
import { ensureSystemScriptsPage } from '@/lib/incidence-pages'

async function syncLinkedTickets(incidenceId: number, newStatus: TaskStatus) {
    const targetTicketStatus =
        newStatus === TaskStatus.REVIEW
            ? TicketQAStatus.TEST
            : newStatus === TaskStatus.TODO || newStatus === TaskStatus.IN_PROGRESS
                ? TicketQAStatus.IN_DEVELOPMENT
                : null

    if (!targetTicketStatus) return

    await db.ticketQA.updateMany({
        where: {
            incidenceId,
            status: { notIn: [TicketQAStatus.COMPLETED, TicketQAStatus.DISMISSED] }
        },
        data: { status: targetTicketStatus }
    })
}

const incidenceDetailsInclude = {
    externalWorkItem: {
        include: {
            attachments: {
                include: {
                    uploadedBy: true
                },
                orderBy: {
                    createdAt: 'desc' as const
                }
            }
        }
    },
    technology: true,
    assignments: {
        where: { isAssigned: true },
        include: {
            user: true,
            tasks: {
                orderBy: [
                    { isCompleted: 'asc' as const },
                    { completedAt: 'desc' as const }
                ]
            }
        }
    },
    pages: {
        include: {
            author: true
        },
        orderBy: {
            createdAt: 'desc' as const
        }
    },
    qaTickets: { select: { id: true } }
} satisfies Prisma.IncidenceInclude

type IncidenceDetailsPayload = Prisma.IncidenceGetPayload<{
    include: typeof incidenceDetailsInclude
}>

const getIncidenceCached = cache(async (id: number) => {
    return db.incidence.findUnique({
        where: { id },
        include: incidenceDetailsInclude
    })
})

const getUsersCached = cache(async () => {
    return db.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            role: true
        },
        orderBy: [
            { role: 'asc' },
            { username: 'asc' }
        ]
    })
})

interface CreateIncidenceData {
    type: TaskType
    externalId: number
    description: string
    comment?: string
    tech: string
    priority: Priority
    estimatedTime?: number | null
    assignees?: AssigneeWithHours[]
}


interface UpdateIncidenceData {
    status?: TaskStatus
    priority?: Priority
    comment?: string
    estimatedTime?: number | null
    description?: string
    technology?: string
    assignees?: AssigneeWithHours[]
    tasks?: { title: string; isCompleted: boolean }[]
}

export async function createIncidence(data: CreateIncidenceData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: t(locale, 'business.adminOnly') }
    }

    try {
        const tech = await db.technology.findUnique({ where: { name: data.tech } })
        if (!tech) {
            return { success: false, error: 'Tecnología no válida' }
        }

        const workItem = await db.externalWorkItem.upsert({
            where: { type_externalId: { type: data.type, externalId: data.externalId } },
            create: { type: data.type, externalId: data.externalId, title: data.description },
            update: { title: data.description },
        })
        revalidateTag('external-work-items', 'default')

        const existingIncidence = await db.incidence.findFirst({
            where: { externalWorkItemId: workItem.id },
        })
        if (existingIncidence) {
            return { success: false, error: t(locale, 'business.alreadyExists') }
        }

        const authorId = Number(session.user.id)

        await db.$transaction(async (tx) => {
            const incidence = await tx.incidence.create({
                data: {
                    externalWorkItemId: workItem.id,
                    description: data.description,
                    comment: data.comment,
                    technologyId: tech.id,
                    priority: data.priority as PrismaPriority,
                    estimatedTime: data.estimatedTime,
                    status: TaskStatus.BACKLOG,
                }
            })

            await ensureSystemScriptsPage(tx, incidence.id, authorId)
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error creating incidence:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: t(locale, 'business.alreadyExists') }
        }
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

interface GetIncidencesOptions {
    viewType: 'BACKLOG' | 'KANBAN'
    search?: string
    tech?: string[]
    status?: string
    assignee?: string[]
    mine?: boolean
    locale?: Locale
}

interface GetIncidencesResult {
    data: IncidenceWithDetails[]
    error?: string
}

export async function getIncidences({ viewType, search, tech, status, assignee, mine, locale = 'es' }: GetIncidencesOptions): Promise<GetIncidencesResult> {
    const session = await auth()
    if (!session?.user) return { data: [], error: t(locale, 'errors.unauthorized') }

    const isDev = session.user.role === 'DEV'

    try {
        const where: Record<string, unknown> = {}

        // View type filtering - only apply if no status filter
        if (!status && viewType === 'KANBAN') {
            where.status = { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW] }
        } else if (!status && viewType === 'BACKLOG') {
            where.status = TaskStatus.BACKLOG
        }

        // Search across multiple fields
        if (search) {
            // Try to parse as number for externalId search
            const searchNumber = parseInt(search, 10)
            const isValidNumber = !isNaN(searchNumber)
            
            const orConditions = [
                { description: { contains: search, mode: 'insensitive' } },
                { comment: { contains: search, mode: 'insensitive' } }
            ] as unknown[]

            // Add externalId search only if valid number (via ExternalWorkItem relation)
            if (isValidNumber) {
                orConditions.push({ externalWorkItem: { externalId: searchNumber } })
            }
            
            where.OR = orConditions
        }

        // Technology filter
        if (tech && tech.length > 0) {
            const techIds = tech.map(Number).filter(id => !isNaN(id))
            if (techIds.length > 0) {
                where.technology = { id: { in: techIds } }
            }
        }

        // Status filter (only for backlog)
        if (status && viewType === 'BACKLOG') {
            const statusValues = status.split(',').filter(Boolean)
            const validStatus = statusValues.filter(s => Object.values(TaskStatus).includes(s as TaskStatus)) as TaskStatus[]
            
            if (validStatus.length > 0) {
                if (validStatus.length === 1) {
                    where.status = validStatus[0]
                } else {
                    where.status = { in: validStatus }
                }
            }
        }

        // Assignee filter
        // DEV: always filter by logged user
        // ADMIN: filter only if mine is true or assignee filter is applied
        if (isDev) {
            where.assignments = {
                some: {
                    isAssigned: true,
                    userId: Number(session.user.id)
                }
            }
        } else if (mine || (assignee && assignee.length > 0)) {
            const userIds = assignee && assignee.length > 0 ? assignee.map(Number) : [Number(session.user.id)]
            where.assignments = {
                some: {
                    isAssigned: true,
                    userId: { in: userIds }
                }
            }
        }

        const incidences = await db.incidence.findMany({
            where,
            include: incidenceDetailsInclude,
            orderBy: viewType === 'BACKLOG' ? [
                {
                    priority: 'desc'
                },
                {
                    position: 'asc'
                }
            ] : [
                {
                    priority: 'desc'
                },
                {
                    position: 'asc'
                }
            ]
        })

        // Filtrado para DEV: ocultar incidencias en IN_PROGRESS si el usuario completó todas sus tareas
        let filteredIncidences: IncidenceDetailsPayload[] = incidences
        if (isDev && viewType === 'KANBAN') {
            const userId = Number(session.user.id)
            filteredIncidences = incidences.filter((incidence) => {
                // Mostrar TODO y REVIEW sin filtro adicional
                if (incidence.status === TaskStatus.TODO || incidence.status === TaskStatus.REVIEW) {
                    return true
                }
                // Para IN_PROGRESS: mostrar solo si tiene subtareas pendientes del usuario
                if (incidence.status === TaskStatus.IN_PROGRESS) {
                    const myAssignment = incidence.assignments.find(a => a.userId === userId)
                    if (!myAssignment) return false
                    const myPendingTasks = myAssignment.tasks.filter(t => !t.isCompleted).length
                    return myAssignment.tasks.length === 0 || myPendingTasks > 0
                }
                return true
            })
        }

        return { data: filteredIncidences as IncidenceWithDetails[] }
    } catch (error) {
        console.error('Error getting incidences:', error)
        return { data: [], error: t(locale as Locale, 'errors.fetchError') }
    }
}

export async function getIncidence(id: number): Promise<IncidenceWithDetails | null> {
    try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const incidence = await getIncidenceCached(id)
        return incidence as IncidenceWithDetails | null
    } catch (error) {
        console.error('Error getting incidence:', error)
        return null
    }
}

interface GetIncidenceWithUsersResult {
    incidence: IncidenceWithDetails | null
    users: { id: number; name: string | null; username: string; role: string }[]
}

export async function getIncidencePageData(id: number): Promise<{
    incidence: IncidenceWithDetails | null
    users: { id: number; name: string | null; username: string; role: string }[]
}> {
    try {
        const [incidence, users] = await Promise.all([
            getIncidenceCached(id),
            getUsersCached()
        ])

        return {
            incidence: incidence as IncidenceWithDetails | null,
            users
        }
    } catch (error) {
        console.error('Error getting incidence page data:', error)
        return { incidence: null, users: [] }
    }
}

export async function getIncidenceWithUsers(type: TaskType, externalId: number): Promise<GetIncidenceWithUsersResult> {
    try {
        const [incidence, users] = await Promise.all([
            db.incidence.findFirst({
                where: {
                    externalWorkItem: { type, externalId }
                },
                include: incidenceDetailsInclude
            }),
            getUsersCached()
        ])

        return {
            incidence: incidence as IncidenceWithDetails | null,
            users
        }
    } catch (error) {
        console.error('Error getting incidence with users:', error)
        return { incidence: null, users: [] }
    }
}

export async function updateIncidenceStatus(incidenceId: number, newStatus: TaskStatus, newPosition: number, locale: Locale = 'es') {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            include: {
                assignments: {
                    where: { isAssigned: true }
                }
            }
        })

        if (!incidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        const isBacklogToTodo = incidence.status === TaskStatus.BACKLOG && newStatus === TaskStatus.TODO

        if (isBacklogToTodo) {
            const errors: string[] = []

            if (!incidence.estimatedTime || incidence.estimatedTime <= 0) {
                errors.push(t(locale, 'business.estimatedTimeRequired'))
            }

            if (incidence.assignments.length === 0) {
                errors.push(t(locale, 'business.assigneeRequired'))
            }

            if (errors.length > 0) {
                return { success: false, error: t(locale, 'business.cannotMoveToDev', { errors: errors.join(', ') }) }
            }
        }

        if (newStatus === TaskStatus.DONE) {
            if (session.user.role !== 'ADMIN') {
                return { success: false, error: t(locale, 'business.adminOnly') }
            }
        }

        if (session.user.role !== 'ADMIN') {
            const isAssigned = incidence.assignments.some(a => a.userId === Number(session.user.id))
            if (!isAssigned) {
                return { success: false, error: t(locale, 'business.assigneeOnly') }
            }
        }

        await db.incidence.update({
            where: { id: incidenceId },
            data: {
                status: newStatus,
                position: newPosition
            }
        })

        await db.ticketQA.updateMany({
            where: { incidenceId },
            data: { hasUnreadUpdates: true },
        })

        await syncLinkedTickets(incidenceId, newStatus)

        revalidatePath('/dashboard')
        revalidatePath('/tracklists')
        return { success: true }
    } catch (error) {
        console.error('Error updating status:', error)
        return { success: false, error: t(locale, 'errors.updateError') }
    }
}

interface UpdateTaskOrderParams {
    taskId: number
    overTaskId: number
}

export async function updateTaskOrder({ taskId, overTaskId }: UpdateTaskOrderParams, locale: Locale = 'es') {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

        // Obtener la tarea que se está moviendo para obtener su status y priority
        const task = await db.incidence.findUnique({ where: { id: taskId } })
        if (!task) {
            return { success: false, error: 'Tarea activa no encontrada' }
        }

        // Obtener todas las tareas con el mismo status y priority, ordenadas por position ASC, luego por createdAt ASC
        const allTasks = await db.incidence.findMany({
            where: { status: task.status, priority: task.priority },
            orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' }
            ]
        })

        // Encontrar índices de las tareas
        const activeIndex = allTasks.findIndex(t => t.id === taskId)
        const overIndex = allTasks.findIndex(t => t.id === overTaskId)

        if (activeIndex === -1) {
            console.error(`Task ${taskId} not found. Available tasks:`, allTasks.map(t => ({ id: t.id, status: t.status })))
            return { success: false, error: 'Tarea activa no encontrada' }
        }

        if (overIndex === -1) {
            console.error(`Over task ${overTaskId} not found. Available tasks:`, allTasks.map(t => ({ id: t.id, status: t.status })))
            return { success: false, error: 'Tarea objetivo no encontrada' }
        }

        // Detectar si hay posiciones duplicadas y rebalancear si es necesario
        const uniquePositions = new Set(allTasks.map(t => t.position))
        const needsRebalance = uniquePositions.size !== allTasks.length || 
                               (uniquePositions.size === 1 && allTasks.length > 1)

        if (needsRebalance) {
            for (let i = 0; i < allTasks.length; i++) {
                await db.incidence.update({
                    where: { id: allTasks[i].id },
                    data: { position: i * 1000 }
                })
                allTasks[i].position = i * 1000
            }
        }

        // Determinar dirección del movimiento usando índices originales
        const movingDown = activeIndex < overIndex
        
        // Crear array sin la tarea movida para calcular posición correctamente
        const tasksWithoutActive = allTasks.filter(t => t.id !== taskId)
        
        // Encontrar el índice donde se soltó en el nuevo array
        const newOverIndex = tasksWithoutActive.findIndex(t => t.id === overTaskId)

        // Calcular nueva posición según la dirección del movimiento
        let newPosition: number

        if (movingDown) {
            // Moviendo hacia abajo: colocar DESPUÉS de la tarea objetivo
            if (newOverIndex >= tasksWithoutActive.length - 1) {
                // Soltar después de la última
                const lastPos = tasksWithoutActive[tasksWithoutActive.length - 1]?.position ?? 0
                newPosition = lastPos + 100
            } else {
                // Soltar entre la tarea objetivo y la siguiente
                const overTask = tasksWithoutActive[newOverIndex]
                const nextTask = tasksWithoutActive[newOverIndex + 1]
                newPosition = (overTask.position + nextTask.position) / 2
            }
        } else {
            // Moviendo hacia arriba: colocar ANTES de la tarea objetivo
            if (newOverIndex <= 0) {
                // Soltar antes de la primera
                const firstPos = tasksWithoutActive[0]?.position ?? 0
                newPosition = firstPos - 100
            } else {
                // Soltar entre la tarea anterior y la objetivo
                const prevTask = tasksWithoutActive[newOverIndex - 1]
                const overTask = tasksWithoutActive[newOverIndex]
                newPosition = (prevTask.position + overTask.position) / 2
            }
        }

        // Verificar permisos
        const incidence = await db.incidence.findUnique({
            where: { id: taskId },
            include: { assignments: { where: { isAssigned: true } } }
        })

        if (!incidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        if (session.user.role !== 'ADMIN') {
            const isAssigned = incidence.assignments.some(a => a.userId === Number(session.user.id))
            if (!isAssigned) {
                return { success: false, error: t(locale, 'business.assigneeOnly') }
            }
        }

        // Actualizar la posición
        await db.incidence.update({
            where: { id: taskId },
            data: { position: newPosition }
        })

        revalidatePath('/dashboard')
        return { success: true, newPosition }
    } catch (error) {
        console.error('Error updating task order:', error)
        return { success: false, error: t(locale, 'errors.updateError') }
    }
}

export async function updateIncidence(id: number, data: UpdateIncidenceData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

    try {
        const currentIncidence = await db.incidence.findUnique({
            where: { id },
            include: {
                assignments: true
            }
        })

        if (!currentIncidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        let techConnect = undefined
        if (data.technology) {
            const tech = await db.technology.findUnique({ where: { name: data.technology } })
            if (tech) {
                techConnect = { connect: { id: tech.id } }
            }
        }
        
        const updateData: Record<string, unknown> = {
            status: data.status,
            priority: data.priority,
            comment: data.comment,
            estimatedTime: data.estimatedTime,
            description: data.description,
            technology: techConnect,
        }

        // Si se proporcionan asignados, manejar la creación/actualización de assignments
        if (data.assignees) {
            const currentAssignments = await db.assignment.findMany({
                where: { incidenceId: id }
            })
            
            const currentUserIds = currentAssignments.map(a => a.userId)
            const newUserIds = data.assignees.map(a => a.userId)
            
            // Desactivar assignments que ya no están seleccionados (isAssigned: false)
            const toDeactivate = currentUserIds.filter(uid => !newUserIds.includes(uid))
            if (toDeactivate.length > 0) {
                await db.assignment.updateMany({
                    where: {
                        incidenceId: id,
                        userId: { in: toDeactivate }
                    },
                    data: { isAssigned: false }
                })
            }
            
            // Crear o actualizar assignments
            for (const assignee of data.assignees) {
                await db.assignment.upsert({
                    where: {
                        incidenceId_userId: {
                            incidenceId: id,
                            userId: assignee.userId
                        }
                    },
                    update: {
                        assignedHours: assignee.assignedHours,
                        isAssigned: true
                    },
                    create: {
                        incidenceId: id,
                        userId: assignee.userId,
                        assignedHours: assignee.assignedHours,
                        isAssigned: true
                    }
                })
            }
        }

        await db.incidence.update({
            where: { id },
            data: updateData
        })

        // Verificar si debe reabrirse automáticamente (tareas nuevas en estado DONE)
        const hasNewTasks = data.tasks && data.tasks.length > 0
        const isCurrentlyDone = currentIncidence.status === TaskStatus.DONE

        if (isCurrentlyDone && hasNewTasks) {
            await db.incidence.update({
                where: { id },
                data: {
                    status: TaskStatus.IN_PROGRESS,
                    completedAt: null
                }
            })
        } else {
            // Verificar transiciones BACKLOG <-> TODO basadas en condiciones
            const updatedIncidence = await db.incidence.findUnique({
                where: { id },
                include: {
                    assignments: {
                        where: { isAssigned: true }
                    }
                }
            })

            if (updatedIncidence) {
                const hasEstimatedTime = updatedIncidence.estimatedTime && updatedIncidence.estimatedTime > 0
                const hasAssignees = updatedIncidence.assignments.length > 0
                const allConditionsMet = hasEstimatedTime && hasAssignees

                const isBacklogToTodo = currentIncidence.status === TaskStatus.BACKLOG && allConditionsMet
                const isActiveToBacklog = (currentIncidence.status === TaskStatus.TODO || 
                                           currentIncidence.status === TaskStatus.IN_PROGRESS || 
                                           currentIncidence.status === TaskStatus.REVIEW) && !allConditionsMet

                if (isBacklogToTodo || isActiveToBacklog) {
                    await db.incidence.update({
                        where: { id },
                        data: {
                            status: isBacklogToTodo ? TaskStatus.TODO : TaskStatus.BACKLOG
                        }
                    })
                    if (isBacklogToTodo) {
                        await syncLinkedTickets(id, TaskStatus.TODO)
                    }
                }
            }
        }

        const finalIncidence = await db.incidence.findUnique({
            where: { id },
            include: incidenceDetailsInclude
        })

        if (!finalIncidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        revalidatePath('/dashboard')
        revalidatePath('/tracklists')
        return { success: true, data: finalIncidence as IncidenceWithDetails }
    } catch (error) {
        console.error('Error updating incidence:', error)
        return { success: false, error: 'Error al actualizar.' }
    }
}

export async function updateIncidenceComment(incidenceId: number, comment: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            include: { assignments: { where: { isAssigned: true } } }
        })

        if (!incidence) return { success: false, error: 'Incidencia no encontrada' }

        const isAssigned = incidence.assignments.some(a => a.userId === Number(session.user.id))
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssigned && !isAdmin) {
            return { success: false, error: 'No autorizado para editar esta incidencia' }
        }

        await db.incidence.update({
            where: { id: incidenceId },
            data: { comment }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error updating comment:', error)
        return { success: false, error: 'Error al actualizar el comentario.' }
    }
}

export async function createTask(assignmentId: number, title: string, isCompleted: boolean = false) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const assignment = await db.assignment.findUnique({
            where: { id: assignmentId },
            include: { incidence: true }
        })

        if (!assignment) return { success: false, error: 'Asignación no encontrada' }

        const isAssignedUser = assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        // Validaciones restrictivas para estados bloqueados
        const currentStatus = assignment.incidence.status

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden agregar tareas en revisión' }
        }

        const isReopening = currentStatus === TaskStatus.DONE

        const result = await db.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    title,
                    assignmentId,
                    isCompleted,
                    isQaReported: false
                }
            })

            let reopened = false

            if (isReopening) {
                await tx.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: {
                        status: TaskStatus.IN_PROGRESS,
                        completedAt: null
                    }
                })
                reopened = true
            } else if (currentStatus === TaskStatus.TODO) {
                await tx.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.IN_PROGRESS }
                })
            }

            return { task, reopened }
        })

        // Sync linked tickets for reopening (DONE → IN_PROGRESS) and TODO → IN_PROGRESS transitions
        if (result.reopened) {
            await syncLinkedTickets(assignment.incidenceId, TaskStatus.IN_PROGRESS)
        } else if (currentStatus === TaskStatus.TODO) {
            await syncLinkedTickets(assignment.incidenceId, TaskStatus.IN_PROGRESS)
        }

        // Check if all tasks are completed and auto-transition to REVIEW
        let autoTransitionedToReview = false
        let message = result.reopened ? 'Incidencia reabierta automáticamente' : 'Tarea creada'

        if (isCompleted && (currentStatus === TaskStatus.IN_PROGRESS || currentStatus === TaskStatus.TODO)) {
            const allTasks = await db.task.findMany({
                where: {
                    assignment: {
                        incidenceId: assignment.incidenceId
                    }
                }
            })

            const allCompleted = allTasks.length > 0 && allTasks.every(t => t.isCompleted)

            if (allCompleted) {
                await db.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                await syncLinkedTickets(assignment.incidenceId, TaskStatus.REVIEW)
                autoTransitionedToReview = true
                message = '¡Todas las tareas completadas! La incidencia pasó a revisión'
            }
        }

        revalidatePath('/dashboard')
        revalidatePath('/tracklists')
        return {
            success: true,
            data: result.task,
            reopened: result.reopened,
            autoTransitionedToReview,
            message
        }
    } catch (error) {
        console.error('Error creating task:', error)
        return { success: false, error: 'Error al crear tarea' }
    }
}

export async function toggleTask(taskId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!task) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = task.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        // Validaciones restrictivas para estados bloqueados
        const currentStatus = task.assignment.incidence.status
        
        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede modificar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden modificar tareas en revisión' }
        }

        const newCompletionStatus = !task.isCompleted

        await db.task.update({
            where: { id: taskId },
            data: {
                isCompleted: newCompletionStatus,
                completedAt: newCompletionStatus ? new Date() : null
            }
        })

        // Check for auto-transitions based on task completion status
        let autoTransitionedToReview = false
        let autoTransitionedToInProgress = false
        let message = 'Tarea actualizada'

        if (newCompletionStatus && (currentStatus === TaskStatus.IN_PROGRESS || currentStatus === TaskStatus.TODO)) {
            // If coming from TODO, first transition to IN_PROGRESS
            if (currentStatus === TaskStatus.TODO) {
                await db.incidence.update({
                    where: { id: task.assignment.incidenceId },
                    data: { status: TaskStatus.IN_PROGRESS }
                })
                await syncLinkedTickets(task.assignment.incidenceId, TaskStatus.IN_PROGRESS)
            }
            // Transition to REVIEW when all tasks are completed
            const allTasks = await db.task.findMany({
                where: {
                    assignment: {
                        incidenceId: task.assignment.incidenceId
                    }
                }
            })

            const allCompleted = allTasks.length > 0 && allTasks.every(t => t.isCompleted)

            if (allCompleted) {
                await db.incidence.update({
                    where: { id: task.assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                await syncLinkedTickets(task.assignment.incidenceId, TaskStatus.REVIEW)
                autoTransitionedToReview = true
                message = '¡Todas las tareas completadas! La incidencia pasó a revisión'
            }
        } else if (!newCompletionStatus && currentStatus === TaskStatus.REVIEW) {
            // Transition to IN_PROGRESS when unchecking a task in REVIEW status
            await db.incidence.update({
                where: { id: task.assignment.incidenceId },
                data: { status: TaskStatus.IN_PROGRESS }
            })
            await syncLinkedTickets(task.assignment.incidenceId, TaskStatus.IN_PROGRESS)
            autoTransitionedToInProgress = true
            message = 'Incidencia regresada a progreso'
        }

        revalidatePath('/dashboard')
        revalidatePath('/tracklists')
        return {
            success: true,
            message,
            autoTransitionedToReview,
            autoTransitionedToInProgress
        }
    } catch (error) {
        console.error('Error toggling task:', error)
        return { success: false, error: 'Error al actualizar tarea' }
    }
}

export async function completeIncidenceCore(incidenceId: number) {
    const incidence = await db.incidence.findUnique({
        where: { id: incidenceId },
        include: {
            assignments: {
                where: { isAssigned: true },
                include: { tasks: true }
            }
        }
    })
    if (!incidence) return

    const now = new Date()

    await db.$transaction(async (tx) => {
        const assignmentIds = incidence.assignments.map(a => a.id)

        if (assignmentIds.length > 0) {
            await tx.task.updateMany({
                where: {
                    assignmentId: { in: assignmentIds }
                },
                data: {
                    isCompleted: true,
                    completedAt: now
                }
            })
        }

        await tx.incidence.update({
            where: { id: incidenceId },
            data: {
                status: TaskStatus.DONE,
                completedAt: now
            }
        })
    })
}

export async function completeIncidence(incidenceId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            select: { id: true }
        })

        if (!incidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        if (session.user.role !== 'ADMIN') {
            return { success: false, error: t(locale, 'business.adminOnly') }
        }

        await completeIncidenceCore(incidenceId)

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error completing incidence:', error)
        return { success: false, error: t(locale, 'errors.updateError') }
    }
}

export async function deleteTask(taskId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!task) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = task.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        // Validaciones restrictivas para estados bloqueados
        const currentStatus = task.assignment.incidence.status
        const isQaReported = (task as typeof task & { isQaReported?: boolean }).isQaReported === true
        
        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede eliminar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden eliminar tareas en revisión' }
        }
        if (isQaReported) {
            return { success: false, error: 'No puede eliminar tareas reportadas por QA' }
        }

        // Eliminar la subtarea
        await db.task.delete({
            where: { id: taskId }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Tarea eliminada' }
    } catch (error) {
        console.error('Error deleting task:', error)
        return { success: false, error: 'Error al eliminar tarea' }
    }
}

export async function updateTaskTitle(taskId: number, newTitle: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!task) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = task.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        const isQaReported = (task as typeof task & { isQaReported?: boolean }).isQaReported === true

        if (task.isCompleted) {
            return { success: false, error: 'No puede editar tareas completadas' }
        }
        if (isQaReported) {
            return { success: false, error: 'No puede editar tareas reportadas por QA' }
        }

        const currentStatus = task.assignment.incidence.status

        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede modificar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden modificar tareas en revisión' }
        }

        await db.task.update({
            where: { id: taskId },
            data: { title: newTitle }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Tarea actualizada' }
    } catch (error) {
        console.error('Error updating task title:', error)
        return { success: false, error: 'Error al actualizar tarea' }
    }
}

export async function deleteIncidence(incidenceId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    if (session.user.role !== 'ADMIN') {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        if (incidence.status === TaskStatus.DONE) {
            return { success: false, error: 'No se pueden eliminar incidencias completadas' }
        }

        if (incidence.status === TaskStatus.REVIEW) {
            return { success: false, error: 'No se pueden eliminar incidencias en revisión' }
        }

        await db.incidence.delete({
            where: { id: incidenceId }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Incidencia eliminada' }
    } catch (error) {
        console.error('Error deleting incidence:', error)
        return { success: false, error: 'Error al eliminar incidencia' }
    }
}

interface RejectTicketInput {
    ticketId: number
    description: string
    observations?: string
    tracklistId: number
}

export async function rejectTicket({ ticketId, description, observations, tracklistId }: RejectTicketInput) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    if (!description || description.trim().length < 3) {
        return { success: false, error: 'La descripción debe tener al menos 3 caracteres' }
    }
    if (observations && observations.trim().length > 1000) {
        return { success: false, error: 'La observación no puede superar los 1000 caracteres' }
    }

    try {
        const ticket = await db.ticketQA.findUnique({
            where: { id: ticketId },
            include: { incidence: { include: { assignments: true } } }
        })

        if (!ticket) return { success: false, error: 'Ticket no encontrado' }
        if (ticket.status !== TicketQAStatus.TEST)
            return { success: false, error: 'Solo se pueden rechazar tickets en estado Test' }
        if (!ticket.incidenceId || !ticket.incidence)
            return { success: false, error: 'El ticket no tiene incidencia asociada' }
        if (!ticket.assignedToId)
            return { success: false, error: 'El ticket no tiene DEV asignado' }

        const assignment = ticket.incidence.assignments.find(a => a.userId === ticket.assignedToId)
        if (!assignment)
            return { success: false, error: 'No se encontró la asignación del DEV responsable' }

        const rejectionDetail = description.trim()
        const rejectionTitle =
            rejectionDetail.length > 120
                ? `${rejectionDetail.slice(0, 117)}...`
                : rejectionDetail
        const rejectionObservations = observations?.trim() || null

        await db.$transaction(async (tx) => {
            await tx.task.create({
                data: {
                    title: rejectionTitle,
                    description: rejectionObservations,
                    assignmentId: assignment.id,
                    isQaReported: true,
                    isCompleted: false
                }
            })
            await tx.incidence.update({
                where: { id: ticket.incidenceId! },
                data: { status: TaskStatus.IN_PROGRESS }
            })
        })

        await syncLinkedTickets(ticket.incidenceId, TaskStatus.IN_PROGRESS)

        revalidatePath(`/tracklists/${tracklistId}`)
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error rejecting ticket:', error)
        return { success: false, error: 'Error al rechazar el ticket' }
    }
}

export async function searchActiveIncidences(query: string, selectedIncidences: number[] = []) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const trimmedQuery = query.trim()
        if (trimmedQuery.length < 3) {
            return { success: true, data: [] }
        }

        const queryNumber = parseInt(trimmedQuery, 10)
        const isValidNumber = !isNaN(queryNumber)

        const escapedQuery = trimmedQuery.replace(/_/g, '\\_')

        const where: Record<string, unknown> = {
            id: { notIn: selectedIncidences }
        }

        where.OR = isValidNumber
            ? [{ externalId: queryNumber }]
            : [{ title: { contains: escapedQuery, mode: 'insensitive' } }]

        const workItems = await db.externalWorkItem.findMany({
            where,
            select: {
                id: true,
                type: true,
                externalId: true,
                title: true
            },
            take: 10,
            orderBy: { externalId: 'asc' }
        })

        return { success: true, data: workItems }
    } catch (error) {
        console.error('Error searching incidences:', error)
        return { success: false, error: 'Error al buscar incidencias' }
    }
}
