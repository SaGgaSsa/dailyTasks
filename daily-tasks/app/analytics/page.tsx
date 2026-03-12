'use server'

import { db } from '@/lib/db'
import { Priority, TaskStatus } from '@prisma/client'
import { AnalyticsClient } from './analytics-client'

interface AnalyticsData {
  tasksByStatus: { name: string; value: number; color: string }[]
  tasksByAssignee: { name: string; value: number }[]
  totalActivas: number
  altaPrioridad: number
  enRevision: number
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  [TaskStatus.BACKLOG]: { label: 'Backlog', color: '#71717a' },
  [TaskStatus.TODO]: { label: 'Por Hacer', color: '#a1a1aa' },
  [TaskStatus.IN_PROGRESS]: { label: 'En Progreso', color: '#3b82f6' },
  [TaskStatus.REVIEW]: { label: 'En Revisión', color: '#f59e0b' },
  [TaskStatus.DONE]: { label: 'Completado', color: '#22c55e' },
  [TaskStatus.DISMISSED]: { label: 'Desestimado', color: '#ef4444' },
}

export default async function AnalyticsPage() {
  const incidences = await db.incidence.findMany({
    where: {
      status: { notIn: [TaskStatus.DONE, TaskStatus.DISMISSED] }
    },
    include: {
      assignments: {
        include: {
          user: true
        }
      }
    }
  })

  const activeStatuses = [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW]

  const statusCounts = activeStatuses.map(status => ({
    status,
    count: incidences.filter(i => i.status === status).length
  }))

  const assigneeMap = new Map<number, { name: string; count: number }>()

  incidences.forEach(incidence => {
    incidence.assignments.forEach(assignment => {
      const existing = assigneeMap.get(assignment.userId)
      if (existing) {
        existing.count += 1
      } else {
        assigneeMap.set(assignment.userId, {
          name: assignment.user.name || assignment.user.email || 'Unknown',
          count: 1
        })
      }
    })

    if (incidence.assignments.length === 0) {
      const existing = assigneeMap.get(0)
      if (existing) {
        existing.count += 1
      } else {
        assigneeMap.set(0, { name: 'Sin Asignar', count: 1 })
      }
    }
  })

  const tasksByStatus = statusCounts
    .filter(s => s.count > 0)
    .map(s => ({
      name: STATUS_CONFIG[s.status].label,
      value: s.count,
      color: STATUS_CONFIG[s.status].color
    }))

  const tasksByAssignee = Array.from(assigneeMap.values())
    .sort((a, b) => b.count - a.count)
    .map(a => ({ name: a.name, value: a.count }))

  const data: AnalyticsData = {
    tasksByStatus,
    tasksByAssignee,
    totalActivas: incidences.length,
    altaPrioridad: incidences.filter(i => i.priority === Priority.HIGH).length,
    enRevision: incidences.filter(i => i.status === TaskStatus.REVIEW).length
  }

  return <AnalyticsClient data={data} />
}
