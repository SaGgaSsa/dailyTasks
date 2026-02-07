'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Incidence } from '@prisma/client'
import { Priority, TechStack, TaskStatus, TaskType, UserRole } from '@/types/enums'
import { IncidenceWithDetails } from '@/types'
import { auth } from '@/auth'

interface CreateIncidenceData {
    type: TaskType
    externalId: number
    title: string
    description?: string
    tech: TechStack
    priority: Priority
    estimatedTime?: number
    assigneeIds?: number[]
}

interface UpdateIncidenceData {
    status?: TaskStatus
    priority?: Priority
    description?: string
    comment?: string
    estimatedTime?: number
    title?: string
    technology?: TechStack
    assigneeIds?: number[]
    subTasks?: { title: string, isCompleted: boolean }[]
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
                status: TaskStatus.BACKLOG, // Forced
                assignees: {
                    connect: data.assigneeIds?.map(id => ({ id })) || []
                }
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



export async function getIncidences(viewType: 'BACKLOG' | 'KANBAN'): Promise<IncidenceWithDetails[]> {
    const session = await auth()
    if (!session?.user) return []

    try {
        const where: Record<string, unknown> = {}

        if (viewType === 'KANBAN') {
            where.status = { not: TaskStatus.BACKLOG }
            // Optional: filter where user is assigned? 
            // The user said: "Filtra donde assignees incluye al usuario actual (o mostrar todas las activas si se prefiere transparencia)"
            // I'll stick to transparency but hiding Backlog.
        }

        const incidences = await db.incidence.findMany({
            where,
            include: {
                assignees: true,
                subTasks: {
                    orderBy: {
                        createdAt: 'asc'
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

export async function updateIncidenceStatus(incidenceId: number, newStatus: TaskStatus, newPosition: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId },
            include: { assignees: true }
        })

        if (!incidence) return { success: false, error: 'Incidencia no encontrada' }

        // Business Rule: Only Admin can move to DONE
        if (newStatus === TaskStatus.DONE && session.user.role !== 'ADMIN') {
            return { success: false, error: 'Solo los administradores pueden marcar como finalizado.' }
        }

        // Business Rule: Dev can move if assigned
        if (session.user.role !== 'ADMIN') {
            const isAssigned = incidence.assignees.some(a => a.id === Number(session.user.id))
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
        const updateData: Record<string, unknown> = {
            status: data.status,
            priority: data.priority,
            description: data.description,
            estimatedTime: data.estimatedTime,
            title: data.title,
            technology: data.technology,
        }

        if (data.assigneeIds) {
            updateData.assignees = {
                set: data.assigneeIds.map(userId => ({ id: userId }))
            }
        }

        let updatedIncidence: Incidence | null = null

        if (data.subTasks) {
            await db.$transaction([
                db.subTask.deleteMany({ where: { incidenceId: id } }),
                db.incidence.update({
                    where: { id },
                    data: {
                        ...updateData,
                        subTasks: {
                            create: data.subTasks.map(st => ({
                                title: st.title,
                                isCompleted: st.isCompleted
                            }))
                        }
                    }
                })
            ])
        } else {
            await db.incidence.update({
                where: { id },
                data: updateData
            })
        }

        // Fetch updated incidence with relations
        updatedIncidence = await db.incidence.findUnique({
            where: { id },
            include: {
                assignees: true,
                subTasks: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: updatedIncidence as unknown as IncidenceWithDetails }
    } catch (error) {
        console.error('Error updating incidence:', error)
        return { success: false, error: 'Error al actualizar.' }
    }
}

export async function toggleSubTask(subTaskId: number) {
    try {
        const subTask = await db.subTask.findUnique({ where: { id: subTaskId } })
        if (!subTask) return { success: false, error: 'No encontrada' }

        await db.subTask.update({
            where: { id: subTaskId },
            data: { isCompleted: !subTask.isCompleted }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Error' }
    }
}
