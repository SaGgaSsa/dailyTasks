'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Priority, TechStack, TaskStatus, TaskType } from '@/types/enums'
import { IncidenceWithDetails, AssigneeWithHours } from '@/types'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'

interface CreateIncidenceData {
    type: TaskType
    externalId: number
    title: string
    description?: string
    tech: TechStack
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
    technology?: TechStack
    assignees?: AssigneeWithHours[]
    subTasks?: { title: string; isCompleted: boolean }[]
}

export async function createIncidence(data: CreateIncidenceData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: t(locale, 'business.adminOnly') }
    }

    try {
        await db.incidence.create({
            data: {
                type: data.type,
                externalId: data.externalId,
                title: data.title,
                description: data.description,
                technology: data.tech,
                priority: data.priority,
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
        }

        // Search across multiple fields
        if (search) {
            // Try to parse as number for externalId search
            const searchNumber = parseInt(search, 10)
            const isValidNumber = !isNaN(searchNumber)
            
            const orConditions = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ] as unknown[]
            
            // Add externalId search only if valid number
            if (isValidNumber) {
                orConditions.push({ externalId: searchNumber })
            }
            
            where.OR = orConditions
        }

        // Technology filter
        if (tech && tech.length > 0) {
            // Filter valid TechStack values and convert to proper type
            const validTech = tech.filter(t => Object.values(TechStack).includes(t as TechStack)) as TechStack[]
            if (validTech.length > 0) {
                where.technology = { in: validTech }
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
        return { data: incidences as IncidenceWithDetails[] }
    } catch (error) {
        console.error('Error getting incidences:', error)
        return { data: [], error: t(locale as Locale, 'errors.fetchError') }
    }
}

export async function getIncidence(id: number): Promise<IncidenceWithDetails | null> {
    try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const incidence = await db.incidence.findUnique({
            where: { id },
            include: {
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
                }
            }
        })
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

export async function getIncidenceWithUsers(type: TaskType, externalId: number): Promise<GetIncidenceWithUsersResult> {
    try {
        const [incidence, users] = await Promise.all([
            db.incidence.findUnique({
                where: {
                    type_externalId: {
                        type,
                        externalId
                    }
                },
                include: {
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
                    }
                }
            }),
            db.user.findMany({
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
                    where: { isAssigned: true },
                    include: { tasks: true }
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
            
            const allSubTasks = incidence.assignments.flatMap((a) => a.tasks)
            const hasTasks = allSubTasks.length > 0
            const allTasksCompleted = hasTasks && allSubTasks.every((st) => st.isCompleted)
            
            if (!allTasksCompleted) {
                return { 
                    success: false, 
                    error: hasTasks 
                        ? t(locale, 'business.tasksPending')
                        : t(locale, 'business.noTasksCreated')
                }
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
    status: TaskStatus
}

export async function updateTaskOrder({ taskId, overTaskId, status }: UpdateTaskOrderParams, locale: Locale = 'es') {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: t(locale, 'errors.unauthorized') }

        // Obtener todas las tareas de la columna ordenadas por position ASC, luego por id para consistencia
        const tasksInColumn = await db.incidence.findMany({
            where: { status },
            orderBy: [
                { position: 'asc' },
                { id: 'asc' }
            ]
        })

        // Encontrar índices de las tareas
        const activeIndex = tasksInColumn.findIndex(t => t.id === taskId)
        const overIndex = tasksInColumn.findIndex(t => t.id === overTaskId)

        if (activeIndex === -1 || overIndex === -1) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Detectar si todas las tareas tienen posiciones duplicadas (caso inicial)
        const uniquePositions = new Set(tasksInColumn.map(t => t.position))
        const needsRebalance = uniquePositions.size !== tasksInColumn.length || 
                               (uniquePositions.size === 1 && tasksInColumn.length > 1)

        // Si necesita rebalanceo, asignar posiciones secuenciales
        if (needsRebalance) {
            for (let i = 0; i < tasksInColumn.length; i++) {
                await db.incidence.update({
                    where: { id: tasksInColumn[i].id },
                    data: { position: i * 1000 }
                })
                tasksInColumn[i].position = i * 1000
            }
        }

        // Determinar dirección del movimiento
        const movingDown = activeIndex < overIndex
        
        // Calcular nueva posición basada en la dirección
        let newPosition: number

        if (movingDown) {
            // Moviendo hacia abajo: colocar DESPUÉS de la tarea objetivo
            if (overIndex >= tasksInColumn.length - 1) {
                // Soltar después de la última
                const lastPos = tasksInColumn[tasksInColumn.length - 1]?.position ?? 0
                newPosition = lastPos + 100
            } else {
                // Soltar entre la tarea objetivo y la siguiente
                const overTask = tasksInColumn[overIndex]
                const nextTask = tasksInColumn[overIndex + 1]
                newPosition = (overTask.position + nextTask.position) / 2
            }
        } else {
            // Moviendo hacia arriba: colocar ANTES de la tarea objetivo
            if (overIndex <= 0) {
                // Soltar antes de la primera
                const firstPos = tasksInColumn[0]?.position ?? 0
                newPosition = firstPos - 100
            } else {
                // Soltar entre la tarea anterior y la objetivo
                const prevTask = tasksInColumn[overIndex - 1]
                const overTask = tasksInColumn[overIndex]
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

        const updateData: Record<string, unknown> = {
            status: data.status,
            priority: data.priority,
            description: data.description,
            estimatedTime: data.estimatedTime,
            title: data.title,
            technology: data.technology,
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

        // Verificar si debe cambiar estado automáticamente
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

        const finalIncidence = await db.incidence.findUnique({
            where: { id },
            include: {
                assignments: {
                    include: {
                        user: true,
                        tasks: {
                            orderBy: {
                                createdAt: 'asc'
                            }
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

export async function updateIncidenceComment(incidenceId: number, description: string) {
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
            data: { description }
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
        
        if (currentStatus === TaskStatus.DONE) {
            return { success: false, error: 'No puede agregar tareas en una incidencia finalizada' }
        }

        if (currentStatus === TaskStatus.REVIEW && !isAdmin) {
            return { success: false, error: 'Solo los administradores pueden agregar tareas en revisión' }
        }

        // Usar transacción para atomicidad
        const result = await db.$transaction(async (tx) => {
            const subTask = await tx.subTask.create({
                data: {
                    title,
                    assignmentId,
                    isCompleted
                }
            })

            // Verificar si todas las subtareas están completadas para auto-transición
            const assignments = await tx.assignment.findMany({
                where: { incidenceId: assignment.incidenceId, isAssigned: true },
                include: { tasks: true }
            })
            
            const allSubTasks = assignments.flatMap((a) => a.tasks)
            const allCompleted = allSubTasks.length > 0 && allSubTasks.every((st) => st.isCompleted)
            const anyCompleted = allSubTasks.some((st) => st.isCompleted)
            
            let autoTransitionedTo = null as string | null
            let message = 'Tarea creada'

            if (allCompleted && currentStatus === TaskStatus.IN_PROGRESS) {
                await tx.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedTo = 'REVIEW'
                message = "¡Trabajo técnico finalizado! La incidencia pasó a revisión"
            } else if (allCompleted && currentStatus === TaskStatus.TODO) {
                await tx.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedTo = 'REVIEW'
                message = "¡Trabajo técnico finalizado! La incidencia pasó a revisión"
            } else if (anyCompleted && currentStatus === TaskStatus.TODO) {
                await tx.incidence.update({
                    where: { id: assignment.incidenceId },
                    data: { status: TaskStatus.IN_PROGRESS }
                })
                autoTransitionedTo = 'IN_PROGRESS'
                message = "¡Tarea iniciada! La incidencia pasó a en progreso"
            }

            return { subTask, autoTransitionedTo, message }
        })

        revalidatePath('/dashboard')
        return { 
            success: true, 
            data: result.subTask,
            autoTransitionedToReview: result.autoTransitionedTo === 'REVIEW',
            autoTransitionedToInProgress: result.autoTransitionedTo === 'IN_PROGRESS',
            message: result.message
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

        // Usar transacción para atomicidad
        const result = await db.$transaction(async (tx) => {
            await tx.subTask.update({
                where: { id: subTaskId },
                data: { isCompleted: newCompletionStatus }
            })

            // Verificar si todas las subtareas están completadas para auto-transición
            const assignments = await tx.assignment.findMany({
                where: { incidenceId: subTask.assignment.incidenceId, isAssigned: true },
                include: { tasks: true }
            })
            
            const allSubTasks = assignments.flatMap((a) => a.tasks)
            const allCompleted = allSubTasks.length > 0 && allSubTasks.every((st) => st.isCompleted)
            const anyCompleted = allSubTasks.some((st) => st.isCompleted)
            
            let autoTransitionedTo = null as string | null
            let message = 'Tarea actualizada'

            if (allCompleted && currentStatus === TaskStatus.IN_PROGRESS) {
                await tx.incidence.update({
                    where: { id: subTask.assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedTo = 'REVIEW'
                message = "¡Trabajo técnico finalizado! La incidencia pasó a revisión"
            } else if (allCompleted && currentStatus === TaskStatus.TODO) {
                await tx.incidence.update({
                    where: { id: subTask.assignment.incidenceId },
                    data: { status: TaskStatus.REVIEW }
                })
                autoTransitionedTo = 'REVIEW'
                message = "¡Trabajo técnico finalizado! La incidencia pasó a revisión"
            } else if (anyCompleted && currentStatus === TaskStatus.TODO) {
                await tx.incidence.update({
                    where: { id: subTask.assignment.incidenceId },
                    data: { status: TaskStatus.IN_PROGRESS }
                })
                autoTransitionedTo = 'IN_PROGRESS'
                message = "¡Tarea iniciada! La incidencia pasó a en progreso"
            }

            return { autoTransitionedTo, message }
        })

        revalidatePath('/dashboard')
        return { 
            success: true, 
            autoTransitionedToReview: result.autoTransitionedTo === 'REVIEW',
            autoTransitionedToInProgress: result.autoTransitionedTo === 'IN_PROGRESS',
            message: result.message
        }
    } catch (error) {
        console.error('Error toggling subtask:', error)
        return { success: false, error: 'Error al actualizar tarea' }
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
