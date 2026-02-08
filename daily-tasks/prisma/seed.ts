import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await hash('123456', 12)

  // Crear usuario admin
  const sag = await prisma.user.upsert({
    where: { username: 'SAG' },
    update: {},
    create: {
      id: 140,
      username: 'SAG',
      name: 'Sebastian Galarza',
      email: 'sebastian.galarza@sisa.com.ar',
      password,
      role: 'ADMIN',
      technologies: ['SISA', 'WEB', 'ANDROID', 'ANGULAR', 'SPRING'],
    },
  })

  // Crear desarrolladores de ejemplo
  const dev1 = await prisma.user.upsert({
    where: { username: 'dev1' },
    update: {},
    create: {
      username: 'dev1',
      name: 'Desarrollador Uno',
      email: 'dev1@sisa.com.ar',
      password,
      role: 'DEV',
      technologies: ['ANGULAR', 'SPRING'],
    },
  })

  const dev2 = await prisma.user.upsert({
    where: { username: 'dev2' },
    update: {},
    create: {
      username: 'dev2',
      name: 'Desarrollador Dos',
      email: 'dev2@sisa.com.ar',
      password,
      role: 'DEV',
      technologies: ['SISA', 'WEB'],
    },
  })

  console.log('Seed completed:', { sag, dev1, dev2 })
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
