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

const SUBTASK_TEMPLATES = [
  'Analizar requisitos del caso',
  'Revisar código existente',
  'Implementar cambios necesarios',
  'Crear unit tests',
  'Realizar pruebas manuales',
  'Documentar cambios',
  'Review de código',
  'Actualizar documentación técnica',
  'Verificar en ambiente de desarrollo',
  'Corregir defectos encontrados',
  'Optimizar rendimiento',
  'Revisar con el equipo',
  'Preparar release notes',
  'Validar con el cliente',
  'Migrar datos si aplica',
  'Configurar ambiente de pruebas',
  'Revisar logs de error',
  'Actualizar casos de prueba',
  'Verificar compatibilidad',
  'Revisar accesibilidad',
]

const INCIDENCE_TITLES = [
  'Error en validación de formularios',
  'Fallo en integración con API externa',
  'Problema de rendimiento en consulta',
  'Inconsistencia en datos mostrados',
  'Error al guardar registro',
  'Fallo en autenticación SSO',
  'Problema de timezone',
  'Error en exportación de reportes',
  'Fallo en carga de archivos',
  'Inconsistencia en cálculos',
  'Error en paginación',
  'Problema de responsive design',
  'Fallo en notificaciones',
  'Error en filtros avanzados',
  'Problema de sincronización',
  'Error en importación de datos',
  'Fallo en exportación PDF',
  'Problema de seguridad detectado',
  'Error en integración con ERP',
  'Fallo en módulo de reportes',
]

const TECH_STACKS: TechStack[] = ['SISA']

function randomEnum<T extends object>(enumObj: T): T[keyof T] {
  const values = Object.values(enumObj)
  return values[Math.floor(Math.random() * values.length)] as T[keyof T]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomItems<T>(array: T[], min: number, max: number): T[] {
  const count = randomInt(min, max)
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

async function createAdmins(passwordHash: string) {
  const admins = []
  for (let i = 1; i <= 2; i++) {
    const admin = await prisma.user.upsert({
      where: { username: `admin${i}` },
      update: {},
      create: {
        username: `admin${i}`,
        name: `Admin ${i}`,
        email: `admin${i}@gmail.com`,
        password: passwordHash,
        role: UserRole.ADMIN,
        technologies: TECH_STACKS,
      },
    })
    admins.push(admin)
    console.log(`Created admin: ${admin.username}`)
  }
  return admins
}

async function createDevs(passwordHash: string) {
  const devs = []
  for (let i = 1; i <= 8; i++) {
    const dev = await prisma.user.upsert({
      where: { username: `dev${i}` },
      update: {},
      create: {
        username: `dev${i}`,
        name: `Developer ${i}`,
        email: `dev${i}@gmail.com`,
        password: passwordHash,
        role: UserRole.DEV,
        technologies: TECH_STACKS,
      },
    })
    devs.push(dev)
    console.log(`Created dev: ${dev.username}`)
  }
  return devs
}

async function createIncidences(devs: { id: number }[]) {
  const incidences = []
  const usedExternalIds = new Set<number>()
  const types: TaskType[] = ['I_MODAPL', 'I_MODAPL', 'I_MODAPL', 'I_CASO', 'I_CASO']
  const statuses = [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE]
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.MEDIUM, Priority.HIGH, Priority.HIGH]

  for (let i = 0; i < 20; i++) {
    let externalId: number
    do {
      externalId = randomInt(1000, 4000)
    } while (usedExternalIds.has(externalId))
    usedExternalIds.add(externalId)

    const type = randomItem(types)
    const title = randomItem(INCIDENCE_TITLES)
    const description = `${type}${externalId}: ${title}`
    const status = randomItem(statuses)
    const priority = randomItem(priorities)
    const estimatedTime = Math.random() < 0.7 ? randomInt(1, 60) : null

    const incidence = await prisma.incidence.upsert({
      where: { type_externalId: { type, externalId } },
      update: {},
      create: {
        type,
        externalId,
        title: description,
        description,
        status,
        priority,
        technology: TechStack.SISA,
        estimatedTime,
      },
    })
    incidences.push(incidence)
    console.log(`Created incidence: ${type}${externalId}`)
  }

  return incidences
}

async function assignIncidences(incidences: { id: number }[], devs: { id: number }[]) {
  for (const incidence of incidences) {
    if (Math.random() < 0.8) {
      const assignees = randomItems(devs, 1, 3)
      await prisma.incidence.update({
        where: { id: incidence.id },
        data: {
          assignees: {
            connect: assignees.map(d => ({ id: d.id })),
          },
        },
      })
      console.log(`Assigned incidence ${incidence.id} to ${assignees.length} dev(s)`)
    }
  }
}

async function createSubTasks(incidences: { id: number }[]) {
  for (const incidence of incidences) {
    const shouldHaveSubtasks = Math.random() < 0.6
    if (shouldHaveSubtasks) {
      const subtaskCount = randomInt(1, 5)
      const selectedTemplates = randomItems(SUBTASK_TEMPLATES, 1, subtaskCount)
      
      for (const template of selectedTemplates) {
        await prisma.subTask.create({
          data: {
            title: template,
            isCompleted: Math.random() < 0.5,
            incidenceId: incidence.id,
          },
        })
      }
      console.log(`Created ${selectedTemplates.length} subtasks for incidence ${incidence.id}`)
    }
  }
}

export async function seedData() {
  try {
    console.log('Starting seed data generation...')
    
    const passwordHash = await hash(PASSWORD, 12)
    
    console.log('\n--- Creating Admins ---')
    const admins = await createAdmins(passwordHash)
    
    console.log('\n--- Creating Devs ---')
    const devs = await createDevs(passwordHash)
    
    console.log('\n--- Creating Incidences ---')
    const incidences = await createIncidences(devs)
    
    console.log('\n--- Assigning Incidences to Devs ---')
    await assignIncidences(incidences, devs)
    
    console.log('\n--- Creating SubTasks ---')
    await createSubTasks(incidences)
    
    console.log('\n--- Seed completed successfully! ---')
    console.log(`Created ${admins.length} admins, ${devs.length} devs, ${incidences.length} incidences`)
    
  } catch (error) {
    console.error('Seed error:', error)
    throw error
  }
}

if (require.main === module) {
  seedData()
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
}
