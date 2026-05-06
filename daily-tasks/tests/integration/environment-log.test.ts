import { EnvironmentLogEntryType, ScriptType, TaskStatus, TicketQAStatus, UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import {
  createEnvironmentConfigurationLog,
  createEnvironmentScriptLog,
  getEnvironmentAvailability,
  getEnvironmentLogEntries,
  getPendingEnvironmentDeployItems,
  getEnvironmentDeployBatchSql,
  getSidebarFavoriteEnvironments,
  registerEnvironmentDeploys,
  toggleEnvironmentFavorite,
  validateEnvironmentConfigurationLog,
} from '@/app/actions/environment-log'
import { updateIncidenceStatus } from '@/app/actions/incidence-actions'
import { db } from '@/lib/db'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist,
  createUser,
} from '@/tests/integration/helpers'

async function createEnabledEnvironment(name = 'TEST') {
  return db.environment.create({
    data: { name, isEnabled: true },
  })
}

async function createReviewIncidenceWithUser(devId: number) {
  const { technology, module } = await createTechnologyModule()
  const workItem = await createExternalWorkItem()
  const fixture = await createIncidenceFixture({
    externalWorkItemId: workItem.id,
    technologyId: technology.id,
    status: TaskStatus.REVIEW,
    estimatedTime: 8,
    assignees: [{ userId: devId, assignedHours: 8 }],
    tasks: [{ userId: devId, title: 'Lista', isCompleted: true }],
  })

  return { ...fixture, technology, module, workItem }
}

