'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Priority, TechStack, TaskStatus, TaskType } from '@/types/enums'
import { IncidenceWithDetails, AssigneeWithHours } from '@/types'
import { auth } from '@/auth'

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

export async function createIncidence(data: CreateIncidenceData) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Solo los administradores pueden crear incidencias.' }
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
            return { success: false, error: 'Ya existe una incidencia con este tipo y número.' }
        }
        return { success: false, error: 'Error al crear la incidencia.' }
    }
}

interface GetIncidencesOptions {
    viewType: 'BACKLOG' | 'KANBAN'
    search?: string
    tech?: string[]
    status?: string
    assignee?: string[]
}

export async function getIncidences({ viewType, search, tech, status, assignee }: GetIncidencesOptions): Promise<IncidenceWithDetails[]> {
    const session = await auth()
    if (!session?.user) return []

    try {
        const where: Record<string, unknown> = {}

        // View type filtering
        if (viewType === 'KANBAN') {
            where.status = { not: TaskStatus.BACKLOG }
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
            where.technology = { in: tech }
        }

        // Status filter (only for backlog)
        if (status && viewType === 'BACKLOG') {
            const statusValues = status.split(',').filter(Boolean)
            if (statusValues.length === 1) {
                where.status = statusValues[0] as TaskStatus
            } else if (statusValues.length > 1) {
                where.status = { in: statusValues as TaskStatus[] }
            }
        }

        // Assignee filter
        if (assignee && assignee.length > 0) {
            where.assignments = {
                some: {
                    isAssigned: true,
                    userId: { in: assignee.map(Number) }
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
            orderBy: { position: 'asc' }
        })
        return incidences as unknown as IncidenceWithDetails[]
    } catch (error) {
        console.error('Error getting incidences:', error)
        return []
    }
}

export async function getIncidence(id: number): Promise<IncidenceWithDetails | null> {
    try {
        const incidence = await db.incidence.findUnique({
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
        return incidence as unknown as IncidenceWithDetails
    } catch (error) {
        console.error('Error getting incidence:', error)
        return null
    }
}

export async function updateIncidenceStatus(incidenceId: number, newStatus: TaskStatus, newPosition: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            include: {
                assignments: {
                    where: { isAssigned: true }
                }
            }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const isBacklogToTodo = incidence.status === TaskStatus.BACKLOG && newStatus === TaskStatus.TODO

        if (isBacklogToTodo) {
            const errors: string[] = []

            if (!incidence.estimatedTime || incidence.estimatedTime <= 0) {
                errors.push('Debe asignar horas estimadas')
            }

            if (incidence.assignments.length === 0) {
                errors.push('Debe asignar al menos un colaborador')
            }

            if (errors.length > 0) {
                return { success: false, error: `No puede mover a desarrollo: ${errors.join(', ')}` }
            }
        }

        if (newStatus === TaskStatus.DONE && session.user.role !== 'ADMIN') {
            return { success: false, error: 'Solo los administradores pueden marcar como finalizado.' }
        }

        if (session.user.role !== 'ADMIN') {
            const isAssigned = incidence.assignments.some(a => a.userId === Number(session.user.id))
            if (!isAssigned) {
                return { success: false, error: 'Solo los desarrolladores asignados pueden mover esta tarea.' }
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
        return { success: false, error: 'Error al actualizar el estado.' }
    }
}

export async function updateIncidence(id: number, data: UpdateIncidenceData) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const currentIncidence = await db.incidence.findUnique({
            where: { id },
            include: {
                assignments: true
            }
        })

        if (!currentIncidence) {
            return { success: false, error: 'Incidencia no encontrada' }
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
        return { success: true, data: finalIncidence as unknown as IncidenceWithDetails }
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

        const subTask = await db.subTask.create({
            data: {
                title,
                assignmentId,
                isCompleted
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: subTask }
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

        await db.subTask.update({
            where: { id: subTaskId },
            data: { isCompleted: !subTask.isCompleted }
        })

        revalidatePath('/dashboard')
        return { success: true }
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

        await db.subTask.delete({
            where: { id: subTaskId }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting subtask:', error)
        return { success: false, error: 'Error al eliminar tarea' }
    }
}
