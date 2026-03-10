import { PrismaClient, UserRole, TaskType, TaskStatus, Priority, TicketQAStatus, TicketType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PASSWORD = 'sisa0314'

async function truncateTables() {
  await prisma.$executeRaw`TRUNCATE TABLE tickets_qa, assignments, sub_tasks, attachments, incidence_pages, incidences, external_work_items, modules, tracklists, technologies, users RESTART IDENTITY CASCADE`
  console.log('All tables truncated')
}

const TECHNOLOGIES = [
  { name: 'SISA', slug: 'sisa', isDefault:true },
  { name: 'WEB', slug: 'web' },
  { name: 'ANDROID', slug: 'android' },
  { name: 'ANGULAR', slug: 'angular' },
  { name: 'SPRING', slug: 'spring' },
]

const MODULES = [
  // SISA
  { name: 'Serv', slug: 'serv', techName: 'SISA', isDefault: true },
  { name: 'Comun', slug: 'comun', techName: 'SISA' },
  // WEB
  { name: 'WkFlow', slug: 'wkflow', techName: 'WEB' },
  { name: 'OBase', slug: 'obase', techName: 'WEB' },
  // ANDROID
  { name: 'MyTasksApp', slug: 'mytasksapp', techName: 'ANDROID' },
  { name: 'MobileLibrary', slug: 'mobilelibrary', techName: 'ANDROID' },
  { name: 'FormLibrary', slug: 'formlibrary', techName: 'ANDROID' },
  // ANGULAR
  { name: 'MyTasks', slug: 'mytasks', techName: 'ANGULAR' },
  { name: 'Mobile', slug: 'mobile', techName: 'ANGULAR' },
  // SPRING
  { name: 'MyTasksServer', slug: 'mytasksserver', techName: 'SPRING' },
  { name: 'MobileServer', slug: 'mobileserver', techName: 'SPRING' },
]

const TASK_TITLES = [
  'Analizar requisitos del caso',
  'Revisar código existente',
  'Implementar cambios necesarios',
  'Crear unit tests',
  'Realizar pruebas manuales',
  'Documentar cambios',
  'Review de código',
  'Verificar en ambiente de desarrollo',
  'Corregir defectos encontrados',
  'Validar con el cliente',
]

const INCIDENCE_DESCRIPTIONS = [
  'Error en validación de formularios',
  'Fallo en integración con API externa',
  'Problema de rendimiento en consulta',
  'Inconsistencia en datos mostrados',
  'Error al guardar registro',
  'Bug en cálculo de totales',
  'Falla en autenticación de usuarios',
  'Error al generar reporte PDF',
  'Problema con exportación Excel',
  'Timeout en consulta de datos',
  'Memory leak en proceso batch',
  'Error en envío de notificaciones',
  'Falla en carga de archivos',
  'Problema de concurrencia',
  'Error en validación de reglas de negocio',
]

const STATUSES: TaskStatus[] = [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE]

async function ensureTechnologies() {
  for (const tech of TECHNOLOGIES) {
    await prisma.technology.upsert({
      where: { name: tech.name },
      update: {},
      create: { name: tech.name },
    })
  }
  console.log(`Ensured ${TECHNOLOGIES.length} technologies`)
}

async function ensureModules() {
  for (const mod of MODULES) {
    const tech = await prisma.technology.findUnique({
      where: { name: mod.techName },
    })
    if (!tech) {
      console.warn(`Technology ${mod.techName} not found, skipping module ${mod.name}`)
      continue
    }
    await prisma.module.upsert({
      where: { slug: mod.slug },
      update: {},
      create: {
        name: mod.name,
        slug: mod.slug,
        technologyId: tech.id,
      },
    })
  }
  console.log(`Ensured ${MODULES.length} modules`)
}

async function getTechnologyByName(name: string) {
  return prisma.technology.findUnique({ where: { name } })
}

async function createAdmin(passwordHash: string) {
  const sisaTech = await getTechnologyByName('SISA')
  const admin = await prisma.user.upsert({
    where: { username: 'ADM' },
    update: {},
    create: {
      username: 'ADM',
      name: 'Administrador',
      email: 'admin1@gmail.com',
      password: passwordHash,
      role: UserRole.ADMIN,
      technologies: { connect: { id: sisaTech!.id } },
    },
  })
  console.log(`Created admin: ${admin.username}`)
  return admin
}

async function createDev(passwordHash: string) {
  const sisaTech = await getTechnologyByName('SISA')
  const dev = await prisma.user.upsert({
    where: { username: 'DEV' },
    update: {},
    create: {
      username: 'DEV',
      name: 'Developer',
      email: 'dev1@gmail.com',
      password: passwordHash,
      role: UserRole.DEV,
      technologies: { connect: { id: sisaTech!.id } },
    },
  })
  console.log(`Created dev: ${dev.username}`)
  return dev
}

async function createIncidencesForUser(user: { id: number }, userType: 'admin' | 'dev') {
  const incidences: { id: number }[] = []
  let externalId = userType === 'admin' ? 1000 : 2000
  const INCIDENCES_PER_STATUS = 5

  const sisaTech = await getTechnologyByName('SISA')

  for (const status of STATUSES) {
    for (let i = 0; i < INCIDENCES_PER_STATUS; i++) {
      const descriptionIndex = (incidences.length) % INCIDENCE_DESCRIPTIONS.length
      const description = `${INCIDENCE_DESCRIPTIONS[descriptionIndex]} #${i + 1}`

      const workItem = await prisma.externalWorkItem.upsert({
        where: { type_externalId: { type: TaskType.I_MODAPL, externalId } },
        create: { type: TaskType.I_MODAPL, externalId, title: description },
        update: {},
      })

      let incidence = await prisma.incidence.findFirst({
        where: { externalWorkItemId: workItem.id },
      })

      if (!incidence) {
        incidence = await prisma.incidence.create({
          data: {
            externalWorkItemId: workItem.id,
            description,
            comment: description,
            status,
            priority: Priority.MEDIUM,
            technologyId: sisaTech!.id,
            estimatedTime: 8,
          },
        })
      }
      incidences.push(incidence)

      const existingAssignment = await prisma.assignment.findUnique({
        where: { incidenceId_userId: { incidenceId: incidence.id, userId: user.id } },
      })
      if (!existingAssignment) {
        await prisma.assignment.create({
          data: {
            incidenceId: incidence.id,
            userId: user.id,
            assignedHours: 8,
            isAssigned: true,
          },
        })
      }

      const assignment = await prisma.assignment.findUnique({
        where: { incidenceId_userId: { incidenceId: incidence.id, userId: user.id } },
      })

      const existingSubtask = await prisma.subTask.findFirst({
        where: { assignmentId: assignment!.id },
      })
      if (!existingSubtask) {
        await prisma.subTask.create({
          data: {
            title: TASK_TITLES[incidences.length % TASK_TITLES.length],
            isCompleted: false,
            assignmentId: assignment!.id,
          },
        })
      }

      externalId++
    }
    console.log(`Created ${INCIDENCES_PER_STATUS} incidences with status ${status} for ${userType}`)
  }

  console.log(`Total incidences for ${userType}: ${incidences.length}`)
  return incidences
}

async function createTracklistWithIncidences() {
  const admin = await prisma.user.findUnique({ where: { username: 'ADM' } })
  const sisaTech = await getTechnologyByName('SISA')
  
  if (!admin || !sisaTech) {
    console.warn('Admin or SISA technology not found, skipping tracklist creation')
    return
  }

  const dueDate = new Date('2026-04-30')

  let tracklist = await prisma.tracklist.findFirst({
    where: { title: 'Liberacion Abril' },
  })

  if (!tracklist) {
    tracklist = await prisma.tracklist.create({
      data: {
        title: 'Liberacion Abril',
        description: 'Liberacion Abril',
        dueDate,
        createdById: admin.id,
      },
    })
    console.log(`Created tracklist: ${tracklist.title}`)
  } else {
    console.log(`Tracklist already exists: ${tracklist.title}`)
  }

  const incidenceTitles = [
    'Actualizacion de modulo de usuarios',
    'Mejora en rendimiento de busqueda',
    'Nuevo reporte de gestion',
    'Correccion de errores en produccion',
    'Implementacion de notificaciones push',
  ]

  const createdWorkItems = []
  for (let i = 0; i < incidenceTitles.length; i++) {
    const workItem = await prisma.externalWorkItem.upsert({
      where: { type_externalId: { type: TaskType.I_MODAPL, externalId: 3000 + i } },
      create: { type: TaskType.I_MODAPL, externalId: 3000 + i, title: incidenceTitles[i] }, // ExternalWorkItem.title
      update: {},
    })
    createdWorkItems.push(workItem)

    const existingInc = await prisma.incidence.findFirst({ where: { externalWorkItemId: workItem.id } })
    if (!existingInc) {
      await prisma.incidence.create({
        data: {
          externalWorkItemId: workItem.id,
          description: incidenceTitles[i],
          comment: `Incidencia para liberacion de abril #${i + 1}`,
          status: i < 2 ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          technologyId: sisaTech.id,
          estimatedTime: 16,
        },
      })
    }
    console.log(`Created/updated ExternalWorkItem: ${incidenceTitles[i]} linked to tracklist`)
  }
  await prisma.tracklist.update({
    where: { id: tracklist.id },
    data: { externalWorkItems: { connect: createdWorkItems.map(w => ({ id: w.id })) } }
  })

  await createAdditionalTracklistTickets(tracklist.id, sisaTech.id, admin.id)

  console.log(`Tracklist "${tracklist.title}" created with ${incidenceTitles.length} incidences and 30 tickets QA`)
}

const TRACKLIST_RANDOM_TITLES = [
  'Sprint Q2 Revisión',
  'Hotfix Producción Marzo',
  'Mejoras UX Pendientes',
  'Deuda técnica Backend',
  'Validación Pre-Release',
]

const TRACKLIST_RANDOM_DESCRIPTIONS = [
  'Revisión de cambios previos a merge.',
  'Correcciones críticas detectadas en producción.',
  'Listado de mejoras priorizadas por producto.',
  'Tareas de refactor y limpieza de código.',
  'Checklist antes de liberar a clientes.',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFutureDate(daysFromNowMin: number, daysFromNowMax: number): Date {
  const days = daysFromNowMin + Math.floor(Math.random() * (daysFromNowMax - daysFromNowMin + 1))
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function createTracklistWithoutTickets() {
  const admin = await prisma.user.findUnique({ where: { username: 'ADM' } })
  const sisaTech = await getTechnologyByName('SISA')

  if (!admin || !sisaTech) {
    console.warn('Admin or SISA technology not found, skipping tracklist without tickets')
    return
  }

  const title = randomItem(TRACKLIST_RANDOM_TITLES)
  const existing = await prisma.tracklist.findFirst({ where: { title } })
  if (existing) {
    console.log(`Tracklist "${title}" already exists, skipping`)
    return
  }

  const tracklist = await prisma.tracklist.create({
    data: {
      title,
      description: randomItem(TRACKLIST_RANDOM_DESCRIPTIONS),
      dueDate: randomFutureDate(7, 60),
      createdById: admin.id,
    },
  })

  // Opcional: vincular 1–2 ExternalWorkItems al tracklist (sin crear tickets QA)
  const workItemTitles = [
    'Tarea de revisión pendiente',
    'Ajuste post-release',
  ]
  const baseExternalId = 5000
  for (let i = 0; i < workItemTitles.length; i++) {
    await prisma.externalWorkItem.upsert({
      where: { type_externalId: { type: TaskType.I_MODAPL, externalId: baseExternalId + i } },
      create: { type: TaskType.I_MODAPL, externalId: baseExternalId + i, title: workItemTitles[i] },
      update: {},
    })
  }

  const workItems = await prisma.externalWorkItem.findMany({
    where: { externalId: { in: workItemTitles.map((_, i) => baseExternalId + i) } }
  })
  await prisma.tracklist.update({
    where: { id: tracklist.id },
    data: { externalWorkItems: { connect: workItems.map(w => ({ id: w.id })) } }
  })

  console.log(`Created tracklist without tickets: ${tracklist.title} (${workItemTitles.length} work items, 0 tickets)`)
}

async function createAdditionalTracklistTickets(tracklistId: number, technologyId: number, adminId: number) {
  const additionalTitles = [
    'Actualizacion de modulo de clientes',
    'Mejora en rendimiento de consultas',
    'Nuevo reporte de ventas',
    'Correccion de bugs menores',
    'Implementacion de cache',
    'Refactorizacion de servicios',
    'Optimizacion de base de datos',
    'Actualizacion de dependencias',
    'Mejora en interfaz de usuario',
    'Implementacion de logueo',
    'Correccion de errores de seguridad',
    'Actualizacion de documentacion',
    'Pruebas de integracion',
    'Mejora en tiempos de respuesta',
    'Implementacion de filtros avanzados',
    'Actualizacion de modulos legacy',
    'Mejora en manejo de errores',
    'Implementacion de exportacion PDF',
    'Actualizacion de API rest',
    'Mejora en validaciones',
    'Implementacion de webhooks',
    'Optimizacion de memoria',
    'Actualizacion de caches',
    'Mejora en autenticacion',
    'Implementacion de auditoria',
    'Actualizacion de reportes',
    'Mejora en busquedas',
    'Implementacion de GraphQL',
    'Actualizacion de dashboard',
    'Mejora en rendimiento general',
  ]

  const statuses: TicketQAStatus[] = [
    TicketQAStatus.NEW,
    TicketQAStatus.ASSIGNED,
    TicketQAStatus.IN_DEVELOPMENT,
    TicketQAStatus.TEST,
    TicketQAStatus.COMPLETED,
    TicketQAStatus.DISMISSED,
  ]
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.BLOCKER]
  const moduleSlugs = ['serv', 'comun', 'wkflow', 'obase']
  const types = [TicketType.BUG, TicketType.CAMBIO, TicketType.CONSULTA]

  const moduleRecords = await Promise.all(
    moduleSlugs.map(slug => prisma.module.findUnique({ where: { slug } }))
  )

  const lastTicket = await prisma.ticketQA.findFirst({
    where: { tracklistId },
    orderBy: { ticketNumber: 'desc' },
  })
  let ticketNumber = (lastTicket?.ticketNumber || 0)

  for (let i = 0; i < additionalTitles.length; i++) {
    ticketNumber++
    const moduleRecord = moduleRecords[i % moduleRecords.length]
    if (!moduleRecord) {
      console.warn(`Module not found for slug ${moduleSlugs[i % moduleSlugs.length]}, skipping ticket`)
      continue
    }
    await prisma.ticketQA.upsert({
      where: { tracklistId_ticketNumber: { tracklistId, ticketNumber } },
      update: { priority: priorities[i % priorities.length] },
      create: {
        tracklistId,
        ticketNumber,
        type: types[i % types.length],
        moduleId: moduleRecord.id,
        description: additionalTitles[i],
        priority: priorities[i % priorities.length],
        reportedById: adminId,
        assignedToId: adminId,
        status: statuses[i % statuses.length],
      },
    })
  }
  console.log(`Created/updated ${additionalTitles.length} TicketQA records for tracklist`)
}

async function createICasoIncidences() {
  const sisaTech = await getTechnologyByName('SISA')
  
  if (!sisaTech) {
    console.warn('SISA technology not found, skipping I_CASO creation')
    return
  }

  const tracklist = await prisma.tracklist.findFirst({
    where: { title: 'Liberacion Abril' },
  })

  const iCasosTitles = [
    'Consulta de datos de cliente',
    'Error en consulta de historial',
    'Duplicado en consulta',
  ]

  const workItemIds: number[] = []

  for (let i = 0; i < iCasosTitles.length; i++) {
    const externalId = 3000 + i
    const title = iCasosTitles[i]

    const workItem = await prisma.externalWorkItem.upsert({
      where: { type_externalId: { type: TaskType.I_CASO, externalId } },
      create: { type: TaskType.I_CASO, externalId, title },
      update: { title },
    })
    workItemIds.push(workItem.id)

    const existing = await prisma.incidence.findFirst({ where: { externalWorkItemId: workItem.id } })
    if (!existing) {
      await prisma.incidence.create({
        data: {
          externalWorkItemId: workItem.id,
          description: title,
          comment: `Incidencia I_CASO #${i + 1}`,
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          technologyId: sisaTech.id,
          estimatedTime: 8,
        },
      })
      console.log(`Created I_CASO incidence: ${title} (externalId: ${externalId})`)
    }
  }

  if (tracklist && workItemIds.length > 0) {
    await prisma.tracklist.update({
      where: { id: tracklist.id },
      data: { externalWorkItems: { connect: workItemIds.map(id => ({ id })) } },
    })
  }

  for (let i = 0; i < 5; i++) {
    const externalId = 4000 + i
    const title = `Caso de prueba ${i + 1}`

    const workItem = await prisma.externalWorkItem.upsert({
      where: { type_externalId: { type: TaskType.I_CASO, externalId } },
      create: { type: TaskType.I_CASO, externalId, title },
      update: { title },
    })

    const existing = await prisma.incidence.findFirst({ where: { externalWorkItemId: workItem.id } })
    if (!existing) {
      await prisma.incidence.create({
        data: {
          externalWorkItemId: workItem.id,
          description: title,
          comment: `Incidencia I_CASO de prueba #${i + 1}`,
          status: i < 2 ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
          priority: Priority.LOW,
          technologyId: sisaTech.id,
          estimatedTime: 4,
        },
      })
      console.log(`Created I_CASO incidence: ${title} (externalId: ${externalId})`)
    }
  }

  console.log('I_CASO incidences created with same externalIds as I_MODAPL')
}

async function main() {
  try {
    console.log('Starting seed data generation...')
    
    console.log('\n--- Truncating Tables ---')
    await truncateTables()
    
    const passwordHash = await hash(PASSWORD, 12)
    
    console.log('\n--- Ensuring Technologies ---')
    await ensureTechnologies()

    console.log('\n--- Ensuring Modules ---')
    await ensureModules()
    
    console.log('\n--- Creating Admin ---')
    const admin = await createAdmin(passwordHash)
    
    console.log('\n--- Creating Dev ---')
    const dev = await createDev(passwordHash)
    
    console.log('\n--- Creating Incidences for Admin ---')
    await createIncidencesForUser(admin, 'admin')
    
    console.log('\n--- Creating Incidences for Dev ---')
    await createIncidencesForUser(dev, 'dev')

    console.log('\n--- Creating Tracklist with Incidences ---')
    await createTracklistWithIncidences()

    console.log('\n--- Creating Tracklist without Tickets ---')
    await createTracklistWithoutTickets()

    console.log('\n--- Creating I_CASO Incidences ---')
    await createICasoIncidences()
    
    console.log('\n--- Seed completed successfully! ---')
    
  } catch (error) {
    console.error('Seed error:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
