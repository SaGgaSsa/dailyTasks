import { describe, expect, it } from 'vitest'
import { TaskStatus, TicketQAStatus } from '@prisma/client'

import { createTask, saveIncidenceTaskChanges, toggleTask } from '@/app/actions/incidence-actions'
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
