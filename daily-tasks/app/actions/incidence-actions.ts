'use server'

import { cache } from 'react'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Priority as PrismaPriority, TaskStatus, TaskType } from '@prisma/client'
import { Priority } from '@/types/enums'
import { IncidenceWithDetails, AssigneeWithHours } from '@/types'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'

const getIncidenceCached = cache(async (id: number) => {
    return db.incidence.findUnique({
        where: { id },
            include: {
                externalWorkItem: true,
                technology: true,
                assignments: {
                where: { isAssigned: true },
                include: {
                    user: true,
                    tasks: {
                        orderBy: [
                            { isCompleted: 'asc' },
                            { completedAt: 'desc' }
                        ]
                    }
                }
            },
            attachments: {
                include: {
                    uploadedBy: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            pages: {
                include: {
                    author: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
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
    title: string
    description?: string
    tech: string
    priority: Priority
    estimatedTime?: number | null
    assignees?: AssigneeWithHours[]
}


interface UpdateIncidenceData {
    status?: TaskStatus
    priority?: Priority
    description?: string
    comment?: string
    estimatedTime?: number | null
    title?: string
    technology?: string
    assignees?: AssigneeWithHours[]
    subTasks?: { title: string; isCompleted: boolean }[]
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
            create: { type: data.type, externalId: data.externalId, title: data.title },
            update: { title: data.title },
        })

        await db.incidence.create({
            data: {
                externalWorkItemId: workItem.id,
                title: data.title,
                comment: data.description,
                technologyId: tech.id,
                priority: data.priority as PrismaPriority,
                estimatedTime: data.estimatedTime,
                status: TaskStatus.BACKLOG,
            }
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
                { title: { contains: search, mode: 'insensitive' } },
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
            include: {
                externalWorkItem: true,
                technology: true,
                assignments: {
                    where: { isAssigned: true },
                    include: {
                        user: true,
                        tasks: {
                            orderBy: [
                                { isCompleted: 'asc' },
                                { completedAt: 'desc' }
                            ]
                        }
                    }
                }
            },
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
        let filteredIncidences = incidences as IncidenceWithDetails[]
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
            }) as IncidenceWithDetails[]
        }

        return { data: filteredIncidences }
    } catch (error) {
        console.error('Error getting incidences:', error)
        return { data: [], error: t(locale as Locale, 'errors.fetchError') }
    }
}

export async function getIncidence(id: number): Promise<IncidenceWithDetails | null> {
    try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const incidence = await getIncidenceCached(id)
        return incidence as IncidenceWithDetails
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
            incidence: incidence as IncidenceWithDetails,
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
                include: {
                    externalWorkItem: true,
                    assignments: {
                        where: { isAssigned: true },
                        include: {
                            user: true,
                            tasks: {
                                orderBy: {
                                    createdAt: 'asc'
                                }
                            }
                        }
                    },
                    attachments: {
                        include: {
                            uploadedBy: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            }),
            getUsersCached()
        ])

        return {
            incidence: incidence as IncidenceWithDetails,
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

        revalidatePath('/dashboard')
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
            comment: data.description,
            estimatedTime: data.estimatedTime,
            title: data.title,
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
        const hasNewSubTasks = data.subTasks && data.subTasks.length > 0
        const isCurrentlyDone = currentIncidence.status === TaskStatus.DONE

        if (isCurrentlyDone && hasNewSubTasks) {
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
                }
            }
        }

        const finalIncidence = await db.incidence.findUnique({
            where: { id },
            include: {
                assignments: {
                    include: {
                        user: true,
                        tasks: {
                            orderBy: [
                                { isCompleted: 'asc' },
                                { completedAt: 'desc' }
                            ]
                        }
                    }
                }
            }
        })

        revalidatePath('/dashboard')
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

export async function createSubTask(assignmentId: number, title: string, isCompleted: boolean = false) {
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
            const subTask = await tx.subTask.create({
                data: {
                    title,
                    assignmentId,
                    isCompleted
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
            }

            return { subTask, reopened }
        })

        // Check if all tasks are completed and auto-transition to REVIEW
        let autoTransitionedToReview = false
        let message = result.reopened ? 'Incidencia reabierta automáticamente' : 'Tarea creada'

        if (isCompleted && currentStatus === TaskStatus.IN_PROGRESS) {
            const allSubTasks = await db.subTask.findMany({
                where: {
                    assignment: {
                        incidenceId: assignment.incidenceId
                    }
                }
            })

            const allCompleted = allSubTasks.length > 0 && allSubTasks.every(t => t.isCompleted)

            if (allCompleted) {
                await db.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedToReview = true
                message = '¡Todas las tareas completadas! La incidencia pasó a revisión'
            }
        }

        revalidatePath('/dashboard')
        return {
            success: true,
            data: result.subTask,
            reopened: result.reopened,
            autoTransitionedToReview,
            message
        }
    } catch (error) {
        console.error('Error creating subtask:', error)
        return { success: false, error: 'Error al crear tarea' }
    }
}

export async function toggleSubTask(subTaskId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const subTask = await db.subTask.findUnique({
            where: { id: subTaskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!subTask) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = subTask.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        // Validaciones restrictivas para estados bloqueados
        const currentStatus = subTask.assignment.incidence.status
        
        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede modificar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden modificar tareas en revisión' }
        }

        const newCompletionStatus = !subTask.isCompleted

        await db.subTask.update({
            where: { id: subTaskId },
            data: {
                isCompleted: newCompletionStatus,
                completedAt: newCompletionStatus ? new Date() : null
            }
        })

        // Check for auto-transitions based on task completion status
        let autoTransitionedToReview = false
        let autoTransitionedToInProgress = false
        let message = 'Tarea actualizada'

        if (newCompletionStatus && currentStatus === TaskStatus.IN_PROGRESS) {
            // Transition to REVIEW when all tasks are completed
            const allSubTasks = await db.subTask.findMany({
                where: {
                    assignment: {
                        incidenceId: subTask.assignment.incidenceId
                    }
                }
            })

            const allCompleted = allSubTasks.length > 0 && allSubTasks.every(t => t.isCompleted)

            if (allCompleted) {
                await db.incidence.update({
                    where: { id: subTask.assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedToReview = true
                message = '¡Todas las tareas completadas! La incidencia pasó a revisión'
            }
        } else if (!newCompletionStatus && currentStatus === TaskStatus.REVIEW) {
            // Transition to IN_PROGRESS when unchecking a task in REVIEW status
            await db.incidence.update({
                where: { id: subTask.assignment.incidenceId },
                data: { status: TaskStatus.IN_PROGRESS }
            })
            autoTransitionedToInProgress = true
            message = 'Incidencia regresada a progreso'
        }

        revalidatePath('/dashboard')
        return {
            success: true,
            message,
            autoTransitionedToReview,
            autoTransitionedToInProgress
        }
    } catch (error) {
        console.error('Error toggling subtask:', error)
        return { success: false, error: 'Error al actualizar tarea' }
    }
}

export async function completeIncidence(incidenceId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            include: {
                assignments: {
                    where: { isAssigned: true },
                    include: { tasks: true }
                }
            }
        })

        if (!incidence) {
            return { success: false, error: t(locale, 'errors.notFound') }
        }

        if (session.user.role !== 'ADMIN') {
            return { success: false, error: t(locale, 'business.adminOnly') }
        }

        const now = new Date()

        await db.$transaction(async (tx) => {
            const assignmentIds = incidence.assignments.map(a => a.id)

            if (assignmentIds.length > 0) {
                await tx.subTask.updateMany({
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

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error completing incidence:', error)
        return { success: false, error: t(locale, 'errors.updateError') }
    }
}

export async function deleteSubTask(subTaskId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const subTask = await db.subTask.findUnique({
            where: { id: subTaskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!subTask) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = subTask.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        // Validaciones restrictivas para estados bloqueados
        const currentStatus = subTask.assignment.incidence.status
        
        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede eliminar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden eliminar tareas en revisión' }
        }

        // Eliminar la subtarea
        await db.subTask.delete({
            where: { id: subTaskId }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Tarea eliminada' }
    } catch (error) {
        console.error('Error deleting subtask:', error)
        return { success: false, error: 'Error al eliminar tarea' }
    }
}

export async function updateSubTaskTitle(subTaskId: number, newTitle: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const subTask = await db.subTask.findUnique({
            where: { id: subTaskId },
            include: { assignment: { include: { incidence: true } } }
        })

        if (!subTask) return { success: false, error: 'Tarea no encontrada' }

        const isAssignedUser = subTask.assignment.userId === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isAssignedUser && !isAdmin) {
            return { success: false, error: 'No autorizado' }
        }

        if (subTask.isCompleted) {
            return { success: false, error: 'No puede editar tareas completadas' }
        }

        const currentStatus = subTask.assignment.incidence.status

        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede modificar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden modificar tareas en revisión' }
        }

        await db.subTask.update({
            where: { id: subTaskId },
            data: { title: newTitle }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Tarea actualizada' }
    } catch (error) {
        console.error('Error updating subtask title:', error)
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