describe('environment log', () => {
  it.each([UserRole.ADMIN, UserRole.DEV])('%s can register pending deploys', async (role) => {
    const user = await createUser(role)
    actAs(user)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(user.id)

    const result = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    expect(result.success).toBe(true)
    expect(await db.environmentLogEntry.count()).toBe(1)
  })

  it.each([UserRole.QA, null])('%s cannot register deploys', async (role) => {
    const dev = await createUser(UserRole.DEV)
    if (role) {
      const user = await createUser(role)
      actAs(user)
    }
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    const result = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    expect(result.success).toBe(false)
    expect(await db.environmentLogEntry.count()).toBe(0)
  })

  it('creates one deploy entry per pending item and supports partial selection', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const first = await createReviewIncidenceWithUser(dev.id)
    const second = await createReviewIncidenceWithUser(dev.id)

    const pending = await getPendingEnvironmentDeployItems(environment.id)
    expect(pending.success).toBe(true)
    expect(pending.data?.map((item) => item.incidenceId).sort()).toEqual([first.incidence.id, second.incidence.id].sort())

    const partialResult = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: first.incidence.id }],
    })

    expect(partialResult.success).toBe(true)
    expect(await db.environmentLogEntry.count()).toBe(1)
    const remaining = await getPendingEnvironmentDeployItems(environment.id)
    expect(remaining.data?.map((item) => item.incidenceId)).toEqual([second.incidence.id])
  })

  it('assigns the same batch id to all items registered together', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const first = await createReviewIncidenceWithUser(dev.id)
    const second = await createReviewIncidenceWithUser(dev.id)

    const result = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [
        { incidenceId: first.incidence.id },
        { incidenceId: second.incidence.id },
      ],
    })

    expect(result.success).toBe(true)
    const entries = await db.environmentLogEntry.findMany({
      orderBy: { id: 'asc' },
      select: { batchId: true },
    })
    expect(entries).toHaveLength(2)
    expect(entries[0].batchId).toBeTruthy()
    expect(entries[0].batchId).toBe(entries[1].batchId)
  })

  it('does not mix environment histories', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const firstEnvironment = await createEnabledEnvironment('DEV')
    const secondEnvironment = await createEnabledEnvironment('QA')
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: firstEnvironment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const firstHistory = await getEnvironmentLogEntries(firstEnvironment.id)
    const secondHistory = await getEnvironmentLogEntries(secondEnvironment.id)

    expect(firstHistory.data).toHaveLength(1)
    expect(secondHistory.data).toHaveLength(0)
  })

  it('returns grouped deploy batches and legacy rows as individual batches', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const first = await createReviewIncidenceWithUser(dev.id)
    const second = await createReviewIncidenceWithUser(dev.id)
    const legacy = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [
        { incidenceId: first.incidence.id },
        { incidenceId: second.incidence.id },
      ],
    })
    await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: environment.id,
        incidenceId: legacy.incidence.id,
        createdById: dev.id,
        batchId: null,
      },
    })

    const result = await getEnvironmentLogEntries(environment.id)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data?.map((batch) => batch.items).map((items) => items.length).sort()).toEqual([1, 2])
    expect(result.data?.find((batch) => batch.batchId === null)?.items).toHaveLength(1)
    expect(result.data?.find((batch) => batch.batchId !== null)?.items.map((item) => item.incidence?.id).sort()).toEqual([
      first.incidence.id,
      second.incidence.id,
    ].sort())
  })

  it('returns log events from oldest to newest so the latest renders at the bottom', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    const oldest = await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.CONFIGURATION,
        environmentId: environment.id,
        subject: 'Primer ajuste',
        body: '<p>Inicio.</p>',
        createdById: dev.id,
        occurredAt: new Date('2026-05-05T08:00:00.000Z'),
      },
    })
    const middle = await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: environment.id,
        incidenceId: incidence.id,
        createdById: dev.id,
        occurredAt: new Date('2026-05-05T09:00:00.000Z'),
      },
    })
    const newest = await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.CONFIGURATION,
        environmentId: environment.id,
        subject: 'Ultimo ajuste',
        body: '<p>Cierre.</p>',
        createdById: dev.id,
        occurredAt: new Date('2026-05-05T10:00:00.000Z'),
      },
    })

    const result = await getEnvironmentLogEntries(environment.id)

    expect(result.success).toBe(true)
    expect(result.data?.map((event) => event.legacyEntryId)).toEqual([oldest.id, middle.id, newest.id])
  })

  it.each([UserRole.ADMIN, UserRole.QA])('%s can create configuration log entries', async (role) => {
    const user = await createUser(role)
    actAs(user)
    const environment = await createEnabledEnvironment()

    const result = await createEnvironmentConfigurationLog({
      environmentId: environment.id,
      subject: ' Cache de parámetros ',
      body: '<p>Actualizar TTL a 15 minutos.</p>',
    })

    expect(result.success).toBe(true)
    const entry = await db.environmentLogEntry.findFirstOrThrow()
    expect(entry).toMatchObject({
      type: EnvironmentLogEntryType.CONFIGURATION,
      environmentId: environment.id,
      subject: 'Cache de parámetros',
      body: '<p>Actualizar TTL a 15 minutos.</p>',
      createdById: user.id,
      ticketId: null,
      incidenceId: null,
      batchId: null,
      validatedAt: null,
      validatedById: null,
      validationNote: null,
    })
  })

  it.each([UserRole.DEV, null])('%s cannot create configuration log entries', async (role) => {
    if (role) {
      const user = await createUser(role)
      actAs(user)
    }
    const environment = await createEnabledEnvironment()

    const result = await createEnvironmentConfigurationLog({
      environmentId: environment.id,
      subject: 'Parámetro',
      body: '<p>Detalle</p>',
    })

    expect(result.success).toBe(false)
    expect(await db.environmentLogEntry.count()).toBe(0)
  })

  it.each([UserRole.ADMIN, UserRole.QA, UserRole.DEV])('%s can create script log entries', async (role) => {
    const user = await createUser(role)
    actAs(user)
    const environment = await createEnabledEnvironment()
    const scriptBody = '  select 1;\n\n  '

    const result = await createEnvironmentScriptLog({
      environmentId: environment.id,
      subject: ' Base de Datos ',
      body: scriptBody,
      scriptType: ScriptType.SQL,
    })

    expect(result.success).toBe(true)
    const entry = await db.environmentLogEntry.findFirstOrThrow()
    expect(entry).toMatchObject({
      type: EnvironmentLogEntryType.SCRIPT,
      environmentId: environment.id,
      subject: 'Base de Datos',
      body: scriptBody,
      scriptType: ScriptType.SQL,
      createdById: user.id,
      ticketId: null,
      incidenceId: null,
      batchId: null,
      validatedAt: null,
      validatedById: null,
      validationNote: null,
    })
  })

  it('does not create script log entries without authentication', async () => {
    const environment = await createEnabledEnvironment()

    const result = await createEnvironmentScriptLog({
      environmentId: environment.id,
      subject: 'Base de Datos',
      body: 'select 1;',
      scriptType: ScriptType.SQL,
    })

    expect(result.success).toBe(false)
    expect(await db.environmentLogEntry.count()).toBe(0)
  })

  it.each([
    { subject: '', body: 'select 1;', scriptType: ScriptType.SQL, expectedError: 'Título requerido' },
    { subject: 'Base de Datos', body: '', scriptType: ScriptType.SQL, expectedError: 'Script requerido' },
    { subject: 'Base de Datos', body: 'select 1;', scriptType: 'INVALID' as ScriptType, expectedError: 'Tipo de script inválido' },
  ])('validates script log input: $expectedError', async ({ subject, body, scriptType, expectedError }) => {
    const user = await createUser(UserRole.DEV)
    actAs(user)
    const environment = await createEnabledEnvironment()

    const result = await createEnvironmentScriptLog({
      environmentId: environment.id,
      subject,
      body,
      scriptType,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(expectedError)
    expect(await db.environmentLogEntry.count()).toBe(0)
  })

  it('returns script log entries with subject, body, type, user, and chronological order', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    actAs(admin)
    const environment = await createEnabledEnvironment()

    const oldest = await createEnvironmentScriptLog({
      environmentId: environment.id,
      subject: 'Base de Datos',
      body: 'select 1;',
      scriptType: ScriptType.SQL,
    })

    actAs(dev)
    const newest = await createEnvironmentScriptLog({
      environmentId: environment.id,
      subject: 'Script',
      body: 'console.log("deploy")',
      scriptType: ScriptType.CODE,
    })

    const result = await getEnvironmentLogEntries(environment.id)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data?.map((event) => event.legacyEntryId)).toEqual([oldest.data?.id, newest.data?.id])
    expect(result.data?.[0]).toMatchObject({
      type: EnvironmentLogEntryType.SCRIPT,
      subject: 'Base de Datos',
      body: 'select 1;',
      scriptType: ScriptType.SQL,
      createdBy: { id: admin.id, username: admin.username, name: admin.name },
      items: [],
    })
    expect(result.data?.[1]).toMatchObject({
      type: EnvironmentLogEntryType.SCRIPT,
      subject: 'Script',
      body: 'console.log("deploy")',
      scriptType: ScriptType.CODE,
      createdBy: { id: dev.id, username: dev.username, name: dev.name },
      items: [],
    })
  })

  it('returns deploy batches and configuration entries without mixing them', async () => {
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    actAs(dev)
    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    actAs(qa)
    await createEnvironmentConfigurationLog({
      environmentId: environment.id,
      subject: 'Endpoint de pagos',
      body: '<p>Apuntar a sandbox.</p>',
    })

    const result = await getEnvironmentLogEntries(environment.id)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    const deployEvent = result.data?.find((event) => event.type === EnvironmentLogEntryType.DEPLOY)
    const configurationEvent = result.data?.find((event) => event.type === EnvironmentLogEntryType.CONFIGURATION)
    expect(deployEvent?.items).toHaveLength(1)
    expect(configurationEvent).toMatchObject({
      type: EnvironmentLogEntryType.CONFIGURATION,
      subject: 'Endpoint de pagos',
      body: '<p>Apuntar a sandbox.</p>',
      validatedAt: null,
      validatedBy: null,
      validationNote: null,
    })
    expect(configurationEvent?.items).toEqual([])
  })

  it.each([UserRole.ADMIN, UserRole.QA])('%s can validate configuration log entries', async (role) => {
    const creator = await createUser(UserRole.QA)
    const validator = await createUser(role)
    const environment = await createEnabledEnvironment()

    actAs(creator)
    await createEnvironmentConfigurationLog({
      environmentId: environment.id,
      subject: 'Puerto API',
      body: '<p>Usar 8443.</p>',
    })
    const entry = await db.environmentLogEntry.findFirstOrThrow()

    actAs(validator)
    const result = await validateEnvironmentConfigurationLog({
      environmentId: environment.id,
      entryId: entry.id,
    })

    expect(result.success).toBe(true)
    const updated = await db.environmentLogEntry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updated.validatedAt).toBeInstanceOf(Date)
    expect(updated.validatedById).toBe(validator.id)
  })

  it('does not validate an already validated configuration entry twice', async () => {
    const qa = await createUser(UserRole.QA)
    const admin = await createUser(UserRole.ADMIN)
    const environment = await createEnabledEnvironment()

    actAs(qa)
    await createEnvironmentConfigurationLog({
      environmentId: environment.id,
      subject: 'Feature flag',
      body: '<p>Activar beta.</p>',
    })
    const entry = await db.environmentLogEntry.findFirstOrThrow()
    await validateEnvironmentConfigurationLog({ environmentId: environment.id, entryId: entry.id })
    const firstValidated = await db.environmentLogEntry.findUniqueOrThrow({ where: { id: entry.id } })

    actAs(admin)
    const result = await validateEnvironmentConfigurationLog({
      environmentId: environment.id,
      entryId: entry.id,
    })

    expect(result.success).toBe(false)
    const afterSecondAttempt = await db.environmentLogEntry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(afterSecondAttempt.validatedAt).toEqual(firstValidated.validatedAt)
    expect(afterSecondAttempt.validatedById).toBe(firstValidated.validatedById)
  })

  it('does not validate deploy entries as configurations', async () => {
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    actAs(dev)
    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })
    const deployEntry = await db.environmentLogEntry.findFirstOrThrow()

    actAs(qa)
    const result = await validateEnvironmentConfigurationLog({
      environmentId: environment.id,
      entryId: deployEntry.id,
    })

    expect(result.success).toBe(false)
    const unchanged = await db.environmentLogEntry.findUniqueOrThrow({ where: { id: deployEntry.id } })
    expect(unchanged.validatedAt).toBeNull()
    expect(unchanged.validatedById).toBeNull()
  })

  it('uses the linked ticket as the deploy subject for incidence availability', async () => {
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence, module, workItem } = await createReviewIncidenceWithUser(dev.id)
    const tracklist = await createTracklist(qa.id)
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
    })

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const entries = await db.environmentLogEntry.findMany()
    expect(entries[0]).toMatchObject({ ticketId: ticket.id, incidenceId: incidence.id })

    const availability = await getEnvironmentAvailability({ incidenceId: incidence.id })
    expect(availability.data?.[0]).toMatchObject({ environmentId: environment.id, isAvailable: true })
  })

  it('uses incidence deploys directly when there is no ticket', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const availability = await getEnvironmentAvailability({ incidenceId: incidence.id })
    expect(availability.data?.[0]).toMatchObject({ environmentId: environment.id, isAvailable: true })
  })

  it('marks a deployed incidence pending again after it re-enters review', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    await updateIncidenceStatus(incidence.id, TaskStatus.IN_PROGRESS, 1)
    await updateIncidenceStatus(incidence.id, TaskStatus.REVIEW, 1)

    const pending = await getPendingEnvironmentDeployItems(environment.id)
    expect(pending.data?.map((item) => item.incidenceId)).toEqual([incidence.id])
  })

  it('builds deploy batch SQL ordered by work item type and number', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const consWorkItem = await createExternalWorkItem('I_CONS')
    const modaplWorkItem = await createExternalWorkItem('I_MODAPL')
    const { technology } = await createTechnologyModule()
    const cons = await createIncidenceFixture({
      externalWorkItemId: consWorkItem.id,
      technologyId: technology.id,
      status: TaskStatus.REVIEW,
      assignees: [{ userId: dev.id, assignedHours: 1 }],
      tasks: [{ userId: dev.id, title: 'Lista', isCompleted: true }],
    })
    const modapl = await createIncidenceFixture({
      externalWorkItemId: modaplWorkItem.id,
      technologyId: technology.id,
      status: TaskStatus.REVIEW,
      assignees: [{ userId: dev.id, assignedHours: 1 }],
      tasks: [{ userId: dev.id, title: 'Lista', isCompleted: true }],
    })
    await db.script.createMany({
      data: [
        { incidenceId: cons.incidence.id, createdById: dev.id, type: 'SQL', content: 'select 2;' },
        { incidenceId: modapl.incidence.id, createdById: dev.id, type: 'SQL', content: 'select 1;' },
      ],
    })
    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [
        { incidenceId: cons.incidence.id },
        { incidenceId: modapl.incidence.id },
      ],
    })
    const [{ batchId }] = await db.environmentLogEntry.findMany({ select: { batchId: true }, take: 1 })

    const result = await getEnvironmentDeployBatchSql({ environmentId: environment.id, batchId })

    expect(result.success).toBe(true)
    expect(result.data?.sql).toBe([
      `--I_MODAPL ${modaplWorkItem.externalId} ${modapl.incidence.description}`,
      '',
      'select 1;',
      '',
      `--I_CONS ${consWorkItem.externalId} ${cons.incidence.description}`,
      '',
      'select 2;',
    ].join('\n'))
  })

  it('uses only SQL scripts when building deploy batch SQL', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence, workItem } = await createReviewIncidenceWithUser(dev.id)
    await db.script.createMany({
      data: [
        { incidenceId: incidence.id, createdById: dev.id, type: 'CODE', content: 'console.log("skip")' },
        { incidenceId: incidence.id, createdById: dev.id, type: 'SQL', content: 'select 1;' },
      ],
    })
    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })
    const [{ batchId }] = await db.environmentLogEntry.findMany({ select: { batchId: true }, take: 1 })

    const result = await getEnvironmentDeployBatchSql({ environmentId: environment.id, batchId })

    expect(result.success).toBe(true)
    expect(result.data?.sql).toBe([
      `--I_MODAPL ${workItem.externalId} ${incidence.description}`,
      '',
      'select 1;',
    ].join('\n'))
  })

  it('stores favorite environments per user', async () => {
    const firstUser = await createUser(UserRole.DEV)
    const secondUser = await createUser(UserRole.DEV)
    const environment = await createEnabledEnvironment()

    actAs(firstUser)
    await toggleEnvironmentFavorite(environment.id)
    expect((await getSidebarFavoriteEnvironments()).data).toEqual([
      { id: environment.id, name: environment.name },
    ])

    actAs(secondUser)
    expect((await getSidebarFavoriteEnvironments()).data).toEqual([])
  })
})
