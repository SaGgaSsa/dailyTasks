import { PrismaClient, UserRole, TaskType, TaskStatus, Priority, TechStack } from '@prisma/client'
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
]

const STATUSES: TaskStatus[] = [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE]

async function createAdmin(passwordHash: string) {
  const admin = await prisma.user.upsert({
    where: { username: 'ADM' },
    update: {},
    create: {
      username: 'ADM',
      name: 'Administrador',
      email: 'admin1@gmail.com',
      password: passwordHash,
      role: UserRole.ADMIN,
      technologies: [TechStack.SISA],
    },
  })
  console.log(`Created admin: ${admin.username}`)
  return admin
}

async function createDev(passwordHash: string) {
  const dev = await prisma.user.upsert({
    where: { username: 'DEV' },
    update: {},
    create: {
      username: 'DEV',
      name: 'Developer',
      email: 'dev1@gmail.com',
      password: passwordHash,
      role: UserRole.DEV,
      technologies: [TechStack.SISA],
    },
  })
  console.log(`Created dev: ${dev.username}`)
  return dev
}

async function createIncidencesForUser(user: { id: number }, userType: 'admin' | 'dev') {
  const incidences: { id: number; type: string; externalId: number }[] = []
  let externalId = userType === 'admin' ? 1000 : 2000

  for (const status of STATUSES) {
    const title = INCIDENCE_TITLES[incidences.length % INCIDENCE_TITLES.length]

    const incidence = await prisma.incidence.upsert({
      where: { type_externalId: { type: TaskType.I_MODAPL, externalId } },
      update: {},
      create: {
        type: TaskType.I_MODAPL,
        externalId,
        title,
        description: title,
        status,
        priority: Priority.MEDIUM,
        technology: TechStack.SISA,
        estimatedTime: 8,
      },
    })
    incidences.push(incidence)
    console.log(`Created incidence: ${incidence.type}${incidence.externalId} (${status})`)

    await prisma.assignment.create({
      data: {
        incidenceId: incidence.id,
        userId: user.id,
        assignedHours: 8,
        isAssigned: true,
      },
    })
    console.log(`Assigned incidence to ${userType}`)

    await prisma.subTask.create({
      data: {
        title: TASK_TITLES[incidences.length % TASK_TITLES.length],
        isCompleted: false,
        assignmentId: incidence.id,
      },
    })
    console.log(`Created task for incidence ${incidence.type}${incidence.externalId}`)

    externalId++
  }

  return incidences
}

async function main() {
  try {
    console.log('Starting seed data generation...')
    
    const passwordHash = await hash(PASSWORD, 12)
    
    console.log('\n--- Creating Admin ---')
    const admin = await createAdmin(passwordHash)
    
    console.log('\n--- Creating Dev ---')
    const dev = await createDev(passwordHash)
    
    console.log('\n--- Creating Incidences for Admin ---')
    await createIncidencesForUser(admin, 'admin')
    
    console.log('\n--- Creating Incidences for Dev ---')
    await createIncidencesForUser(dev, 'dev')
    
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
