import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SEED_ADMIN_PASSWORD = '1234'

const TECHNOLOGIES = [
  { name: 'SISA', slug: 'sisa', isDefault: true },
  { name: 'WEB', slug: 'web', isDefault: false },
  { name: 'ANDROID', slug: 'android', isDefault: false },
  { name: 'ANGULAR', slug: 'angular', isDefault: false },
  { name: 'SPRING', slug: 'spring', isDefault: false },
]

const MODULES = [
  { name: 'Serv', slug: 'serv', techName: 'SISA', isDefault: true },
  { name: 'Comun', slug: 'comun', techName: 'SISA', isDefault: false },
  { name: 'WkFlow', slug: 'wkflow', techName: 'WEB', isDefault: false },
  { name: 'OBase', slug: 'obase', techName: 'WEB', isDefault: false },
  { name: 'MyTasksApp', slug: 'mytasksapp', techName: 'ANDROID', isDefault: false },
  { name: 'MobileLibrary', slug: 'mobilelibrary', techName: 'ANDROID', isDefault: false },
  { name: 'FormLibrary', slug: 'formlibrary', techName: 'ANDROID', isDefault: false },
  { name: 'MyTasks', slug: 'mytasks', techName: 'ANGULAR', isDefault: false },
  { name: 'Mobile', slug: 'mobile', techName: 'ANGULAR', isDefault: false },
  { name: 'MyTasksServer', slug: 'mytasksserver', techName: 'SPRING', isDefault: false },
  { name: 'MobileServer', slug: 'mobileserver', techName: 'SPRING', isDefault: false },
]

async function truncateTables() {
  const candidateTables = [
    'tickets_qa',
    'assignments',
    'tasks',
    'sub_tasks',
    'attachments',
    'incidence_pages',
    'incidences',
    'external_work_items',
    'modules',
    'tracklists',
    'technologies',
    'users',
  ]

  const quotedCandidates = candidateTables.map((table) => `'${table}'`).join(', ')
  const existingRows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (${quotedCandidates})
    `
  )
  const existing = new Set(existingRows.map((row) => row.tablename))
  const tablesToTruncate = candidateTables.filter((table) => existing.has(table))

  if (tablesToTruncate.length === 0) {
    console.log('No tables found to truncate')
    return
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`
  )
  console.log(`Truncated tables: ${tablesToTruncate.join(', ')}`)
}

async function ensureTechnologies() {
  for (const tech of TECHNOLOGIES) {
    await prisma.technology.upsert({
      where: { name: tech.name },
      update: { isDefault: tech.isDefault },
      create: {
        name: tech.name,
        isDefault: tech.isDefault,
      },
    })
  }

  console.log(`Ensured ${TECHNOLOGIES.length} technologies`)
}

async function ensureModules() {
  for (const mod of MODULES) {
    const tech = await prisma.technology.findUnique({
      where: { name: mod.techName },
      select: { id: true },
    })

    if (!tech) {
      throw new Error(`Technology ${mod.techName} not found for module ${mod.name}`)
    }

    await prisma.module.upsert({
      where: { slug: mod.slug },
      update: {
        name: mod.name,
        technologyId: tech.id,
        isDefault: mod.isDefault,
      },
      create: {
        name: mod.name,
        slug: mod.slug,
        technologyId: tech.id,
        isDefault: mod.isDefault,
      },
    })
  }

  console.log(`Ensured ${MODULES.length} modules`)
}

async function createAdmin(passwordHash: string) {
  const defaultTechnology = await prisma.technology.findFirst({
    where: { isDefault: true },
    select: { id: true, name: true },
  })

  if (!defaultTechnology) {
    throw new Error('Default technology not found')
  }

  const admin = await prisma.user.create({
    data: {
      username: 'ADMIN',
      name: 'Administrador',
      email: 'admin1@gmail.com',
      password: passwordHash,
      role: UserRole.ADMIN,
      technologies: {
        connect: [{ id: defaultTechnology.id }],
      },
    },
  })

  console.log(`Created admin user ${admin.email} with default technology ${defaultTechnology.name}`)
}

async function main() {
  try {
    console.log('Starting minimal seed...')

    console.log('\n--- Truncating Tables ---')
    await truncateTables()

    console.log('\n--- Ensuring Technologies ---')
    await ensureTechnologies()

    console.log('\n--- Ensuring Modules ---')
    await ensureModules()

    console.log('\n--- Creating Admin ---')
    const passwordHash = await hash(SEED_ADMIN_PASSWORD, 12)
    await createAdmin(passwordHash)

    console.log('\n--- Minimal seed completed successfully! ---')
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
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
