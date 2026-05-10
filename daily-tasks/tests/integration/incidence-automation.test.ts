import { describe, expect, it } from 'vitest'
import { TaskStatus, TicketQAStatus } from '@prisma/client'

import { createTask, getIncidencePageData, saveIncidenceTaskChanges, toggleTask } from '@/app/actions/incidence-actions'
import { db } from '@/lib/db'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist,
  createUser,
  getIncidenceState,
  getTicketState,
} from '@/tests/integration/helpers'

describe('incidence automation integration', () => {
  it('returns only admin and dev users for incidence task assignment lists', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: qa.id, assignedHours: 2 }],
    })

    actAs(admin)
    const pageData = await getIncidencePageData(incidence.id)

    expect(pageData.users.map((user) => user.id).sort()).toEqual([admin.id, dev.id].sort())
  }, 15000)

  it('reassigns pending tasks to an existing assignee and keeps completed tasks with the source assignee', async () => {
    const admin = await createUser('ADMIN')
    const sourceDev = await createUser('DEV')
    const targetDev = await createUser('DEV')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.IN_PROGRESS,
      estimatedTime: 6,
      assignees: [
        { userId: sourceDev.id, assignedHours: 3 },
        { userId: targetDev.id, assignedHours: 3 },
      ],
      tasks: [
        { userId: sourceDev.id, title: 'Pendiente origen', isCompleted: false },
        { userId: sourceDev.id, title: 'Completada origen', isCompleted: true },
        { userId: targetDev.id, title: 'Pendiente destino', isCompleted: false },
      ],
    })
    const sourcePendingTask = tasks.find((task) => task.title === 'Pendiente origen')
    const sourceCompletedTask = tasks.find((task) => task.title === 'Completada origen')
    if (!sourcePendingTask || !sourceCompletedTask) throw new Error('Expected fixture tasks')

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [
        { userId: sourceDev.id, assignedHours: 3 },
        { userId: targetDev.id, assignedHours: 3 },
      ],
      reassignedTasks: [{ taskId: sourcePendingTask.id, targetUserId: targetDev.id }],
    })

    expect(result.success).toBe(true)

    const assignments = await db.assignment.findMany({
      where: { incidenceId: incidence.id },
      include: { tasks: true },
    })
    const sourceAssignment = assignments.find((assignment) => assignment.userId === sourceDev.id)
    const targetAssignment = assignments.find((assignment) => assignment.userId === targetDev.id)

    expect(sourceAssignment?.isAssigned).toBe(true)
    expect(sourceAssignment?.tasks.map((task) => task.id)).toContain(sourceCompletedTask.id)
    expect(sourceAssignment?.tasks.map((task) => task.id)).not.toContain(sourcePendingTask.id)
    expect(targetAssignment?.tasks.map((task) => task.id)).toContain(sourcePendingTask.id)
  }, 15000)

  it('reassigns all pending tasks to a new assignee and deactivates the source assignee without completed tasks', async () => {
    const admin = await createUser('ADMIN')
    const sourceDev = await createUser('DEV')
    const targetAdmin = await createUser('ADMIN')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.IN_PROGRESS,
      estimatedTime: 4,
      assignees: [{ userId: sourceDev.id, assignedHours: 4 }],
      tasks: [
        { userId: sourceDev.id, title: 'Pendiente A', isCompleted: false },
        { userId: sourceDev.id, title: 'Pendiente B', isCompleted: false },
      ],
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [{ userId: targetAdmin.id, assignedHours: null }],
      reassignedTasks: tasks.map((task) => ({ taskId: task.id, targetUserId: targetAdmin.id })),
    })

    expect(result.success).toBe(true)

    const assignments = await db.assignment.findMany({
      where: { incidenceId: incidence.id },
      include: { tasks: true },
    })
    const sourceAssignment = assignments.find((assignment) => assignment.userId === sourceDev.id)
    const targetAssignment = assignments.find((assignment) => assignment.userId === targetAdmin.id)

    expect(sourceAssignment?.isAssigned).toBe(false)
    expect(targetAssignment?.isAssigned).toBe(true)
    expect(targetAssignment?.tasks.map((task) => task.id).sort()).toEqual(tasks.map((task) => task.id).sort())
  }, 15000)

  it('does not reassign tasks that are completed after pending state updates are applied', async () => {
    const admin = await createUser('ADMIN')
    const sourceDev = await createUser('DEV')
    const targetDev = await createUser('DEV')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence, assignments, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.IN_PROGRESS,
      estimatedTime: 4,
      assignees: [
        { userId: sourceDev.id, assignedHours: 2 },
        { userId: targetDev.id, assignedHours: 2 },
      ],
      tasks: [{ userId: sourceDev.id, title: 'Pendiente a completar', isCompleted: false }],
    })
    const task = tasks[0]

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [
        { userId: sourceDev.id, assignedHours: 2 },
        { userId: targetDev.id, assignedHours: 2 },
      ],
      updatedTasks: [{ taskId: task.id, title: task.title, isCompleted: true }],
      reassignedTasks: [{ taskId: task.id, targetUserId: targetDev.id }],
    })

    expect(result.success).toBe(false)

    const unchangedTask = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(unchangedTask.assignmentId).toBe(assignments.get(sourceDev.id)?.id)
  }, 15000)

  it('reassigns QA reported tasks when they remain pending', async () => {
    const admin = await createUser('ADMIN')
    const sourceDev = await createUser('DEV')
    const targetDev = await createUser('DEV')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.IN_PROGRESS,
      estimatedTime: 4,
      assignees: [
        { userId: sourceDev.id, assignedHours: 2 },
        { userId: targetDev.id, assignedHours: 2 },
      ],
      tasks: [{ userId: sourceDev.id, title: 'Reportada QA', isCompleted: false, isQaReported: true }],
    })
    const qaReportedTask = tasks[0]

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [
        { userId: sourceDev.id, assignedHours: 2 },
        { userId: targetDev.id, assignedHours: 2 },
      ],
      reassignedTasks: [{ taskId: qaReportedTask.id, targetUserId: targetDev.id }],
    })

    expect(result.success).toBe(true)

    const targetAssignment = await db.assignment.findUniqueOrThrow({
      where: { incidenceId_userId: { incidenceId: incidence.id, userId: targetDev.id } },
      include: { tasks: true },
    })
    expect(targetAssignment.tasks.map((task) => task.id)).toContain(qaReportedTask.id)
  }, 15000)

  it('moves BACKLOG to TODO when hours and assignee are defined without tasks', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.BACKLOG,
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [{ userId: dev.id, assignedHours: 6 }],
      incidencePatch: { estimatedTime: 6 },
    })

    expect(result.success).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.TODO)
    expect(updatedIncidence.startedAt).not.toBeNull()
    expect(updatedTicket.status).toBe(TicketQAStatus.IN_DEVELOPMENT)
  })

  it('moves BACKLOG to IN_PROGRESS when hours and assignee are defined with pending tasks', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.BACKLOG,
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [{ userId: dev.id, assignedHours: 4 }],
      incidencePatch: { estimatedTime: 4 },
      createdTasks: [{ userId: dev.id, title: 'Implementar', isCompleted: false }],
    })

    expect(result.success).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.IN_PROGRESS)
    expect(updatedTicket.status).toBe(TicketQAStatus.IN_DEVELOPMENT)
  })

  it('moves BACKLOG to REVIEW when hours and assignee are defined and all tasks are completed', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.BACKLOG,
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [{ userId: dev.id, assignedHours: 2 }],
      incidencePatch: { estimatedTime: 2 },
      createdTasks: [{ userId: dev.id, title: 'Validar', isCompleted: true }],
    })

    expect(result.success).toBe(true)
    expect(result.autoTransitionedToReview).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.REVIEW)
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)
  })

  it.each([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW])(
    'moves %s back to BACKLOG when assignees are removed',
    async (initialStatus) => {
      const admin = await createUser('ADMIN')
      const dev = await createUser('DEV')
      const qa = await createUser('QA')
      const { technology, module: moduleRecord } = await createTechnologyModule()
      const workItem = await createExternalWorkItem()
      const tracklist = await createTracklist(qa.id)
      const { incidence } = await createIncidenceFixture({
        technologyId: technology.id,
        externalWorkItemId: workItem.id,
        status: initialStatus,
        estimatedTime: 8,
        assignees: [{ userId: dev.id, assignedHours: 8 }],
        tasks: initialStatus === TaskStatus.REVIEW ? [{ userId: dev.id, title: 'Hecha', isCompleted: true }] : [],
      })
      await createTicketFixture({
        tracklistId: tracklist.id,
        moduleId: moduleRecord.id,
        reportedById: qa.id,
        assignedToId: dev.id,
        incidenceId: incidence.id,
        externalWorkItemId: workItem.id,
        status: initialStatus === TaskStatus.REVIEW ? TicketQAStatus.TEST : TicketQAStatus.IN_DEVELOPMENT,
      })

      actAs(admin)
      const result = await saveIncidenceTaskChanges({
        incidenceId: incidence.id,
        assignees: [],
        incidencePatch: { estimatedTime: null },
      })

      expect(result.success).toBe(true)

      const updatedIncidence = await getIncidenceState(incidence.id)
      expect(updatedIncidence.status).toBe(TaskStatus.BACKLOG)
    }
  )

  it.each([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW])(
    'keeps %s when estimated time is removed but assignees remain',
    async (initialStatus) => {
      const admin = await createUser('ADMIN')
      const dev = await createUser('DEV')
      const qa = await createUser('QA')
      const { technology, module: moduleRecord } = await createTechnologyModule()
      const workItem = await createExternalWorkItem()
      const tracklist = await createTracklist(qa.id)
      const { incidence } = await createIncidenceFixture({
        technologyId: technology.id,
        externalWorkItemId: workItem.id,
        status: initialStatus,
        estimatedTime: 8,
        assignees: [{ userId: dev.id, assignedHours: 8 }],
        tasks: initialStatus === TaskStatus.REVIEW ? [{ userId: dev.id, title: 'Hecha', isCompleted: true }] : [],
      })
      await createTicketFixture({
        tracklistId: tracklist.id,
        moduleId: moduleRecord.id,
        reportedById: qa.id,
        assignedToId: dev.id,
        incidenceId: incidence.id,
        externalWorkItemId: workItem.id,
        status: initialStatus === TaskStatus.REVIEW ? TicketQAStatus.TEST : TicketQAStatus.IN_DEVELOPMENT,
      })

      actAs(admin)
      const result = await saveIncidenceTaskChanges({
        incidenceId: incidence.id,
        incidencePatch: { estimatedTime: null },
      })

      expect(result.success).toBe(true)

      const updatedIncidence = await getIncidenceState(incidence.id)
      expect(updatedIncidence.status).toBe(initialStatus)
    }
  )

  it('moves TODO to IN_PROGRESS when tasks are created', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.TODO,
      estimatedTime: 5,
      assignees: [{ userId: dev.id, assignedHours: 5 }],
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      createdTasks: [{ userId: dev.id, title: 'Nueva tarea', isCompleted: false }],
    })

    expect(result.success).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    expect(updatedIncidence.status).toBe(TaskStatus.IN_PROGRESS)
  })

  it('moves IN_PROGRESS to REVIEW when all tasks are completed', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.IN_PROGRESS,
      estimatedTime: 5,
      assignees: [{ userId: dev.id, assignedHours: 5 }],
      tasks: [
        { userId: dev.id, title: 'Tarea 1', isCompleted: false },
        { userId: dev.id, title: 'Tarea 2', isCompleted: false },
      ],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.IN_DEVELOPMENT,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      updatedTasks: tasks.map((task) => ({
        taskId: task.id,
        title: task.title,
        isCompleted: true,
      })),
    })

    expect(result.success).toBe(true)
    expect(result.autoTransitionedToReview).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.REVIEW)
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)
  })

  it('reopens REVIEW to IN_PROGRESS when a completed task is unchecked', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      estimatedTime: 3,
      assignees: [{ userId: dev.id, assignedHours: 3 }],
      tasks: [{ userId: dev.id, title: 'Tarea QA', isCompleted: true }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
    })

    actAs(admin)
    const result = await toggleTask(tasks[0].id)

    expect(result.success).toBe(true)
    expect(result.autoTransitionedToInProgress).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.IN_PROGRESS)
    expect(updatedTicket.status).toBe(TicketQAStatus.IN_DEVELOPMENT)
  })

  it('reopens DONE to IN_PROGRESS when a new pending task is created', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence, assignments } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.DONE,
      estimatedTime: 3,
      assignees: [{ userId: dev.id, assignedHours: 3 }],
      tasks: [{ userId: dev.id, title: 'Terminada', isCompleted: true }],
      completedAt: new Date(),
      startedAt: new Date(),
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await createTask(assignments.get(dev.id)!.id, 'Reapertura')

    expect(result.success).toBe(true)
    expect(result.reopened).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.IN_PROGRESS)
    expect(updatedIncidence.completedAt).toBeNull()
    expect(updatedTicket.status).toBe(TicketQAStatus.IN_DEVELOPMENT)
  })

  it('reopens DONE to REVIEW when all new tasks are saved as completed', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.DONE,
      estimatedTime: 3,
      assignees: [{ userId: dev.id, assignedHours: 3 }],
      tasks: [{ userId: dev.id, title: 'Original', isCompleted: true }],
      completedAt: new Date(),
      startedAt: new Date(),
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      createdTasks: [{ userId: dev.id, title: 'Nueva completada', isCompleted: true }],
    })

    expect(result.success).toBe(true)
    expect(result.reopened).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.REVIEW)
    expect(updatedIncidence.completedAt).toBeNull()
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)
  })

  it.each([TicketQAStatus.COMPLETED, TicketQAStatus.DISMISSED])(
    'does not change %s tickets during incidence sync',
    async (terminalStatus) => {
      const admin = await createUser('ADMIN')
      const dev = await createUser('DEV')
      const qa = await createUser('QA')
      const { technology, module: moduleRecord } = await createTechnologyModule()
      const workItem = await createExternalWorkItem()
      const tracklist = await createTracklist(qa.id)
      const { incidence, tasks } = await createIncidenceFixture({
        technologyId: technology.id,
        externalWorkItemId: workItem.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedTime: 4,
        assignees: [{ userId: dev.id, assignedHours: 4 }],
        tasks: [{ userId: dev.id, title: 'Pendiente', isCompleted: false }],
      })
      const ticket = await createTicketFixture({
        tracklistId: tracklist.id,
        moduleId: moduleRecord.id,
        reportedById: qa.id,
        assignedToId: dev.id,
        incidenceId: incidence.id,
        externalWorkItemId: workItem.id,
        status: terminalStatus,
      })

      actAs(admin)
      const result = await saveIncidenceTaskChanges({
        incidenceId: incidence.id,
        updatedTasks: [
          {
            taskId: tasks[0].id,
            title: tasks[0].title,
            isCompleted: true,
          },
        ],
      })

      expect(result.success).toBe(true)

      expect((await getTicketState(ticket.id)).status).toBe(terminalStatus)
    }
  )

  it('creates REVIEW directly from TODO when toggling the only pending task', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence, tasks } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.TODO,
      estimatedTime: 1,
      assignees: [{ userId: dev.id, assignedHours: 1 }],
      tasks: [{ userId: dev.id, title: 'Unica', isCompleted: false }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.ASSIGNED,
    })

    actAs(admin)
    const result = await toggleTask(tasks[0].id)

    expect(result.success).toBe(true)
    expect(result.autoTransitionedToReview).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.REVIEW)
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)
  })

  it('keeps linked ticket in test when incidence moves from REVIEW to BACKLOG', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      estimatedTime: 2,
      assignees: [{ userId: dev.id, assignedHours: 2 }],
      tasks: [{ userId: dev.id, title: 'Hecha', isCompleted: true }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [],
      incidencePatch: { estimatedTime: null },
    })

    expect(result.success).toBe(true)

    const updatedTicket = await getTicketState(ticket.id)
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)

    const reviewBacklogState = await db.incidence.findUniqueOrThrow({ where: { id: incidence.id } })
    expect(reviewBacklogState.status).toBe(TaskStatus.BACKLOG)
  })

  it('keeps review when estimated time is removed but assignees remain', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const qa = await createUser('QA')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      estimatedTime: 2,
      assignees: [{ userId: dev.id, assignedHours: 2 }],
      tasks: [{ userId: dev.id, title: 'Hecha', isCompleted: true }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
    })

    actAs(admin)
    const result = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      incidencePatch: { estimatedTime: null },
    })

    expect(result.success).toBe(true)

    const updatedTicket = await getTicketState(ticket.id)
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)

    const reviewState = await db.incidence.findUniqueOrThrow({ where: { id: incidence.id } })
    expect(reviewState.status).toBe(TaskStatus.REVIEW)
  })
})
