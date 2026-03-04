import { PrismaClient, UserRole, TaskType, TaskStatus, Priority } from '@prisma/client'
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

const INCIDENCE_TITLES = [
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
  const incidences: { id: number; type: string; externalId: number }[] = []
  let externalId = userType === 'admin' ? 1000 : 2000
  const INCIDENCES_PER_STATUS = 5

  const sisaTech = await getTechnologyByName('SISA')

  for (const status of STATUSES) {
    for (let i = 0; i < INCIDENCES_PER_STATUS; i++) {
      const titleIndex = (incidences.length) % INCIDENCE_TITLES.length
      const title = `${INCIDENCE_TITLES[titleIndex]} #${i + 1}`

      let incidence = await prisma.incidence.findUnique({
        where: { type_externalId: { type: TaskType.I_MODAPL, externalId } },
      })

      if (!incidence) {
        incidence = await prisma.incidence.create({
          data: {
            type: TaskType.I_MODAPL,
            externalId,
            title,
            comment: title,
            status,
            priority: Priority.MEDIUM,
            technology: { connect: { id: sisaTech!.id } },
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

      const existingSubtask = await prisma.subTask.findFirst({
        where: { assignmentId: incidence.id },
      })
      if (!existingSubtask) {
        await prisma.subTask.create({
          data: {
            title: TASK_TITLES[incidences.length % TASK_TITLES.length],
            isCompleted: false,
            assignmentId: incidence.id,
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

  for (let i = 0; i < incidenceTitles.length; i++) {
    await prisma.incidence.upsert({
      where: { type_externalId: { type: TaskType.I_MODAPL, externalId: 3000 + i } },
      update: {},
      create: {
        type: TaskType.I_MODAPL,
        externalId: 3000 + i,
        title: incidenceTitles[i],
        comment: `Incidencia para liberacion de abril #${i + 1}`,
        status: i < 2 ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        technologyId: sisaTech.id,
        tracklistId: tracklist.id,
        estimatedTime: 16,
      },
    })
    console.log(`Created/updated incidence: ${incidenceTitles[i]} linked to tracklist`)
  }

  console.log(`Tracklist "${tracklist.title}" created with ${incidenceTitles.length} incidences`)
}

async function main() {
  try {
    console.log('Starting seed data generation...')
    
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
